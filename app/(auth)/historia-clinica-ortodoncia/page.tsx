'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { Patient } from '@/types/patient';
import { createOrthodonticHistory, updateOrthodonticHistory } from './actions';
import SignaturePadComponent from '@/components/SignaturePad';
import SignatureDisplay from '@/components/SignatureDisplay';
import DocumentDisplay from '@/components/DocumentDisplay';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

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
  const isEditing = !!patientId;

  // Patient data state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic patient info (read-only from existing patient)
    nombre_completo: '',
    edad: '',
    fecha_nacimiento: '',
    sexo: '',
    
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

  // Form validation state
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (patientId) {
      loadPatientData();
    } else {
      setLoading(false);
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const patientData = await PatientService.getPatientById(patientId!);
      
      if (!patientData) {
        setError('Paciente no encontrado');
        return;
      }

      setPatient(patientData);
      
      // Load existing orthodontic history if available
      const { data: orthodonticData } = await supabase
        .from('historia_clinica_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .single();

      if (orthodonticData) {
        setFormData({
          nombre_completo: patientData.nombre_completo || '',
          edad: patientData.edad?.toString() || '',
          fecha_nacimiento: patientData.fecha_nacimiento || '',
          sexo: patientData.sexo || '',
          
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
          
          documentos_ortodoncia: orthodonticData.documentos_ortodoncia || [],
          firma_digital_ortodoncia: orthodonticData.firma_digital_ortodoncia || null,
        });
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
      console.error('Error loading patient data:', err);
      setError('Error al cargar datos del paciente');
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
    if (!files) return;

    const newDocuments: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Here you would upload the file to your storage service
      // For now, we'll just add the file name
      newDocuments.push(file.name);
    }

    setFormData(prev => ({
      ...prev,
      documentos_ortodoncia: [...prev.documentos_ortodoncia, ...newDocuments]
    }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentos_ortodoncia: prev.documentos_ortodoncia.filter((_, i) => i !== index)
    }));
  };

  const handleSignatureComplete = (signature: string) => {
    setSignatureData(signature);
    setFormData(prev => ({
      ...prev,
      firma_digital_ortodoncia: signature
    }));
    setShowSignaturePad(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        paciente_id: patientId,
        doctor_id: user.id,
      };

      if (isEditing && patientId) {
        await updateOrthodonticHistory(patientId, submitData);
      } else {
        await createOrthodonticHistory(submitData);
      }

      router.push('/menu-navegacion');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Historia Clínica Ortodóncica
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Información del Paciente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onRemove={removeDocument}
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
                    <SignatureDisplay signature={formData.firma_digital_ortodoncia} />
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Modificar Firma
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Agregar Firma
                  </button>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Firma Digital</h3>
            <SignaturePadComponent
              onSave={handleSignatureComplete}
              onCancel={() => setShowSignaturePad(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
