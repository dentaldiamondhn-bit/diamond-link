import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Setup webhook tables
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create webhooks table
    const createWebhooksTableSQL = `
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        url TEXT NOT NULL,
        event TEXT NOT NULL,
        description TEXT,
        secret TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event);
      CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
      CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON webhooks(created_by);
    `;

    // Create webhook_logs table
    const createWebhookLogsTableSQL = `
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        webhook_id UUID NOT NULL,
        event TEXT NOT NULL,
        status TEXT NOT NULL,
        response_status INTEGER,
        error TEXT,
        delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivered_at ON webhook_logs(delivered_at);
      
      -- Foreign key constraint
      ALTER TABLE webhook_logs 
      ADD CONSTRAINT IF NOT EXISTS fk_webhook_logs_webhook_id 
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE;
    `;

    // Execute the SQL
    const { error: webhooksError } = await supabase.rpc('exec', { sql: createWebhooksTableSQL });
    if (webhooksError) {
      console.log('webhooks table creation failed:', webhooksError);
    }

    const { error: logsError } = await supabase.rpc('exec', { sql: createWebhookLogsTableSQL });
    if (logsError) {
      console.log('webhook_logs table creation failed:', logsError);
    }

    return NextResponse.json({ 
      message: 'Webhook tables setup completed',
      note: 'If table creation failed, please create tables manually using the SQL in the code'
    });
  } catch (error) {
    console.error('Error setting up webhook tables:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhook tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
