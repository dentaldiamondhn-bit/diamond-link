import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function getCurrentUser(): Promise<{ userId: string; name: string; image: string } | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    if (!process.env.CLERK_SECRET_KEY) return null;
    const user = await clerk.users.getUser(userId);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.emailAddresses[0]?.emailAddress || 'Usuario';
    const image = user.profileImageUrl || user.imageUrl || '';
    return { userId, name, image };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pacienteId = searchParams.get('paciente_id');

    if (!pacienteId) {
      return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('whatsapp_message_history')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching whatsapp message history:', error);
      return NextResponse.json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paciente_id, message_text, follow_up_status_id } = body;

    if (!paciente_id || !message_text) {
      return NextResponse.json({ error: 'paciente_id and message_text are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('whatsapp_message_history')
      .insert({
        paciente_id,
        message_text,
        follow_up_status_id: follow_up_status_id || null,
        sent_by: user.userId,
        sent_by_name: user.name,
        sent_by_image: user.image,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving whatsapp message history:', error);
      return NextResponse.json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
