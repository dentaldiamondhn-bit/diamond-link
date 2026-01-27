import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const { patientId, filePath, documentIndex, documents } = await request.json();

    console.log('Delete request received:', { patientId, filePath, documentIndex });

    if (!patientId || !filePath || documentIndex === undefined || !documents) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not available' },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // First, try to delete from storage
    console.log('Attempting to delete from storage:', filePath);
    console.log('Storage bucket: patient-documents');
    console.log('Admin client created:', !!adminClient);
    
    const { error: storageError, data: storageData } = await adminClient.storage
      .from('patient-documents')
      .remove([filePath]);

    console.log('Storage delete result:', { 
      error: storageError, 
      data: storageData,
      filePath: filePath,
      bucket: 'patient-documents'
    });

    if (storageError) {
      console.error('Storage error details:', storageError);
      console.error('Storage error message:', storageError.message);
      // Don't return error yet, continue with database update
      console.log('Storage delete failed, but continuing with database update');
    } else {
      console.log('Storage delete successful');
      console.log('Storage data returned:', storageData);
      
      // Extract filename from filePath for verification
      const fileName = filePath.split('/').pop();
      
      // Verify file was actually deleted
      const { data: verifyData } = await adminClient.storage
        .from('patient-documents')
        .list(patientId);
      
      const fileStillExists = verifyData?.some(file => file.name === fileName);
      console.log('File verification after deletion:', { fileName, stillExists: fileStillExists });
      
      if (fileStillExists) {
        console.error('WARNING: File still exists after deletion attempt!');
      }
    }

    // Always update database to remove the document URL
    const updatedDocuments = documents.filter((_: any, i: number) => i !== documentIndex);
    console.log('Updating database with documents:', updatedDocuments);
    
    const { error: dbError, data: dbData } = await adminClient
      .from('patients')
      .update({ documentos: updatedDocuments })
      .eq('paciente_id', patientId)
      .select();

    console.log('Database update result:', { error: dbError, data: dbData });

    if (dbError) {
      console.error('Database error details:', dbError);
      return NextResponse.json(
        { error: 'Error updating database: ' + dbError.message },
        { status: 500 }
      );
    }

    // Return success even if storage delete failed, but note it
    return NextResponse.json({
      success: true, 
      message: 'Document deleted successfully',
      storageDeleteSuccess: !storageError,
      storageError: storageError?.message || null
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
