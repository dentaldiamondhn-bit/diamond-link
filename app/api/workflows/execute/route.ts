import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/workflows/execute - Execute a workflow
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { workflowId, triggerData } = body;
    
    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError) throw workflowError;

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (!workflow.is_active) {
      return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 });
    }

    // Create workflow execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert([{
        workflow_id: workflowId,
        status: 'running',
        trigger_data: triggerData || {},
        started_at: new Date().toISOString(),
        created_by: userId,
      }])
      .select()
      .single();

    if (executionError) throw executionError;

    // Execute workflow steps asynchronously
    executeWorkflowSteps(workflow, execution.id, triggerData, userId);

    return NextResponse.json({ 
      message: 'Workflow execution started',
      execution_id: execution.id,
      workflow_id: workflowId,
      status: 'running'
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}

async function executeWorkflowSteps(workflow: any, executionId: string, triggerData: any, userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const steps = workflow.steps || [];
    const results = [];

    for (const step of steps) {
      try {
        const stepResult = await executeStep(step, triggerData);
        results.push({ step: step.name, status: 'success', result: stepResult });
      } catch (error) {
        results.push({ 
          step: step.name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Update execution as failed
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            results,
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionId);
        
        return;
      }
    }

    // Update execution as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

  } catch (error) {
    console.error('Error executing workflow steps:', error);
    
    // Update execution as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);
  }
}

async function executeStep(step: any, triggerData: any): Promise<any> {
  // This is a simplified execution engine
  // In a real implementation, you would have specific step handlers
  
  switch (step.type) {
    case 'webhook':
      // Trigger a webhook
      const webhookResponse = await fetch(step.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...triggerData, step_data: step.config.data }),
      });
      return await webhookResponse.json();
    
    case 'api_call':
      // Make an API call
      const apiResponse = await fetch(step.config.url, {
        method: step.config.method || 'GET',
        headers: step.config.headers || {},
        body: step.config.body ? JSON.stringify(step.config.body) : undefined,
      });
      return await apiResponse.json();
    
    case 'delay':
      // Add a delay
      await new Promise(resolve => setTimeout(resolve, step.config.duration || 1000));
      return { message: 'Delay completed' };
    
    case 'custom_tool':
      // Execute a custom tool
      const toolResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/odysseus-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-call': 'true' },
        body: JSON.stringify({ 
          tool: step.config.tool, 
          params: { ...step.config.params, ...triggerData } 
        }),
      });
      return await toolResponse.json();
    
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}
