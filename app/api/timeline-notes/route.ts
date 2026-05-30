import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        const client = await clerkClient();
        const user = await client.users.getUser(payload.sub);
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

export async function GET(request: NextRequest) {
  const pacienteId = request.nextUrl.searchParams.get('paciente_id');

  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('timeline_notes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('note_date', { ascending: false });

    if (error) {
      console.error('Supabase error fetching timeline notes:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }

    // Enrich notes with user data from Clerk
    const enrichedNotes = await Promise.all((data || []).map(async (note) => {
      if (note.user_id && (!note.created_by_name || !note.created_by_image)) {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(note.user_id);
          const userName = user?.firstName || user?.lastName || user?.primaryEmailAddress?.emailAddress || null;
          return {
            ...note,
            created_by_name: note.created_by_name || userName,
            created_by_image: note.created_by_image || user?.imageUrl || null,
          };
        } catch (err) {
          console.error('Error fetching user from Clerk:', err);
          return note;
        }
      }
      return note;
    }));

    return NextResponse.json({ notes: enrichedNotes });
  } catch (error: any) {
    console.error('Error fetching timeline notes:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paciente_id, title, content, note_date } = body;

    if (!paciente_id || !title) {
      return NextResponse.json({ error: 'paciente_id and title are required' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);

    let userName = user.name;
    let userImage = user.imageUrl;
    if (user.id && (!userName || !userImage)) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(user.id);
        userName = userName || clerkUser?.firstName || clerkUser?.lastName || clerkUser?.primaryEmailAddress?.emailAddress || null;
        userImage = userImage || clerkUser?.imageUrl || null;
      } catch (err) {
        console.error('Error fetching user from Clerk:', err);
      }
    }

    const { data, error } = await supabase
      .from('timeline_notes')
      .insert({
        paciente_id,
        title,
        content: content || null,
        note_date: note_date || new Date().toISOString().split('T')[0],
        user_id: user.id,
        created_by_name: userName,
        created_by_image: userImage,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating timeline note:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating timeline note:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, note_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);

    let userName = user.name;
    let userImage = user.imageUrl;
    if (user.id) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(user.id);
        userName = userName || clerkUser?.firstName || clerkUser?.lastName || clerkUser?.primaryEmailAddress?.emailAddress || null;
        userImage = userImage || clerkUser?.imageUrl || null;
      } catch (err) {
        console.error('Error fetching user from Clerk:', err);
      }
    }

    const { data, error } = await supabase
      .from('timeline_notes')
      .update({
        title: title || undefined,
        content: content !== undefined ? content : undefined,
        note_date: note_date || undefined,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_name: userName,
        updated_by_image: userImage,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating timeline note:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error: any) {
    console.error('Error updating timeline note:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('timeline_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting timeline note:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting timeline note:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
