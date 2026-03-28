import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const treatmentId = formData.get('treatmentId') as string;
    const type = formData.get('type') as 'paciente' | 'doctor';

    if (!file || !treatmentId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, treatmentId, type' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const fileName = `tratamiento_${treatmentId}_${type}_${Date.now()}.png`;
    const filePath = `tratamientos-firmas/${fileName}`;

    console.log('Uploading treatment signature:', {
      fileName,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      bucket: 'tratamientos_firmas'
    });

    const { data, error } = await supabaseAdmin.storage
      .from('tratamientos_firmas')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Error uploading treatment signature:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Treatment signature upload successful:', data);

    // Get public URL using regular client
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('tratamientos_firmas')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      publicUrl,
      fileName,
      data 
    });

  } catch (error) {
    console.error('Treatment signature upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    console.log('Deleting treatment signature:', { filePath });

    const { error } = await supabaseAdmin.storage
      .from('tratamientos_firmas')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting treatment signature:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Treatment signature deletion successful');

    return NextResponse.json({ 
      success: true,
      message: 'Signature deleted successfully'
    });

  } catch (error) {
    console.error('Treatment signature delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
