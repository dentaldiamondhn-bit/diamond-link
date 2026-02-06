'use client';

import React, { useState } from 'react';
import DocumentPreviewModal from './DocumentPreviewModal';

interface DocumentDisplayProps {
  documents: string[];
  onRemove?: (index: number) => void;
  removable?: boolean;
  patientId?: string;
}

export function DocumentDisplay({ documents, onRemove, removable = false, patientId }: DocumentDisplayProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="text-gray-400 text-4xl mb-2">📁</div>
        <div className="text-gray-500 text-sm">
          No hay documentos adjuntos
        </div>
      </div>
    );
  }

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    
    // Remove patient ID and timestamp prefix for cleaner display
    // Format: patientId_timestamp_filename.ext or patientId_timestamp_filename%20(1).ext
    
    let cleanFileName = fileName;
    
    // Remove patient ID (UUID pattern: 8-4-4-4-12 hex digits)
    cleanFileName = cleanFileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
    
    // Remove timestamp (digits at start after underscore)
    cleanFileName = cleanFileName.replace(/^[0-9]+_/, '');
    
    // URL decode to handle %20 and other encoded characters
    try {
      cleanFileName = decodeURIComponent(cleanFileName);
    } catch (e) {
      // If decoding fails, use original
      console.warn('Failed to decode filename:', cleanFileName);
    }
    
    // If filename is too long, truncate it intelligently
    if (cleanFileName.length > 30) {
      const nameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.'));
      const extension = cleanFileName.substring(cleanFileName.lastIndexOf('.'));
      
      // Truncate the name part but keep extension
      const truncatedName = nameWithoutExt.substring(0, 25) + '...' + extension;
      return truncatedName;
    }
    
    return cleanFileName;
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'PDF';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '')) return 'Imagen';
    if (['doc', 'docx'].includes(extension || '')) return 'Word';
    if (['xls', 'xlsx', 'csv'].includes(extension || '')) return 'Excel';
    if (['ppt', 'pptx'].includes(extension || '')) return 'PowerPoint';
    if (['txt', 'rtf'].includes(extension || '')) return 'Texto';
    if (['zip', 'rar', '7z'].includes(extension || '')) return 'Comprimido';
    return 'Archivo';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF': return '📄';
      case 'Imagen': return '🖼️';
      case 'Word': return '📝';
      case 'Excel': return '📊';
      case 'PowerPoint': return '📽️';
      case 'Texto': return '📃';
      case 'Comprimido': return '🗜️';
      default: return '📎';
    }
  };

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'PDF': return 'bg-red-100 text-red-600 border-red-200';
      case 'Imagen': return 'bg-green-100 text-green-600 border-green-200';
      case 'Word': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Excel': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'PowerPoint': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Texto': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Comprimido': return 'bg-purple-100 text-purple-600 border-purple-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const isImageFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '');
  };

  const handleImageLoad = (index: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageLoadStart = (index: number) => {
    setLoadingImages(prev => new Set(prev).add(index));
  };

  const deleteDocument = async (index: number) => {
    // If onRemove callback is provided, use it instead of direct deletion
    if (onRemove) {
      onRemove(index);
      return;
    }

    const docUrl = documents[index];
    console.log('Original document URL:', docUrl);
    
    const urlParts = docUrl.split('/');
    console.log('URL parts:', urlParts);
    
    const fileName = urlParts[urlParts.length - 1];
    // Decode URL-encoded filename (handles %20 for spaces, etc.)
    const decodedFileName = decodeURIComponent(fileName);
    console.log('Extracted filename:', fileName);
    console.log('Decoded filename:', decodedFileName);
    
    const filePath = `${patientId}/${decodedFileName}`;
    console.log('Constructed file path for deletion:', filePath);
    console.log('Patient ID:', patientId);

    setDeletingIndex(index);

    try {
      console.log('Deleting document:', { patientId, filePath, documentIndex: index });

      // Call server-side API
      const response = await fetch('/api/delete-document', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          filePath,
          documentIndex: index,
          documents
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error:', result);
        alert('Error al eliminar el documento: ' + result.error);
        return;
      }

      console.log('Delete successful:', result);

      // Update local state
      if (onRemove) {
        onRemove(index);
      }

      // Show detailed success message
      if (result.storageDeleteSuccess) {
        alert('Documento eliminado exitosamente (incluyendo archivo del almacenamiento)');
      } else {
        alert('Documento eliminado de la base de datos. Error al eliminar del almacenamiento: ' + result.storageError);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error al eliminar el documento: ' + error.message);
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((docUrl, index) => {
        const fileName = getFileName(docUrl);
        const fileType = getFileType(fileName);
        const isImage = isImageFile(fileName);
        const hasImageError = imageErrors.has(index);
        const isLoading = loadingImages.has(index);
        
        // Use secure proxy for document URLs
        // const proxiedDocUrl = `/api/document-proxy?url=${encodeURIComponent(docUrl)}`;
        const proxiedDocUrl = docUrl; // Temporarily disable proxy
        
        return (
          <div key={index} className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Thumbnail/Preview Section */}
            <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
              {isImage && !hasImageError ? (
                <div className="relative w-full h-full">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  <img
                    src={proxiedDocUrl}
                    alt={fileName}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoadStart={() => handleImageLoadStart(index)}
                    onLoad={() => handleImageLoad(index)}
                    onError={(error) => handleImageError(index)}
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`text-5xl p-6 rounded-xl border-2 ${getFileColor(fileType)} shadow-sm`}>
                    {getFileIcon(fileType)}
                  </div>
                  {!isImage && (
                    <div className="absolute top-2 left-2">
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                        No preview
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* File Type Badge */}
              <div className="absolute top-2 right-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${getFileColor(fileType)}`}>
                  {fileType}
                </span>
              </div>

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
            </div>

            {/* File Info Section */}
            <div className="p-4">
              <div className="mb-3">
                <div className="font-semibold text-sm text-gray-900 truncate" title={fileName}>
                  {fileName}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {fileType}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver
                </button>
                
                {removable && patientId && (
                  <button
                    type="button"
                    onClick={() => deleteDocument(index)}
                    disabled={deletingIndex === index}
                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium border rounded-md transition-all duration-200 hover:scale-105 ${
                      deletingIndex === index
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {deletingIndex === index ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                        Borrando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Borrar
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Document Preview Modal */}
    {previewIndex !== null && (
      <DocumentPreviewModal
        documents={documents}
        initialIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    )}
    </>
  );
}

export default DocumentDisplay;
