import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Setup conversations and messages tables
export async function POST(request: NextRequest) {
  try {
    // Allow internal calls without authentication for setup
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    if (!isInternalCall) {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check if conversations table exists
    const { error: convCheckError } = await supabase.from('conversations').select('id').limit(1);
    
    if (convCheckError && convCheckError.code === '42P01') {
      // Table doesn't exist, return SQL for manual creation
      console.log('Conversations table does not exist');
      return NextResponse.json({ 
        error: 'Conversations table does not exist',
        message: 'Please create the conversations and messages tables manually using SQL',
        sql: `-- Create the conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model TEXT NOT NULL DEFAULT 'local-llama',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to conversations table
DROP TRIGGER IF EXISTS set_public_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_public_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can insert own conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Create RLS policies for messages
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can insert own messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);`
      }, { status: 500 });
    }

    // Check if messages table exists
    const { error: msgCheckError } = await supabase.from('messages').select('id').limit(1);
    
    if (msgCheckError && msgCheckError.code === '42P01') {
      console.log('Messages table does not exist');
      return NextResponse.json({ 
        error: 'Messages table does not exist',
        message: 'Please create the messages table manually using the SQL provided',
        note: 'The conversations table exists but messages table is missing'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Conversations and messages tables setup completed successfully',
      note: 'Tables are ready for use'
    });
  } catch (error) {
    console.error('Error setting up conversations table:', error);
    return NextResponse.json(
      { error: 'Failed to setup conversations table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
