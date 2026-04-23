import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'Missing file or conversation ID' }, { status: 400 });
    }

    // Use Clerk ID directly as user ID
    const dbUserId = userId;

    // Check if user is participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', dbUserId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `chat/${conversationId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      uploadedUrl: urlData.publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Error in chat file upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
