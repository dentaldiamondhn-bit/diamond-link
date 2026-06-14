import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/skills - Get all skills or search skills
export async function GET(request: NextRequest) {
  try {
    // Allow internal calls without authentication
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    let userId;
    if (!isInternalCall) {
      const { userId: authUserId } = await auth();
      userId = authUserId;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    console.log('Fetching skills for user:', userId);

    let query = supabase
      .from('skills')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Successfully fetched skills:', data?.length || 0);

    return NextResponse.json({ skills: data || [] });
  } catch (error) {
    console.error('Error fetching skills:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch skills', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/skills - Create new skill
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.prompt || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, prompt, and category are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('skills')
      .insert([{
        name: body.name,
        description: body.description || '',
        prompt: body.prompt,
        category: body.category,
        tags: body.tags || [],
        is_public: body.is_public || false,
        created_by: userId,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ skill: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
