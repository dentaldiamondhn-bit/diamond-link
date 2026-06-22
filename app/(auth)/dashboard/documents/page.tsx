'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { PatientService } from '@/services/patientService';
import { OrthodonticHistoryService as OrthodonticHistoryServiceClient } from '@/services/orthodonticHistoryService';
import { dentalStudyService } from '@/services/dentalStudyService';
import { DentalStudy } from '@/types/dental';
import { Patient } from '@/types/patient';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { supabase } from '@/lib/supabase';
import HistoricalBadge from '@/components/HistoricalBadge';
import HistoricalBanner from '@/components/HistoricalBanner';
import Link from 'next/link';
import AnimatedFolder from '@/components/AnimatedFolder';
import AnimatedVer from '@/components/AnimatedVer';
import DocumentDisplay from '@/components/DocumentDisplay';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import LoadingAnimation from '@/components/LoadingAnimation';

interface DocumentItem {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  source: 'patient' | 'orthodontic' | 'signature' | 'dental-study';
  uploadDate?: string;
  patientName?: string;
  studyId?: string;
  studyDate?: string;
}

function DocumentsPageContent() {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bypassHistoricalMode, setCurrentPatient, loadPatientSettings } = useHistoricalMode();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [orthodonticData, setOrthodonticData] = useState<any>(null);
  const [orthodonticLoading, setOrthodonticLoading] = useState(true);
  const [dentalStudies, setDentalStudies] = useState<DentalStudy[]>([]);
  const [dentalStudiesLoading, setDentalStudiesLoading] = useState(true);
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'patient' | 'orthodontic' | 'signature' | 'dental-study'>('all');

  // Get and validate patient ID
  const pacienteId = searchParams.get('id');
  const validPacienteId = pacienteId && pacienteId !== 'null' && pacienteId !== 'undefined' ? pacienteId : '';

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!validPacienteId || validPacienteId === 'null' || validPacienteId === 'undefined') {
          setError('ID de paciente no proporcionado');
          setLoading(false);
          return;
        }

        setLoading(true);

        // Load patient data
        const patientData = await PatientService.getPatientById(validPacienteId);
        if (patientData) {
          setPatient(patientData);
          setCurrentPatient(validPacienteId);
          
          // Check record category (historical, active, archived)
          const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio);
          setRecordCategoryInfo(categoryInfo);
          
          // Load patient-specific historical mode settings
          await loadPatientSettings(validPacienteId);
        }

        // Load orthodontic data
        try {
          const orthodonticHistory = await OrthodonticHistoryServiceClient.getOrthodonticHistory(validPacienteId);
          setOrthodonticData(orthodonticHistory);
        } catch (orthodonticError) {
          console.log('No orthodontic history found for patient');
          setOrthodonticData(null);
        }

        // Load dental studies
        try {
          const studies = await dentalStudyService.getPatientStudies(validPacienteId);
          setDentalStudies(studies);
        } catch (dentalError) {
          console.log('No dental studies found for patient');
          setDentalStudies([]);
        }

        setPatientLoading(false);
        setOrthodonticLoading(false);
        setDentalStudiesLoading(false);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('Error al cargar los datos del paciente');
        setPatientLoading(false);
        setOrthodonticLoading(false);
      }
    };

    loadData();
  }, [validPacienteId]);

  useEffect(() => {
    // Process all documents when patient and orthodontic data are loaded
    if (!patientLoading && !orthodonticLoading) {
      const documents: DocumentItem[] = [];

      // Patient documents
      if (patient?.documentos && patient.documentos.length > 0) {
        patient.documentos.forEach((docUrl, index) => {
          documents.push({
            id: `patient_${index}`,
            url: docUrl,
            fileName: getFileName(docUrl),
            fileType: getFileType(docUrl),
            source: 'patient',
            patientName: patient.nombre_completo
          });
        });
      }

      // Orthodontic documents
      if (orthodonticData?.documentos_ortodoncia && orthodonticData.documentos_ortodoncia.length > 0) {
        orthodonticData.documentos_ortodoncia.forEach((docUrl: string, index: number) => {
          documents.push({
            id: `orthodontic_${index}`,
            url: docUrl,
            fileName: getFileName(docUrl),
            fileType: getFileType(docUrl),
            source: 'orthodontic',
            patientName: patient.nombre_completo
          });
        });
      }

      // Patient signature
      if (patient?.firma_digital) {
        documents.push({
          id: 'patient_signature',
          url: patient.firma_digital,
          fileName: `Firma Digital - ${patient.nombre_completo}`,
          fileType: 'Imagen',
          source: 'signature',
          patientName: patient.nombre_completo
        });
      }

      // Orthodontic signature
      if (orthodonticData?.firma_digital_ortodoncia) {
        documents.push({
          id: 'orthodontic_signature',
          url: orthodonticData.firma_digital_ortodoncia,
          fileName: `Firma Ortodóncica - ${patient.nombre_completo}`,
          fileType: 'Imagen',
          source: 'signature',
          patientName: patient.nombre_completo
        });
      }

      setAllDocuments(documents);
      setLoading(false);
    }
  }, [patient, orthodonticData, patientLoading, orthodonticLoading]);

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    
    let cleanFileName = fileName;
    
    // Remove patient ID (UUID pattern)
    cleanFileName = cleanFileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
    
    // Remove timestamp
    cleanFileName = cleanFileName.replace(/^[0-9]+_/, '');
    
    // URL decode
    try {
      cleanFileName = decodeURIComponent(cleanFileName);
    } catch (e) {
      console.warn('Failed to decode filename:', cleanFileName);
    }
    
    return cleanFileName;
  };

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
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

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'patient': return 'Paciente';
      case 'orthodontic': return 'Ortodoncia';
      case 'signature': return 'Firma Digital';
      default: return 'Otro';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'patient': return 'bg-blue-100 text-blue-800';
      case 'orthodontic': return 'bg-purple-100 text-purple-800';
      case 'signature': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = allDocuments.filter(doc => {
    if (filter === 'all') return true;
    return doc.source === filter;
  });

  const handlePreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Historical Banner */}
      {recordCategoryInfo?.isHistorical && !bypassHistoricalMode && (
        <HistoricalBanner 
          isHistorical={recordCategoryInfo?.isHistorical}
          isBypassed={bypassHistoricalMode}
          patientId={patient?.id}
          onBypassChange={(bypassed) => {
            // Handle bypass change if needed
            console.log('Bypass changed:', bypassed);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Dashboard
                </Link>
              </li>
              <li className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link
                  href={`/menu-navegacion?id=${validPacienteId}`}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {patient?.nombre_completo || 'Paciente'}
                </Link>
              </li>
              <li className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  Gestión Documental
                </span>
              </li>
            </ol>
          </nav>
          {patient && (
            <div className="mt-2 flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Paciente: {patient.nombre_completo}
              </span>
              {recordCategoryInfo?.isHistorical && (
                <HistoricalBadge />
              )}
            </div>
          )}
        </div>
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'Todos', count: allDocuments.length },
                { key: 'patient', label: 'Paciente', count: allDocuments.filter(d => d.source === 'patient').length },
                { key: 'orthodontic', label: 'Ortodoncia', count: allDocuments.filter(d => d.source === 'orthodontic').length },
                { key: 'signature', label: 'Firmas', count: allDocuments.filter(d => d.source === 'signature').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <AnimatedFolder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay documentos
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? 'Este paciente no tiene documentos adjuntos.'
                : `No hay documentos de ${getSourceLabel(filter)} para este paciente.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Thumbnail/Preview */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative group cursor-pointer"
                     onClick={() => handlePreview(allDocuments.indexOf(doc))}>
                  {doc.fileType === 'Imagen' ? (
                    <img
                      src={doc.url}
                      alt={doc.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-document.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl">{getFileIcon(doc.fileType)}</div>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <AnimatedVer className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Document Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(doc.source)}`}>
                      {getSourceLabel(doc.source)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getFileColor(doc.fileType)}`}>
                      {doc.fileType}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                    {doc.fileName}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handlePreview(allDocuments.indexOf(doc))}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      Ver
                    </button>
                    <a
                      href={doc.url}
                      download={doc.fileName}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewIndex !== null && (
        <DocumentPreviewModal
          documents={filteredDocuments.map(doc => doc.url)}
          initialIndex={previewIndex}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
}
