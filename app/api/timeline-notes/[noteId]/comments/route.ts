import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/backend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

async function getUserFromRequest(req: NextRequest): Promise<{ id: string | null; name: string | null; imageUrl: string | null }> {
  try {
    const cookies = req.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/__session=([^;]+)/);
    if (!sessionMatch) return { id: null, name: null, imageUrl: null };
    const token = decodeURIComponent(sessionMatch[1]);
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString());
    let imageUrl = payload.picture || null;
    let name = payload.name || payload.first_name || payload.email || null;
    if (payload.sub) {
      try {
        const clerk = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        const user = await clerk.users.getUser(payload.sub);
        imageUrl = imageUrl || user?.imageUrl || null;
        name = name || user?.firstName || user?.lastName || user?.primaryEmailAddress?.emailAddress || null;
      } catch (err) {
        console.error('Error fetching user from Clerk:', err);
      }
    }
    return {
      id: payload.sub || null,
      name: name,
      imageUrl: imageUrl,
    };
  } catch {
    return { id: null, name: null, imageUrl: null };
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  try {
    const { data, error } = await supabase
      .from('timeline_note_comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching comments:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const commentsWithUserData = await Promise.all((data || []).map(async (comment) => {
      if (comment.user_id && (!comment.user_name || !comment.user_image)) {
        try {
          const user = await clerk.users.getUser(comment.user_id);
          const userName = user?.firstName || user?.lastName || user?.primaryEmailAddress?.emailAddress || null;
          const userRole = user?.publicMetadata?.role as string || null;
          return {
            ...comment,
            user_name: comment.user_name || userName,
            user_image: comment.user_image || user?.imageUrl || null,
            user_role: comment.user_role || userRole || null,
          };
        } catch (err) {
          console.error('Error fetching user data from Clerk:', err);
          return comment;
        }
      }
      return comment;
    }));

    return NextResponse.json({ comments: commentsWithUserData });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;

  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);

    const messageContent = typeof message === 'string'
      ? { blocks: [{ type: 'text', text: message, formats: {} }] }
      : message;

    let userImage = user.imageUrl;
    let userRole = null;
    if (user.id) {
      try {
        const clerk = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        const clerkUser = await clerk.users.getUser(user.id);
        userImage = userImage || clerkUser?.imageUrl || null;
        userRole = clerkUser?.publicMetadata?.role as string || null;
      } catch (err) {
        console.error('Error fetching user data from Clerk:', err);
      }
    }

    const { data, error } = await supabase
      .from('timeline_note_comments')
      .insert({
        note_id: noteId,
        user_id: user.id,
        user_name: user.name,
        user_image: userImage,
        user_role: userRole,
        message: messageContent,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating comment:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
