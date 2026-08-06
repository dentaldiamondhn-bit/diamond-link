import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient();

// GET /api/workflows/[id] - Get specific workflow
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
      .from('workflows')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow: data });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[id] - Update workflow
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
    
    // Check ownership
    const { data: currentWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('created_by')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!currentWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (currentWorkflow.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('workflows')
      .update({
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        trigger: body.trigger !== undefined ? body.trigger : undefined,
        trigger_config: body.trigger_config !== undefined ? body.trigger_config : undefined,
        steps: body.steps !== undefined ? body.steps : undefined,
        is_active: body.is_active !== undefined ? body.is_active : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ workflow: data });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete workflow
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
    const { data: currentWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('created_by')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!currentWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (currentWorkflow.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
