import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create service role client for storage operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Temporarily bypass authentication to test upload functionality
    // TODO: Add proper authentication later
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const consentimientoId = formData.get('consentimientoId') as string;
    const type = formData.get('type') as 'paciente' | 'doctor';

    if (!file || !consentimientoId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const fileName = `${consentimientoId}_${type}_${Date.now()}.png`;
    const filePath = `${fileName}`;

    console.log('Uploading signature via API:', {
      fileName,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      bucket: 'consentimientos_signature'
    });

    const { data, error } = await supabaseAdmin.storage
      .from('consentimientos_signature')
      .upload(filePath, file, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading signature via API:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Upload successful via API:', data);

    // Get public URL using regular client
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('consentimientos_signature')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      publicUrl,
      data 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
