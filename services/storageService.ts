import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export class StorageService {
  static async uploadSignature(
    signatureData: string, 
    patientId: string, 
    fileName?: string
  ): Promise<string | null> {
    try {
      // Convert base64 to buffer (server-side)
      const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const finalFileName = fileName || `signature_${patientId}_${timestamp}.png`;
      
      // Upload to Supabase storage using admin client to bypass RLS
      const { data, error } = await supabaseAdmin.storage
        .from('signatures')
        .upload(`${patientId}/${finalFileName}`, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.error('Error uploading signature:', error);
        throw error;
      }

      // Get public URL using regular client (public access)
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(`${patientId}/${finalFileName}`);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadSignature:', error);
      return null;
    }
  }

  static async deleteSignature(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('signatures')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting signature:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSignature:', error);
      return false;
    }
  }

  static async getSignatureUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error getting signature URL:', error);
      return null;
    }
  }
}
