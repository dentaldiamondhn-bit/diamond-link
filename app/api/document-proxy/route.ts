import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentUrl = searchParams.get('url');
    
    if (!documentUrl) {
      return NextResponse.json(
        { error: 'Document URL is required' },
        { status: 400 }
      );
    }

    // Create admin Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Extract file path from the URL
    const urlParts = documentUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const decodedFileName = decodeURIComponent(fileName);
    
    // Extract patient ID from the URL
    const patientId = urlParts[urlParts.length - 2];
    
    if (!patientId || !decodedFileName) {
      return NextResponse.json(
        { error: 'Invalid document URL format' },
        { status: 400 }
      );
    }

    const filePath = `${patientId}/${decodedFileName}`;
    
    console.log('🔍 Document proxy request:', { documentUrl, filePath, patientId, fileName: decodedFileName });

    // Get the file from Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('patient-documents')
      .download(filePath);

    if (error) {
      console.error('Storage download error:', error);
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get file extension for content type
    const extension = decodedFileName.split('.').pop()?.toLowerCase();
    const contentTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    const contentType = contentTypes[extension || ''] || 'application/octet-stream';

    // Return the file with proper headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${decodedFileName}"`,
      },
    });

  } catch (error) {
    console.error('Document proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
