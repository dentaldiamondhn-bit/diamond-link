import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { data, error } = await supabase
      .storage
      .from('inventario-imagenes')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('inventario-imagenes')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario/upload-image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
