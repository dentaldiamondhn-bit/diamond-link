import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/skills/[id] - Get specific skill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    return NextResponse.json({ skill: data });
  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

// PUT /api/skills/[id] - Update skill
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Get current skill to check ownership and version
    const { data: currentSkill, error: fetchError } = await supabase
      .from('skills')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!currentSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (currentSkill.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Increment version
    const newVersion = (currentSkill.version || 1) + 1;

    const { data, error } = await supabase
      .from('skills')
      .update({
        name: body.name || currentSkill.name,
        description: body.description !== undefined ? body.description : currentSkill.description,
        prompt: body.prompt || currentSkill.prompt,
        category: body.category || currentSkill.category,
        tags: body.tags !== undefined ? body.tags : currentSkill.tags,
        is_public: body.is_public !== undefined ? body.is_public : currentSkill.is_public,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ skill: data });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/skills/[id] - Delete skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: currentSkill, error: fetchError } = await supabase
      .from('skills')
      .select('created_by')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!currentSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (currentSkill.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
