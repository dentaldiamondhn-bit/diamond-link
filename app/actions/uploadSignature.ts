'use server';

import { createClient } from '@supabase/supabase-js';

// Create service role client for storage operations
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

export async function uploadSignatureAction(
  fileData: string, // base64 string
  fileName: string,
  consentimientoId: string,
  type: 'paciente' | 'doctor'
): Promise<string> {
  try {
    const actualFileName = `${consentimientoId}_${type}_${Date.now()}.png`;
    const filePath = `${actualFileName}`;

    console.log('Uploading signature via server action:', {
      fileName: actualFileName,
      filePath,
      originalFileName: fileName,
      consentimientoId,
      type
    });

    // Convert base64 to buffer
    const base64Data = fileData.split(',')[1]; // Remove data:image/png;base64, prefix
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a Blob-like object for Supabase (using Uint8Array)
    const file = new Blob([buffer], { type: 'image/png' });

    const { data, error } = await supabaseAdmin.storage
      .from('consentimientos_signature')
      .upload(filePath, file, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading signature via server action:', error);
      throw new Error(error.message);
    }

    console.log('Upload successful via server action:', data);

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('consentimientos_signature')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Server action error:', error);
    throw error;
  }
}
