import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '../../../services/storageService';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const ticketId = formData.get('ticketId') as string;
    const files = formData.getAll('files') as File[];

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Upload files to ticket-documents bucket
    const uploadedUrls = await StorageService.uploadTicketDocuments(files, ticketId);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedUrls.length} file(s)`,
      uploadedUrls: uploadedUrls
    });

  } catch (error) {
    console.error('Ticket document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
