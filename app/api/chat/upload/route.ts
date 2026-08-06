import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'Missing file or conversation ID' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if user is participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const BUCKET = 'chat-uploads';

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET);
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
      });
      if (createErr) {
        return NextResponse.json({ error: `Failed to create bucket: ${createErr.message}` }, { status: 500 });
      }
    }

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `chat/${conversationId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      uploadedUrl: urlData.publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
  } catch (error: any) {
    console.error('Chat upload error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
