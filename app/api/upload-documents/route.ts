import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '../../../services/storageService';
import { PatientService } from '../../../services/patientService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const patientId = formData.get('patientId') as string;
    const files = formData.getAll('files') as File[];

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Get existing documents to check for duplicates
    const existingDocuments = await PatientService.getPatientById(patientId);
    const existingUrls = existingDocuments.documentos || [];

    // Check for duplicates by file hash
    const nonDuplicateFiles: File[] = [];
    const duplicateFiles: string[] = [];

    for (const file of files) {
      const fileHash = await getFileHash(file);
      const isDuplicate = await checkFileExists(fileHash, existingUrls);
      
      if (isDuplicate) {
        duplicateFiles.push(file.name);
      } else {
        nonDuplicateFiles.push(file);
      }
    }

    if (nonDuplicateFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All files were duplicates',
        uploadedUrls: [],
        duplicateFiles: duplicateFiles,
        totalDocuments: existingUrls.length
      });
    }

    // Upload non-duplicate files
    const uploadedUrls = await StorageService.uploadDocuments(nonDuplicateFiles, patientId);

    // Combine existing documents with new ones
    const allDocuments = [...existingUrls, ...uploadedUrls];

    // Update patient with combined documents
    await PatientService.updatePatient(patientId, { documentos: allDocuments });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedUrls.length} file(s)`,
      uploadedUrls: uploadedUrls,
      duplicateFiles: duplicateFiles,
      totalDocuments: allDocuments.length,
      allDocuments: allDocuments
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate file hash
async function getFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to check if file already exists (simplified version)
async function checkFileExists(fileHash: string, existingUrls: string[]): Promise<boolean> {
  // For now, check by filename similarity
  // In a production environment, you might want to store file hashes in the database
  return false; // Allow all files for now, can be enhanced later
}
