'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dentalStudyService } from '../../../../services/dentalStudyService';
import { DentalStudy, StudyGroup } from '../../../../types/dental';
import Link from 'next/link';
import LoadingAnimation from '../../../../components/LoadingAnimation';

export default function PatientXrayViewPage() {
  const [studies, setStudies] = useState<DentalStudy[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const params = useParams();
  const router = useRouter();
  
  // Try different ways to extract patient ID
  console.log('Raw params object:', params);
  console.log('Raw params keys:', Object.keys(params));
  console.log('Raw params.id:', params.id);
  console.log('Raw params[patientId]:', params['patientId']);
  
  // Extract patient ID - try multiple approaches
  let patientId: string | undefined;
  
  if (params.id) {
    patientId = params.id as string;
    console.log('Using params.id:', patientId);
  } else if (params['patientId']) {
    patientId = params['patientId'] as string;
    console.log('Using params[patientId]:', patientId);
  } else {
    console.log('No patient ID found in params');
  }
  
  console.log('Final extracted patientId:', patientId);
  console.log('Final patientId type:', typeof patientId);
  console.log('Final patientId is truthy:', !!patientId);

  // Load patient studies
  useEffect(() => {
    const loadStudies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const studiesData = await dentalStudyService.getPatientStudies(patientId);
        setStudies(studiesData);
        
        // Group studies by date
        const grouped = groupStudiesByDate(studiesData);
        setStudyGroups(grouped);
      } catch (err) {
        console.error('Error loading patient studies:', err);
        setError('Error al cargar los estudios del paciente');
      } finally {
        setLoading(false);
      }
    };

    if (patientId && patientId.trim() !== '') {
      loadStudies();
    } else {
      setError('ID de paciente no válido');
      setLoading(false);
    }
  }, [patientId]);

  // Group studies by date
  const groupStudiesByDate = (studiesData: DentalStudy[]): StudyGroup[] => {
    const groups = new Map<string, DentalStudy[]>();
    
    studiesData.forEach(study => {
      const date = study.study_date.split('T')[0]; // Get date part only
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(study);
    });

    return Array.from(groups.entries()).map(([date, studies]) => ({
      date,
      studies: studies.sort((a, b) => new Date(b.study_date).getTime() - new Date(a.study_date).getTime()),
      imageCount: studies.reduce((sum, study) => sum + (study.image_count || 0), 0),
      isExpanded: true // Default to expanded
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Toggle study group expansion
  const toggleStudyGroup = (date: string) => {
    setStudyGroups(prev => prev.map(group => 
      group.date === date 
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ));
  };

  // Handle image zoom and pan
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Format date
  const formatDateSpanish = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              <i className="fas fa-redo mr-2"></i>
              Reintentar
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <i className="fas fa-x-ray text-6xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sin Estudios
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Este paciente no tiene estudios de rayos X registrados
          </p>
          <Link
            href="/xray-viewer"
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Volver al Visor
          </Link>
        </div>
      </div>
    );
  }
  
  const patient = studies[0]?.patient;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/xray-viewer"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <i className="fas fa-arrow-left text-xl"></i>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <i className="fas fa-user mr-3 text-teal-600"></i>
                    {patient?.nombre_completo}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    ID: {patient?.numero_identidad} • {studies.length} estudio{studies.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-images text-2xl text-teal-600"></i>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total de Imágenes
                  </h3>
                  <p className="text-3xl font-bold text-teal-600">
                    {studyGroups.reduce((total, group) => total + group.imageCount, 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    en {studyGroups.length} grupo{studyGroups.length !== 1 ? 's' : ''} de estudio
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <i className="fas fa-info-circle mr-2"></i>
                Haz clic en cualquier imagen para verla en tamaño completo
              </div>
            </div>
          </div>
        </div>

        {/* Study Groups */}
        <div className="space-y-6">
          {studyGroups.map((group) => (
            <div key={group.date} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Group Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                onClick={() => toggleStudyGroup(group.date)}
              >
                <div className="flex items-center space-x-4">
                  <i className={`fas fa-chevron-${group.isExpanded ? 'down' : 'right'} text-gray-600 dark:text-gray-400 transition-transform duration-200`}></i>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDateSpanish(group.date)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.studies.length} estudio{group.studies.length !== 1 ? 's' : ''} • {group.imageCount} imagen{group.imageCount !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-sm font-medium rounded-full">
                    {group.imageCount} imágenes
                  </span>
                </div>
              </div>

              {/* Study Content */}
              {group.isExpanded && (
                <div className="p-4 space-y-6">
                  {group.studies.map((study) => (
                    <div key={study.id} className="border-l-4 border-teal-500 pl-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Estudio #{study.study_number}
                            </h4>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTime(study.created_at)}
                            </span>
                            {study.directory_name && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                                {study.directory_name}
                              </span>
                            )}
                          </div>
                          {study.actual_study_date && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <i className="fas fa-calendar-alt mr-2"></i>
                              Fecha del estudio: {formatDateSpanish(study.actual_study_date)}
                            </p>
                          )}
                          {study.notes && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 mb-3">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <i className="fas fa-sticky-note mr-2"></i>
                                {study.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Images Grid */}
                      {study.images && study.images.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Imágenes ({study.images.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {study.images.map((image, index) => {
                              // Use the existing public_url field from dental_images
                              const imageUrl = image.public_url || '';
                              return (
                                <div
                                  key={image.id}
                                  className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                                  onClick={() => handleImageClick(imageUrl)}
                                >
                                  {/* Thumbnail/Preview Section */}
                                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
                                    <img
                                      src={imageUrl}
                                      alt={image.image_name || `Imagen ${index + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        // Handle broken images
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-image.svg';
                                      }}
                                      loading="lazy"
                                      crossOrigin="anonymous"
                                    />
                                  </div>
                                  
                                  {/* Image Type Badge */}
                                  <div className="absolute top-2 right-2">
                                    <span className="px-3 py-1 text-xs font-bold rounded-full shadow-md bg-green-100 text-green-600 border-green-200">
                                      🖼️ Rayos X
                                    </span>
                                  </div>

                                  {/* Overlay on Hover */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                                  
                                  {/* File Info Section */}
                                  <div className="p-4">
                                    <div className="mb-3">
                                      <div className="font-semibold text-sm text-gray-900 truncate" title={image.image_name || `Imagen ${index + 1}`}>
                                        {image.image_name || `Imagen ${index + 1}`}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Rayos X - Imagen {index + 1}
                                      </div>
                                    </div>
                                  
                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => handleImageClick(imageUrl)}
                                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Ver
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                                  
                                  {/* Reports */}
                      {study.reports && study.reports.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Informes ({study.reports.length})
                          </h5>
                          <div className="space-y-3">
                            {study.reports.map((report) => (
                              <div
                                key={report.id}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                                      {report.title}
                                    </h6>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {report.content}
                                    </p>
                                    {report.findings && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                          Hallazgos:
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {report.findings}
                                        </p>
                                      </div>
                                    )}
                                    {report.recommendations && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                          Recomendaciones:
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {report.recommendations}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      report.status === 'completed'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : report.status === 'reviewed'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    }`}>
                                      {report.status === 'completed' ? 'Completado' :
                                       report.status === 'reviewed' ? 'Revisado' : 'Borrador'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
            onWheel={handleWheel}
          >
            <div className="relative max-w-4xl max-h-screen w-full h-full flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl relative w-full h-full flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Imagen de Rayos X
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                {/* Image Container */}
                <div className="flex-1 overflow-hidden">
                  <div
                    className="relative w-full h-full flex items-center justify-center cursor-move"
                    onMouseDown={handleMouseDown}
                    onWheel={handleWheel}
                  >
                    <img
                      src={selectedImage}
                      alt="Imagen de Rayos X"
                      className="max-w-full max-h-full object-contain"
                      style={{
                        transform: `scale(${imageZoom}) translate(${imagePan.x}px, ${imagePan.y}px)`,
                        transition: 'transform 0.1s ease-out'
                      }}
                    />
                  </div>
                </div>

                {/* Modal Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Reducir"
                  >
                    <i className="fas fa-search-minus"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Restablecer"
                  >
                    <i className="fas fa-compress"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ampliar"
                  >
                    <i className="fas fa-search-plus"></i>
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(imageZoom * 100)}%
                  </span>
                </div>
              </div>
              
              {/* Zoom Indicator */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(imageZoom * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
