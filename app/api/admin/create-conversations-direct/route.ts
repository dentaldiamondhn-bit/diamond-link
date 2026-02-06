import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create conversations table with raw SQL
    const { error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);

    if (conversationsError && conversationsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Creating conversations table...');
      
      const { error: createError } = await supabase.rpc('sql', {
        query: `
          CREATE TABLE conversations (
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

      if (createError) {
        console.error('Failed to create conversations table:', createError);
      } else {
        console.log('Conversations table created successfully');
      }
    }

    // Create conversation_participants table
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .select('id')
      .limit(1);

    if (participantsError && participantsError.code === 'PGRST116') {
      console.log('Creating conversation_participants table...');
      
      const { error: createParticipantsError } = await supabase.rpc('sql', {
        query: `
          CREATE TABLE conversation_participants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id UUID NOT NULL,
            clerk_user_id VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'member',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

      if (createParticipantsError) {
        console.error('Failed to create conversation_participants table:', createParticipantsError);
      } else {
        console.log('Conversation_participants table created successfully');
      }
    }

    // Create conversation_messages table
    const { error: messagesError } = await supabase
      .from('conversation_messages')
      .select('id')
      .limit(1);

    if (messagesError && messagesError.code === 'PGRST116') {
      console.log('Creating conversation_messages table...');
      
      const { error: createMessagesError } = await supabase.rpc('sql', {
        query: `
          CREATE TABLE conversation_messages (
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

      if (createMessagesError) {
        console.error('Failed to create conversation_messages table:', createMessagesError);
      } else {
        console.log('Conversation_messages table created successfully');
      }
    }

    // Test if tables exist now
    const { data: testData, error: testError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);

    return NextResponse.json({
      message: 'Conversation table creation completed',
      tablesExist: !testError,
      error: testError?.message,
      note: 'Check console for detailed creation logs'
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
