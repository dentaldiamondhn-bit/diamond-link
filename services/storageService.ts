import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export class StorageService {
  static async uploadSignature(
    signatureData: string, 
    patientId: string, 
    fileName?: string
  ): Promise<string | null> {
    try {
      console.log('StorageService.uploadSignature called with:', {
        signatureDataType: typeof signatureData,
        signatureDataLength: signatureData?.length,
        signatureDataStart: signatureData?.substring(0, 50)
      });
      
      // Convert base64 to buffer (server-side)
      let base64Data: string;
      let mimeType: string = 'image/png';
      
      // Handle different base64 formats
      if (signatureData.startsWith('data:image/png;base64,')) {
        base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
        mimeType = 'image/png';
        console.log('Detected PNG format');
      } else if (signatureData.startsWith('data:image/jpeg;base64,')) {
        base64Data = signatureData.replace(/^data:image\/jpeg;base64,/, '');
        mimeType = 'image/jpeg';
        console.log('Detected JPEG format');
      } else if (signatureData.startsWith('data:image/jpg;base64,')) {
        base64Data = signatureData.replace(/^data:image\/jpg;base64,/, '');
        mimeType = 'image/jpeg';
        console.log('Detected JPG format');
      } else {
        // Default to PNG if no data URL format
        base64Data = signatureData;
        mimeType = 'image/png';
        console.log('Using default PNG format - no data URL prefix detected');
      }
      
      // Try different buffer creation methods
      let buffer: Buffer;
      try {
        // Method 1: Standard Buffer.from
        buffer = Buffer.from(base64Data, 'base64');
        console.log('Buffer created with standard method, length:', buffer.length);
      } catch (error) {
        console.log('Standard buffer method failed, trying alternative:', error);
        // Method 2: Alternative buffer creation
        buffer = Buffer.from(base64Data, 'base64url');
        console.log('Buffer created with base64url method, length:', buffer.length);
      }
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const fileExtension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const finalFileName = fileName || `signature_${patientId}_${timestamp}.${fileExtension}`;
      
      console.log('Uploading signature with:', {
        patientId,
        fileName: finalFileName,
        mimeType,
        bufferLength: buffer.length,
        base64DataLength: base64Data.length
      });
      
      // Upload to Supabase storage using admin client to bypass RLS
      // Convert buffer to Uint8Array to ensure proper MIME type handling
      const uint8Array = new Uint8Array(buffer);
      
      console.log('=== SIGNATURE UPLOAD DEBUG ===');
      console.log('Uploading signature with:', {
        patientId,
        fileName: finalFileName,
        mimeType,
        bufferLength: buffer.length,
        uint8ArrayLength: uint8Array.length
      });
      
      console.log('Upload parameters:', {
        bucket: 'signatures',
        path: `${patientId}/${finalFileName}`,
        contentType: mimeType,
        upsert: true
      });
      
      const { data, error } = await supabaseAdmin.storage
        .from('signatures')
        .upload(`${patientId}/${finalFileName}`, uint8Array, {
          contentType: mimeType,
          upsert: true
        });
      
      console.log('Upload result:', { data, error });

      if (error) {
        console.error('Error uploading signature:', error);
        throw error;
      }

      // Get public URL using regular client (public access)
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(`${patientId}/${finalFileName}`);
      
      console.log('Generated signature URL:', publicUrl);
      console.log('Expected URL pattern:', `https://hmtkayufelqyfytpmdtl.supabase.co/storage/v1/object/signatures/${patientId}/${finalFileName}`);
      
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

  static async uploadDocuments(
    files: File[], 
    patientId: string
  ): Promise<string[]> {
    try {
      console.log('=== DOCUMENT UPLOAD DEBUG ===');
      console.log('Files to upload:', files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      })));
      
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        // Generate unique filename
        const timestamp = new Date().getTime();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${patientId}_${timestamp}_${file.name}`;
        
        // Detect MIME type if file.type is generic
        let mimeType = file.type;
        if (file.type === 'application/octet-stream' || !file.type) {
          console.log('File has generic MIME type, detecting from extension...');
          console.log('File extension:', fileExtension);
          console.log('Original file.type:', file.type);
          
          // Detect MIME type based on file extension
          const mimeTypes: { [key: string]: string } = {
            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            
            // Documents
            'pdf': 'application/pdf',
            
            // Microsoft Word
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            
            // Microsoft Excel
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            
            // Microsoft PowerPoint
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            
            // Text files
            'txt': 'text/plain',
            'csv': 'text/csv',
            'rtf': 'application/rtf',
            
            // Archives
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            
            // Other common formats
            'json': 'application/json',
            'xml': 'application/xml'
          };
          
          mimeType = mimeTypes[fileExtension?.toLowerCase()] || 'application/octet-stream';
          
          console.log('Detected MIME type:', mimeType);
        } else {
          console.log('File has specific MIME type:', file.type);
        }
        
        console.log('Processing file:', {
          name: file.name,
          originalType: file.type,
          detectedType: mimeType,
          size: file.size,
          fileName,
          fileExtension
        });
        
        // Upload to Supabase storage using admin client to bypass RLS
        // Use the original file with the corrected MIME type
        try {
          console.log('Uploading file with MIME type:', mimeType);
          
          // Create a Blob with the correct MIME type to force it
          const fileBlob = new Blob([file], { type: mimeType });
          
          const { data, error } = await supabaseAdmin.storage
            .from('patient-documents')
            .upload(`${patientId}/${fileName}`, fileBlob, {
              contentType: mimeType,
              upsert: true
            });
          
          console.log('Upload result:', { data, error });
          
          if (error) {
            console.error('Error uploading document:', error);
            // Continue with next document instead of throwing error
            continue;
          }
          
          // Get public URL using regular client (public access)
          const { data: { publicUrl } } = supabase.storage
            .from('patient-documents')
            .getPublicUrl(`${patientId}/${fileName}`);

          uploadedUrls.push(publicUrl);
          console.log('Successfully uploaded document:', publicUrl);
        } catch (uploadError) {
          console.error('Unexpected error during upload:', uploadError);
          // Continue with next document instead of throwing error
          continue;
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error in uploadDocuments:', error);
      throw error;
    }
  }

  static async deleteDocument(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.storage
        .from('patient-documents')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting document:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      return false;
    }
  }

  static async getDocumentUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = supabase.storage
        .from('patient-documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  }
}
