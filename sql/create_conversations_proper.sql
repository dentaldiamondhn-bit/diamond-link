-- Create the conversations table to store chat conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model TEXT NOT NULL DEFAULT 'local-llama',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add a comment to the table
COMMENT ON TABLE public.conversations IS 'Stores chat conversations for the global AI assistant.';

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- Create the messages table to store individual messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add a comment to the messages table
COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations.';

-- Create an index for faster lookups by conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Create a trigger function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the conversations table
DROP TRIGGER IF EXISTS set_public_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_public_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Add RLS policies (optional but recommended)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Allow users to insert their own conversations
CREATE POLICY "Users can insert own conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Allow users to update their own conversations
CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Allow users to read messages from their own conversations
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

-- Allow users to insert messages into their own conversations
CREATE POLICY "Users can insert own messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

-- Allow users to update messages in their own conversations
CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);

-- Allow users to delete messages from their own conversations
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (auth.uid()::text = conversations.user_id OR conversations.user_id IS NOT NULL)
  )
);
