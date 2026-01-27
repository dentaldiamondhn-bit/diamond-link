'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PatientService } from '../../../../services/patientService';
import { consentimientoService } from '../../../../services/consentimientoService';
import { Patient } from '../../../../types/patient';
import { supabase } from '../../../../lib/supabase';
import SignaturePadComponent from '../../../../components/SignaturePad';
import Link from 'next/link';
import { useHistoricalMode } from '../../../../contexts/HistoricalModeContext';
import { getRecordCategoryInfo } from '../../../../utils/recordCategoryUtils';
import { getPatientType } from '../../../../utils/patientTypeUtils';
import { useUser } from '@clerk/nextjs';
import HistoricalBanner from '../../../../components/HistoricalBanner';

export default function ConsentimientoDocument() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [displayDate, setDisplayDate] = useState('');
  const [showPatientSignatureModal, setShowPatientSignatureModal] = useState(false);
  const [showDoctorSignatureModal, setShowDoctorSignatureModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientType, setPatientType] = useState<any>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const { user, isLoaded } = useUser();
  const pacienteId = params.id as string;
  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();

  // Consentimiento content
  const consentimientoContent = `Yo, ${patient?.nombre_completo || '_________________________'} con el documento de identidad${patient?.numero_identidad || '_____________________'} y que resido en el domicilio${patient?.direccion || '__________________________________________'} por medio del presente documento hago constar lo siguiente.

• Que he acudido a la clínica Dental Diamond donde he sido atendido por ${patient?.doctor || '_________________________'}.

• Que se me ha explicado que debo participar en la elaboración de un diagnostico odontológico el cual incluirá un exámen clínico, un examen radiográfico de ser necesario y un expediente clínico con mi información personal. Asi mismo, me ha sido advertido y se me ha explicado claramente los riesgos de salud que ocurrirían al no cumplir con las recomendaciones que el odontólogo me proporcione, liberándolo de toda responsabilidad.

• Que entiendo que todos los tratamientos NO son gratuitos, ya que conllevan un costo el cual será comunicado previamente a realizar cualquier tratamiento y al llegar a un acuerdo se procederá luego de su cancelación.

• Autorizo a la clínica antes dicha a la toma de fotografías publicación con fines demostrativos y educativos para posteriormente publicar en redes sociales.`;


  useEffect(() => {
    const loadPatientData = async () => {
      try {
        if (!pacienteId) {
          setError('ID de paciente no proporcionado');
          return;
        }

        const patientData = await PatientService.getPatientById(pacienteId);
        if (patientData) {
          setPatient(patientData);
          
          // Check record category (historical, active, archived)
          const categoryInfo = await getRecordCategoryInfo(patientData.fecha_inicio);
          setRecordCategoryInfo(categoryInfo);
          
          // Load patient-specific historical mode settings using new context method
          loadPatientSettings(pacienteId);
          
          // Set patient type
          const type = getPatientType(patientData);
          setPatientType(type);
        } else {
          setError('Paciente no encontrado');
        }
      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('Error al cargar el paciente');
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded) {
      loadPatientData();
    }
  }, [pacienteId, isLoaded]);

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        if (!pacienteId) {
          setError('No se proporcionó un ID de paciente válido');
          setLoading(false);
          return;
        }

        // First, check if this is a consentimiento ID (not a patient ID)
        // by trying to fetch the consentimiento first
        const { data: consentimiento, error: consentimientoError } = await supabase
          .from('consentimientos')
          .select('*')
          .eq('id', pacienteId)
          .single();

        let actualPatientId = pacienteId;
        let existingConsentimiento = null;

        if (consentimiento && !consentimientoError) {
          // This is a consentimiento ID, get the patient ID from it
          actualPatientId = consentimiento.paciente_id;
          existingConsentimiento = consentimiento;
          console.log('Found consentimiento:', consentimiento);
          
          // Check if consentimiento is signed - if so, redirect to preview
          if (consentimiento.estado === 'firmado') {
            router.replace(`/consentimientos/${pacienteId}/preview`);
            return;
          }
          
          // Load existing signatures if they exist
          if (consentimiento.firma_paciente_url) {
            setSignatureData(consentimiento.firma_paciente_url);
          }
          if (consentimiento.firma_doctor_url) {
            setDoctorSignature(consentimiento.firma_doctor_url);
          }
        } else {
          // This might be a patient ID directly, continue as before
          console.log('Using provided ID as patient ID:', actualPatientId);
        }

        const patientData = await PatientService.getPatientById(actualPatientId);
        setPatient(patientData);
        
        // Calculate patient type for age-based color coding
        const patientTypeData = getPatientType(patientData);
        
        // Special case: pregnancy override - use soft pink to blue gradient
        let finalPatientType = patientTypeData;
        if (patientData.sexo === 'femenino' && patientData.embarazo === 'si') {
          finalPatientType = {
            ...patientTypeData,
            colors: {
              header: 'from-pink-400 to-blue-400',
              badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
              badgeText: 'border-pink-200 text-pink-700 dark:text-pink-300'
            }
          };
        }
        
        setPatientType(finalPatientType);
        
        // Check record category (historical, active, archived)
        const categoryInfo = await getRecordCategoryInfo(patientData.fecha_inicio || patientData.fecha_inicio_consulta);
        setRecordCategoryInfo(categoryInfo);
        
        // Load patient-specific historical mode settings using new context method
        loadPatientSettings(actualPatientId);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading patient data:', err);
        if (err instanceof Error && err.message === 'Paciente no encontrado') {
          setError('Paciente no encontrado. Por favor, verifique el ID del paciente.');
        } else {
          setError('Error al cargar los datos del paciente');
        }
        setLoading(false);
      }
    };

    // Set current date
    const today = new Date();
    const dbDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format for database
    const formattedDisplayDate = today.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }); // DD/MM/YYYY format for display
    setCurrentDate(dbDate);
    setDisplayDate(formattedDisplayDate);

    if (isLoaded) {
      loadPatientData();
    }
  }, [pacienteId, isLoaded]);

  const handleSave = async () => {
    // Handle signature based on record category and bypass mode
    const shouldRequireSignature = !recordCategoryInfo?.isHistorical || bypassHistoricalMode;
    
    console.log('🔍 Consentimientos save debug:', {
      isHistorical: recordCategoryInfo?.isHistorical,
      bypassHistoricalMode,
      shouldRequireSignature
    });
    
    if (shouldRequireSignature && (!signatureData || !doctorSignature)) {
      alert('Por favor, firme ambos campos antes de guardar');
      return;
    }
    
    if (!patient || !pacienteId) {
      alert('Error: No se encontró información del paciente');
      return;
    }

    setSaving(true);
    
    try {
      // Create consentimiento record first
      const consentimientoData = {
        paciente_id: pacienteId,
        tipo_consentimiento: 'otros',
        nombre_consentimiento: 'Consentimiento Informado General',
        descripcion: 'Consentimiento informado general para tratamientos odontológicos',
        contenido: consentimientoContent,
        fecha_consentimiento: currentDate,
        estado: 'firmado' as const
      };

      const savedConsentimiento = await consentimientoService.createConsentimiento(consentimientoData);

      // Handle signatures based on record category and bypass mode
      let patientSignatureUrl = null;
      let doctorSignatureUrl = null;
      
      if (shouldRequireSignature) {
        // Upload signatures to storage
        [patientSignatureUrl, doctorSignatureUrl] = await Promise.all([
          consentimientoService.uploadSignatureFromBase64(signatureData!, savedConsentimiento.id, 'paciente'),
          consentimientoService.uploadSignatureFromBase64(doctorSignature!, savedConsentimiento.id, 'doctor')
        ]);
      } else {
        // Historical record with no bypass - no signatures required
        console.log('Historical record - no signatures required');
      }

      // Update consentimiento with signature URLs or empty strings
      await consentimientoService.updateConsentimiento(savedConsentimiento.id, {
        firma_paciente_url: patientSignatureUrl || '',
        firma_doctor_url: doctorSignatureUrl || '',
        is_historical: !shouldRequireSignature
      });

      console.log('Consentimiento saved successfully:', {
        id: savedConsentimiento.id,
        patient: patient.nombre_completo,
        patientSignature: patientSignatureUrl,
        doctorSignature: doctorSignatureUrl,
        date: currentDate
      });
      
      alert('Consentimiento guardado exitosamente');
      router.back();
    } catch (error) {
      console.error('Error saving consentimiento:', error);
      alert('Error al guardar el consentimiento. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 text-xl flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
          Cargando datos del paciente...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md">
          <div className="text-red-600 dark:text-red-400 text-center">
            <i className="fas fa-exclamation-triangle text-5xl mb-4"></i>
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-lg">{error}</p>
            <button 
              onClick={() => router.back()}
              className="mt-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Logo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Link
                href={`/menu-navegacion?id=${pacienteId}`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Volver al Menú
              </Link>
              <Link
                href={`/consentimientos/${pacienteId}`}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <i className="fas fa-plus mr-2"></i>
                Crear
              </Link>
            </div>
          </div>

          {/* Historical Mode Banner */}
          <HistoricalBanner
            isHistorical={recordCategoryInfo?.isHistorical}
            isBypassed={bypassHistoricalMode}
            patientId={pacienteId}
            onBypassChange={async (newBypassValue) => {
              try {
                await savePatientSettings(pacienteId, newBypassValue);
                console.log('✅ Patient bypass setting updated successfully');
              } catch (error) {
                console.error('❌ Failed to update bypass setting:', error);
                alert('Error al actualizar la configuración del modo histórico');
              }
            }}
            loading={false}
            compact={true}
          />

          {/* Consent Document */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-gray-900 dark:text-white">
            {/* Logo and Clinic Header */}
            <div className="flex items-center space-x-4 mb-8">
              <img 
                src="/Logo.svg" 
                alt="Clínica Dental Diamond" 
                className="w-16 h-16"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  CLINICA DENTAL DIAMOND
                </h1>
              </div>
            </div>
            
            <h2 className={`text-xl font-bold text-center mb-8 bg-gradient-to-r ${patientType?.colors?.header || 'from-teal-500 to-cyan-500'} text-white px-6 py-3 rounded-xl`}>
            CONSENTIMIENTO INFORMADO
          </h2>
            
            <div className="space-y-6 text-base leading-relaxed">
              <p className="text-justify">
                Yo, <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                  {patient?.nombre_completo || '_________________________'}
                </span> con el documento de identidad 
                <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                  {patient?.numero_identidad || '_____________________'}
                </span>
              </p>
              
              <p className="text-justify">
                y que resido en el domicilio
                <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                  {patient?.direccion || '__________________________________________'}
                </span>
                por medio del presente documento hago constar lo siguiente.
              </p>
              
              <div className="space-y-4 ml-6">
                <div className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                  <p className="text-justify">
                    Que he acudido a la clínica Dental Diamond donde he sido atendido por 
                    <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                      {patient?.doctor || '_________________________'}
                    </span>
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                  <p className="text-justify">
                    Que se me ha explicado que debo participar en la elaboración de un
                    diagnostico odontológico el cual incluirá un exámen clínico, un examen
                    radiográfico de ser necesario y un expediente clínico con mi información
                    personal. Asi mismo, me ha sido advertido y se me ha explicado claramente
                    los riesgos de salud que ocurrirían al no cumplir con las recomendaciones
                    que el odontólogo me proporcione, liberándolo de toda responsabilidad.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                  <p className="text-justify">
                    Que entiendo que todos los tratamientos NO son gratuitos, ya que
                    conllevan un costo el cual será comunicado previamente a realizar
                    cualquier tratamiento y al llegar a un acuerdo se procederá luego de su
                    cancelación.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                  <p className="text-justify">
                    Autorizo a la clínica antes dicha a la toma de fotografías publicación con
                    fines demostrativos y educativos para posteriormente publicar en redes
                    sociales.
                  </p>
                </div>
              </div>
            </div>

            {/* Date and Signatures */}
            <div className="mt-12 space-y-8">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Fecha:
                </label>
                <div className="inline-block border-b-2 border-gray-400 dark:border-gray-500 px-4 pb-1">
                  {displayDate || '____________________________'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Patient Signature - Only show if signatures are required */}
                {(!recordCategoryInfo?.isHistorical || bypassHistoricalMode) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Firma del Paciente:
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 min-h-[120px] flex items-center justify-center">
                      {signatureData ? (
                        <img 
                          src={signatureData} 
                          alt="Firma del paciente" 
                          className="max-h-24 max-w-full"
                        />
                      ) : (
                        <button
                          onClick={() => setShowPatientSignatureModal(true)}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <i className="fas fa-signature mr-2"></i>
                          Firmar Aquí
                        </button>
                      )}
                    </div>
                    {signatureData && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={() => setShowPatientSignatureModal(true)}
                          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Cambiar Firma
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Doctor Signature - Only show if signatures are required */}
                {(!recordCategoryInfo?.isHistorical || bypassHistoricalMode) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Firma de Doctor/a:
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 min-h-[120px] flex items-center justify-center">
                      {doctorSignature ? (
                        <img 
                          src={doctorSignature} 
                          alt="Firma del doctor" 
                          className="max-h-24 max-w-full"
                        />
                      ) : (
                        <button
                          onClick={() => setShowDoctorSignatureModal(true)}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <i className="fas fa-user-md mr-2"></i>
                          Firmar Aquí
                        </button>
                      )}
                    </div>
                    {doctorSignature && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={() => setShowDoctorSignatureModal(true)}
                          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Cambiar Firma
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={(!recordCategoryInfo?.isHistorical || bypassHistoricalMode) && (!signatureData || !doctorSignature) || saving}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Guardar Consentimiento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Signature Modal */}
      {showPatientSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center">
                <i className="fas fa-signature mr-3"></i>
                Firma del Paciente
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600">
                <SignaturePadComponent
                  onChange={(data) => setSignatureData(data)}
                  value={signatureData}
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowPatientSignatureModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowPatientSignatureModal(false)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-check mr-2"></i>
                  Aceptar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Signature Modal */}
      {showDoctorSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center">
                <i className="fas fa-user-md mr-3"></i>
                Firma del Doctor/a
              </h3>
              <p className="text-teal-100 text-sm mt-1">
                {patient?.doctor}
              </p>
            </div>
            <div className="p-6">
              <div className="bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600">
                <SignaturePadComponent
                  onChange={(data) => setDoctorSignature(data)}
                  value={doctorSignature}
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowDoctorSignatureModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowDoctorSignatureModal(false)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-check mr-2"></i>
                  Aceptar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
