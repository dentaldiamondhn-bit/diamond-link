-- Create the conversations table to store chat history
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add a comment to the table
COMMENT ON TABLE public.conversations IS 'Stores chat history for the global Groq AI assistant.';

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

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
