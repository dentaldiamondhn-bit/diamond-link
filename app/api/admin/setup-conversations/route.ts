import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create conversations table
    const { error: conversationsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'patient_case')),
            name TEXT,
            participant_ids TEXT[] NOT NULL,
            created_by_clerk_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_message TEXT,
            last_message_time TIMESTAMP WITH TIME ZONE,
            unread_count INTEGER DEFAULT 0,
            paciente_id VARCHAR(255)
        );
      `
    });

    if (conversationsError) {
      console.log('Conversations table might already exist or error:', conversationsError);
    }

    // Create conversation_participants table
    const { error: participantsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_participants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id UUID NOT NULL,
            clerk_user_id VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'member',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (participantsError) {
      console.log('Participants table might already exist or error:', participantsError);
    }

    // Create conversation_messages table
    const { error: messagesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id UUID NOT NULL,
            sender_clerk_id VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            sender_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_deleted BOOLEAN DEFAULT FALSE
        );
      `
    });

    if (messagesError) {
      console.log('Messages table might already exist or error:', messagesError);
    }

    return NextResponse.json({
      message: 'Conversation system setup completed',
      note: 'Tables created if they didn\'t exist. Check console for any errors.',
      tables: ['conversations', 'conversation_participants', 'conversation_messages']
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup conversation system', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
