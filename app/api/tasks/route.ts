import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function getUserAndToken(req: Request) {
  const userId = req.headers.get('x-user-id') || '';
  if (!userId) return { user: null, error: 'Unauthorized' };
  return { user: { id: userId }, error: null };
}

export async function GET(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const supabase = createServiceClient();
    const { data, error: dbError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true });

    if (dbError) throw dbError;
    return new Response(JSON.stringify(data || []), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const body = await req.json();
    const { title, priority, due_date } = body;

    const supabase = createServiceClient();
    const { data, error: dbError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        priority: priority || 'medium',
        due_date,
        completed: false,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const supabase = createServiceClient();
    const { data, error: dbError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (dbError) throw dbError;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const body = await req.json();
    const { id } = body;

    const supabase = createServiceClient();
    const { error: dbError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (dbError) throw dbError;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
