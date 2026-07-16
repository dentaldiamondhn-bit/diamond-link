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
      try {
        const { userId: authUserId } = await auth();
        userId = authUserId;
      } catch (authError) {
        console.warn('Auth error in skills route:', authError);
        return NextResponse.json({ skills: [] });
      }
      
      if (!userId) {
        return NextResponse.json({ skills: [] });
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const agencyType = searchParams.get('agency_type');

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

    if (agencyType) {
      query = query.eq('agency_type', agencyType);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Skills table query failed:', error.message);
      return NextResponse.json({ skills: [] });
    }

    return NextResponse.json({ skills: data || [] });
  } catch (error: any) {
    console.warn('Skills route error:', error?.message);
    return NextResponse.json({ skills: [] });
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
        agency_type: body.agency_type || null,
        metadata: body.metadata || null,
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
