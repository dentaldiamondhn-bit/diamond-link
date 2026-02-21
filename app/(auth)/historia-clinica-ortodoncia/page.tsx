'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { Patient } from '@/types/patient';
import { createOrthodonticHistory, updateOrthodonticHistory } from './actions';
import { updateOrthodonticHistoryAction } from './edit-actions';
import { OrthodonticHistoryService } from '@/services/orthodonticHistoryService';
import SignaturePadComponent from '@/components/SignaturePad';
import SignatureDisplay from '@/components/SignatureDisplay';
import DocumentDisplay from '@/components/DocumentDisplay';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { SupabaseDoctorService } from '@/services/supabaseDoctorService';

// Utility function to extract filename from URL (matches DocumentDisplay logic)
const getFileName = (url: string): string => {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  
  // Remove patient ID and timestamp prefix for cleaner display
  // Format: patientId_timestamp_filename.ext or patientId_timestamp_filename%20(1).ext
  
  let cleanFileName = fileName;
  
  // Remove patient ID (UUID pattern: 8-4-4-12 hex digits)
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
    
    // Truncate name part but keep extension
    const truncatedName = nameWithoutExt.substring(0, 25) + '...' + extension;
    return truncatedName;
  }
  
  return cleanFileName;
};

// Isolated component to prevent authentication conflicts
const IsolatedDocumentDisplay: React.FC<{ documents: string[], patientId: string, removable?: boolean, onRemove?: (index: number) => void }> = React.memo(({ documents, patientId, removable = false, onRemove }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <DocumentDisplay 
      documents={documents} 
      patientId={patientId}
      removable={removable}
      onRemove={onRemove}
    />
  );
});

IsolatedDocumentDisplay.displayName = 'IsolatedDocumentDisplay';

export default function HistoriaClinicaOrtodoncia() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const { user } = useUser();
  const patientId = searchParams.get('id');
  const isEditing = !!patientId && searchParams.get('edit') === 'true';
  const isViewing = !!patientId && searchParams.get('view') === 'true';
  
  const hasMounted = useRef(false);
  
  if (!hasMounted.current) {
    hasMounted.current = true;
  }

  // Patient data state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [patientDataLoaded, setPatientDataLoaded] = useState(false);
  const [orthodonticHistoryId, setOrthodonticHistoryId] = useState<string | null>(null); // Store record ID

  // Form state
  const [formData, setFormData] = useState({
    // Basic patient info (read-only from existing patient)
    nombre_completo: '',
    edad: '',
    fecha_nacimiento: '',
    sexo: '',
    
    // Doctor information
    doctor_id: '',
    
    // Orthodontic-specific fields
    motivo_consulta_ortodoncia: '',
    diagnostico_ortodoncia: '',
    plan_tratamiento_ortodoncia: '',
    tipo_mordida: '',
    tipo_aparato: '',
    duracion_tratamiento: '',
    fecha_inicio_tratamiento: '',
    fecha_fin_tratamiento: '',
    observaciones_ortodoncia: '',
    radiografias_realizadas: '',
    modelos_estudio: '',
    analisis_cefalometrico: '',
    extracciones_realizadas: '',
    retenedor_tipo: '',
    retenedor_uso: '',
    seguimiento_post_tratamiento: '',
    
    // Documents and signature
    documentos_ortodoncia: [] as string[],
    firma_digital_ortodoncia: null as string | null,
  });

  // Additional conditional fields state variables
  const [otroDoctor, setOtroDoctor] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ index: number; name: string } | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  
  // Form validation state
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]); // Add doctors from database

  // Fetch doctors from database
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsData = await SupabaseDoctorService.getDoctors();
        setDoctors(doctorsData);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    setMounted(true);
    if (patientId && !patientDataLoaded && doctors.length > 0) {
      loadPatientData();
    } else if (!patientId) {
      setLoading(false);
    }
  }, [patientId, patientDataLoaded, doctors]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const patientData = await PatientService.getPatientById(patientId!);
      
      if (!patientData) {
        setError('Paciente no encontrado');
        return;
      }

      setPatient(patientData);
      
      
      // First test the API endpoint directly
      try {
        const testResponse = await fetch('/api/test-orthodontic-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pacienteId: patientId! }),
        });
        
        const testResult = await testResponse.json();
      } catch (testErr) {
        console.error('Test API error:', testErr);
      }
      
      // Wait for doctors to be loaded before processing orthodontic data
      if (doctors.length === 0) {
        // Wait a bit for doctors to load
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const { getOrthodonticHistory } = await import('./actions');
      try {
        const orthodonticData = await getOrthodonticHistory(patientId!);
        
        if (orthodonticData) {
          
          // Store the orthodontic history record ID for updates
          setOrthodonticHistoryId(orthodonticData.id);
          
          // Initialize signatureData with the loaded signature
          setSignatureData(orthodonticData.firma_digital_ortodoncia);
          
          // More robust doctor matching - case insensitive and trimmed
          const savedDoctor = (orthodonticData.doctor_id || '').trim();
          const doctorExists = doctors.some((doc: any) => 
            (doc.name || '').trim().toLowerCase() === savedDoctor.toLowerCase()
          );
          
          
          const doctorIdValue = doctorExists ? savedDoctor : 'otro';
          
          // If doctor doesn't exist in list, set it as "otro" and populate the text field
          if (!doctorExists && savedDoctor) {
            setOtroDoctor(savedDoctor);
          }
          
          const formValues = {
            nombre_completo: patientData.nombre_completo || '',
            edad: patientData.edad?.toString() || '',
            fecha_nacimiento: patientData.fecha_nacimiento || '',
            sexo: patientData.sexo || '',
            
            // Doctor information
            doctor_id: doctorIdValue,
            
            motivo_consulta_ortodoncia: orthodonticData.motivo_consulta_ortodoncia || '',
            diagnostico_ortodoncia: orthodonticData.diagnostico_ortodoncia || '',
            plan_tratamiento_ortodoncia: orthodonticData.plan_tratamiento_ortodoncia || '',
            tipo_mordida: orthodonticData.tipo_mordida || '',
            tipo_aparato: orthodonticData.tipo_aparato || '',
            duracion_tratamiento: orthodonticData.duracion_tratamiento || '',
            fecha_inicio_tratamiento: orthodonticData.fecha_inicio_tratamiento || '',
            fecha_fin_tratamiento: orthodonticData.fecha_fin_tratamiento || '',
            observaciones_ortodoncia: orthodonticData.observaciones_ortodoncia || '',
            radiografias_realizadas: orthodonticData.radiografias_realizadas || '',
            modelos_estudio: orthodonticData.modelos_estudio || '',
            analisis_cefalometrico: orthodonticData.analisis_cefalometrico || '',
            extracciones_realizadas: orthodonticData.extracciones_realizadas || '',
            retenedor_tipo: orthodonticData.retenedor_tipo || '',
            retenedor_uso: orthodonticData.retenedor_uso || '',
            seguimiento_post_tratamiento: orthodonticData.seguimiento_post_tratamiento || '',
            
            // Documents and signature
            documentos_ortodoncia: orthodonticData.documentos_ortodoncia || [],
            firma_digital_ortodoncia: orthodonticData.firma_digital_ortodoncia || null,
          };
          
          setFormData(formValues);
          
          // Set otro doctor if needed
          if (!doctorExists && orthodonticData.doctor_id) {
            setOtroDoctor(orthodonticData.doctor_id);
          }
        } else {
          // Initialize with patient data only
          setFormData(prev => ({
            ...prev,
            nombre_completo: patientData.nombre_completo || '',
            edad: patientData.edad?.toString() || '',
            fecha_nacimiento: patientData.fecha_nacimiento || '',
            sexo: patientData.sexo || '',
          }));
        }
      } catch (err) {
        console.error('Error loading orthodontic history:', err);
        setError('Error al cargar la historia clínica ortodóncica');
      } finally {
        setLoading(false);
        setPatientDataLoaded(true);
      }
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError('Error al cargar los datos del paciente');
    } finally {
      setLoading(false);
    }
  };

  const updateFieldValidation = (fieldName: string, value: string) => {
    setFieldValidation(prev => ({
      ...prev,
      [fieldName]: value.trim() !== ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    updateFieldValidation(name, value);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('patientId', patientId || 'new');
      
      // Add all files
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload-orthodontic-documents', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documentos');
      }

      // Update form with new documents
      if (result.allDocuments) {
        setFormData(prev => ({
          ...prev,
          documentos_ortodoncia: result.allDocuments
        }));
      }

    } catch (error) {
      console.error('Document upload error:', error);
      setError('Error al subir documentos: ' + error.message);
    } finally {
      setLoading(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentos_ortodoncia: prev.documentos_ortodoncia.filter((_, i) => i !== index)
    }));
  };

  const handleSignatureChange = (signature: string | null) => {
    setSignatureData(signature);
    setFormData(prev => ({
      ...prev,
      firma_digital_ortodoncia: signature
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Create FormData from the form
      const formFormData = new FormData(e.currentTarget);
      
      // Extract all form data
      const formDoctorId = formFormData.get('doctor_id') as string;
      const otroDoctorValue = formFormData.get('otro_doctor') as string;
      const finalDoctorId = formDoctorId === 'otro' ? otroDoctorValue : formDoctorId;
      
      const submitData = {
        paciente_id: patientId,
        doctor_id: finalDoctorId,
        nombre_completo: formFormData.get('nombre_completo') as string,
        edad: formFormData.get('edad') ? parseInt(formFormData.get('edad') as string) : undefined,
        fecha_nacimiento: formFormData.get('fecha_nacimiento') as string,
        sexo: formFormData.get('sexo') as string,
        motivo_consulta_ortodoncia: formFormData.get('motivo_consulta_ortodoncia') as string,
        diagnostico_ortodoncia: formFormData.get('diagnostico_ortodoncia') as string,
        plan_tratamiento_ortodoncia: formFormData.get('plan_tratamiento_ortodoncia') as string,
        tipo_mordida: formFormData.get('tipo_mordida') as string,
        tipo_aparato: formFormData.get('tipo_aparato') as string,
        duracion_tratamiento: formFormData.get('duracion_tratamiento') as string,
        fecha_inicio_tratamiento: formFormData.get('fecha_inicio_tratamiento') as string,
        fecha_fin_tratamiento: formFormData.get('fecha_fin_tratamiento') as string,
        observaciones_ortodoncia: formFormData.get('observaciones_ortodoncia') as string,
        radiografias_realizadas: formFormData.get('radiografias_realizadas') as string,
        modelos_estudio: formFormData.get('modelos_estudio') as string,
        analisis_cefalometrico: formFormData.get('analisis_cefalometrico') as string,
        extracciones_realizadas: formFormData.get('extracciones_realizadas') as string,
        retenedor_tipo: formFormData.get('retenedor_tipo') as string,
        retenedor_uso: formFormData.get('retenedor_uso') as string,
        seguimiento_post_tratamiento: formFormData.get('seguimiento_post_tratamiento') as string,
        documentos_ortodoncia: formData.documentos_ortodoncia || [],
        firma_digital_ortodoncia: signatureData,
      };


      if (orthodonticHistoryId) {
        await updateOrthodonticHistory(orthodonticHistoryId, submitData);
      } else {
        await createOrthodonticHistory(submitData);
      }

      router.push(`/menu-navegacion?id=${patientId}`);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Error al guardar la historia clínica ortodóncica');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.back()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div key={`historia-page-${patientId}`} className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {isViewing ? 'Ver Historia Clínica Ortodóncica' : isEditing ? 'Editar Historia Clínica Ortodóncica' : 'Historia Clínica Ortodóncica'}
      </h1>
      
      <form key={`historia-form-${patientId}`} onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Patient Information Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Información del Paciente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Doctor Tratante:</label>
                  <select
                    name="doctor_id"
                    value={formData.doctor_id}
                    onChange={handleInputChange}
                    className="input"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {doctors.map((doc: any) => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name}
                      </option>
                    ))}
                    <option value="otro">Otro (especificar)</option>
                  </select>
                </div>

                {formData.doctor_id === 'otro' && (
                  <div>
                    <label className="block mb-1 font-medium">Especifique el nombre del doctor:</label>
                    <input 
                      type="text" 
                      name="otro_doctor" 
                      className="input" 
                      value={otroDoctor} 
                      onChange={(e) => setOtroDoctor(e.target.value)} 
                    />
                  </div>
                )}
                
                <div>
                  <label className="block mb-1 font-medium">Nombre Completo:</label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    readOnly
                    className="input bg-gray-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Edad:</label>
                  <input
                    type="text"
                    name="edad"
                    value={formData.edad}
                    readOnly
                    className="input bg-gray-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Fecha de Nacimiento:</label>
                  <input
                    type="text"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    readOnly
                    className="input bg-gray-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Sexo:</label>
                  <input
                    type="text"
                    name="sexo"
                    value={formData.sexo}
                    readOnly
                    className="input bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Orthodontic Evaluation Section */}
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Evaluación Ortodóncica
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Motivo de Consulta Ortodóncica:</label>
                  <textarea
                    name="motivo_consulta_ortodoncia"
                    value={formData.motivo_consulta_ortodoncia}
                    onChange={handleInputChange}
                    rows={3}
                    className="input"
                    placeholder="Describa el motivo principal de la consulta ortodóncica..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Tipo de Mordida:</label>
                    <select
                      name="tipo_mordida"
                      value={formData.tipo_mordida}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="clase_i">Clase I</option>
                      <option value="clase_ii">Clase II</option>
                      <option value="clase_iii">Clase III</option>
                      <option value="mordida_abierta">Mordida Abierta</option>
                      <option value="mordida_cruzada">Mordida Cruzada</option>
                      <option value="mordida_profunda">Mordida Profunda</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Tipo de Aparato:</label>
                    <select
                      name="tipo_aparato"
                      value={formData.tipo_aparato}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="brackets_metalicos">Brackets Metálicos</option>
                      <option value="brackets_ceramicos">Brackets Cerámicos</option>
                      <option value="brackets_zafiro">Brackets de Zafiro</option>
                      <option value="invisalign">Invisalign</option>
                      <option value="aparato_removible">Aparato Removible</option>
                      <option value="expansion_palatina">Expansión Palatina</option>
                      <option value="mantenedor_espacio">Mantenedor de Espacio</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Fecha Inicio Tratamiento:</label>
                    <input
                      type="date"
                      name="fecha_inicio_tratamiento"
                      value={formData.fecha_inicio_tratamiento}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Duración Estimada:</label>
                    <input
                      type="text"
                      name="duracion_tratamiento"
                      value={formData.duracion_tratamiento}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Ej: 18 meses, 2 años"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnosis and Treatment Plan */}
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Diagnóstico y Plan de Tratamiento
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Diagnóstico Ortodóncico:</label>
                  <textarea
                    name="diagnostico_ortodoncia"
                    value={formData.diagnostico_ortodoncia}
                    onChange={handleInputChange}
                    rows={4}
                    className="input"
                    placeholder="Describa el diagnóstico ortodóncico detallado..."
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Plan de Tratamiento Ortodóncico:</label>
                  <textarea
                    name="plan_tratamiento_ortodoncia"
                    value={formData.plan_tratamiento_ortodoncia}
                    onChange={handleInputChange}
                    rows={4}
                    className="input"
                    placeholder="Describa el plan de tratamiento ortodóncico..."
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Observaciones Ortodóncicas:</label>
                  <textarea
                    name="observaciones_ortodoncia"
                    value={formData.observaciones_ortodoncia}
                    onChange={handleInputChange}
                    rows={3}
                    className="input"
                    placeholder="Observaciones adicionales sobre el tratamiento..."
                  />
                </div>
              </div>
            </div>

            {/* Studies and Analysis */}
            <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Estudios y Análisis
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Radiografías Realizadas:</label>
                    <select
                      name="radiografias_realizadas"
                      value={formData.radiografias_realizadas}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="panoramica">Panorámica</option>
                      <option value="periapical">Periapical</option>
                      <option value="oclusal">Oclusal</option>
                      <option value="lateral_craneo">Lateral de Cráneo</option>
                      <option value="todas">Todas las anteriores</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Modelos de Estudio:</label>
                    <select
                      name="modelos_estudio"
                      value={formData.modelos_estudio}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                      <option value="en_proceso">En proceso</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Análisis Cefalométrico:</label>
                  <textarea
                    name="analisis_cefalometrico"
                    value={formData.analisis_cefalometrico}
                    onChange={handleInputChange}
                    rows={3}
                    className="input"
                    placeholder="Resultados del análisis cefalométrico..."
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Extracciones Realizadas:</label>
                  <textarea
                    name="extracciones_realizadas"
                    value={formData.extracciones_realizadas}
                    onChange={handleInputChange}
                    rows={2}
                    className="input"
                    placeholder="Describa las extracciones realizadas si aplica..."
                  />
                </div>
              </div>
            </div>

            {/* Retention and Follow-up */}
            <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Retención y Seguimiento
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Tipo de Retenedor:</label>
                    <select
                      name="retenedor_tipo"
                      value={formData.retenedor_tipo}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="fijo">Fijo</option>
                      <option value="removible">Removible</option>
                      <option value="hawley">Hawley</option>
                      <option value="invisible">Invisible</option>
                      <option value="sin_retenedor">Sin retenedor</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Uso de Retenedor:</label>
                    <select
                      name="retenedor_uso"
                      value={formData.retenedor_uso}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Seleccione...</option>
                      <option value="tiempo_completo">Tiempo completo</option>
                      <option value="noche">Solo noche</option>
                      <option value="ocasional">Ocasional</option>
                      <option value="no_usa">No usa</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Seguimiento Post-Tratamiento:</label>
                  <textarea
                    name="seguimiento_post_tratamiento"
                    value={formData.seguimiento_post_tratamiento}
                    onChange={handleInputChange}
                    rows={3}
                    className="input"
                    placeholder="Notas de seguimiento post-tratamiento..."
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Documentos Ortodóncicos
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Subir Documentos:</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="input"
                  />
                </div>
                
                {formData.documentos_ortodoncia.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Documentos Subidos:</h3>
                    <IsolatedDocumentDisplay
                      documents={formData.documentos_ortodoncia}
                      patientId={patientId || 'new'}
                      removable={true}
                      onRemove={(index) => {
                        if (!formData.documentos_ortodoncia[index]) return;
                        
                        const docUrl = formData.documentos_ortodoncia[index];
                        const fileName = getFileName(docUrl);
                        
                        setDocumentToDelete({ index, name: fileName });
                        setShowDeleteModal(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Signature Section */}
            <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Firma Digital
              </h2>
              
              <div className="space-y-4">
                {formData.firma_digital_ortodoncia ? (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Firma Actual:</h3>
                    <SignatureDisplay signatureUrl={formData.firma_digital_ortodoncia} />
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setSignatureData(null)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Modificar Firma
                      </button>
                    )}
                  </div>
                ) : (
                  <SignaturePadComponent 
                    onChange={setSignatureData}
                    value={signatureData}
                  />
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </form>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    deleteSuccess ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <i className={`fas ${deleteSuccess ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {deleteSuccess ? 'Documento Eliminado' : 'Eliminar Documento'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deleteSuccess 
                          ? `El documento "${documentToDelete?.name}" ha sido eliminado exitosamente.`
                          : `¿Está seguro de que desea eliminar el documento "${documentToDelete?.name}"? Esta acción no se puede deshacer.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!deleteSuccess ? (
                  <>
                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm" onClick={async () => {
                      // Delete logic here
                      const docUrl = formData.documentos_ortodoncia[documentToDelete!.index];
                      const fileName = decodeURIComponent(docUrl.split('/').pop()!);
                      const filePath = `${patientId}/${fileName}`;
                      
                      const response = await fetch('/api/delete-orthodontic-document', {
                        method: 'DELETE',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                          patientId: patientId, 
                          filePath, 
                          documentIndex: documentToDelete!.index, 
                          documents: formData.documentos_ortodoncia
                        })
                      });
                      
                      if (response.ok) {
                        const updatedDocuments = formData.documentos_ortodoncia.filter((_, i) => i !== documentToDelete!.index);
                        setFormData(prev => ({...prev, documentos_ortodoncia: updatedDocuments}));
                        setDeleteSuccess(true);
                      } else {
                        const result = await response.json();
                        alert('Error: ' + result.error);
                      }
                    }}>Eliminar</button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => {setShowDeleteModal(false); setDocumentToDelete(null);}}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 sm:w-auto sm:text-sm" onClick={() => {setShowDeleteModal(false); setDocumentToDelete(null); setDeleteSuccess(false);}}>
                    <i className="fas fa-check mr-2"></i>Eliminado Exitosamente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
