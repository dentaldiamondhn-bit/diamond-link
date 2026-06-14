import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Setup workflow tables
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create workflows table
    const createWorkflowsTableSQL = `
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger TEXT NOT NULL,
        trigger_config JSONB DEFAULT '{}',
        steps JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger);
      CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
      CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
    `;

    // Create workflow_executions table
    const createWorkflowExecutionsTableSQL = `
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        workflow_id UUID NOT NULL,
        status TEXT NOT NULL,
        trigger_data JSONB DEFAULT '{}',
        results JSONB DEFAULT '[]',
        error TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);
      
      -- Foreign key constraint
      ALTER TABLE workflow_executions 
      ADD CONSTRAINT IF NOT EXISTS fk_workflow_executions_workflow_id 
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;
    `;

    // Execute the SQL
    const { error: workflowsError } = await supabase.rpc('exec', { sql: createWorkflowsTableSQL });
    if (workflowsError) {
      console.log('workflows table creation failed:', workflowsError);
    }

    const { error: executionsError } = await supabase.rpc('exec', { sql: createWorkflowExecutionsTableSQL });
    if (executionsError) {
      console.log('workflow_executions table creation failed:', executionsError);
    }

    return NextResponse.json({ 
      message: 'Workflow tables setup completed',
      note: 'If table creation failed, please create tables manually using the SQL in the code'
    });
  } catch (error) {
    console.error('Error setting up workflow tables:', error);
    return NextResponse.json(
      { error: 'Failed to setup workflow tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
