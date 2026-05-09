'use client';

import { useState, useEffect } from 'react';
import { formatPhoneDisplay, createWhatsAppUrl } from '@/utils/phoneUtils';
import { PatientFollowUpStatusService } from '@/services/patientFollowUpStatusService';

interface PatientFollowUp {
  paciente_id: string;
  paciente_nombre: string;
  paciente_telefono?: string;
  ultimo_tratamiento: string;
  fecha_ultimo_tratamiento: string;
  dias_ultimo_tratamiento: number;
  tipo_seguimiento: 'limpieza' | 'ortodoncia' | 'otro';
  follow_up_status?: {
    whatsapp_sent: boolean;
    patient_responded: boolean;
    appointment_scheduled: boolean;
  };
}

function PatientFollowUpPageContent() {
  const [patients, setPatients] = useState<PatientFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'limpieza' | 'ortodoncia'>('all');

  useEffect(() => {
    loadPatients();
  }, [filter]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patient-follow-up?type=${filter}`);
      const data = await response.json();
      
      if (data.data) {
        // Calculate 4 months ago date
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
        
        // Filter for patients with Limpieza/Profilaxis AND 4+ months ago
        const filteredPatients = data.data
          .filter((treatment: any) => {
            const treatmentDate = new Date(treatment.fecha_cita);
            const isOldEnough = treatmentDate <= fourMonthsAgo;
            
            const treatmentNames = treatment.vista_tratamientos_realizados_detalles
              ?.map((item: any) => item.nombre_tratamiento.toLowerCase())
              .join(' ') || '';
            const isCleaning = treatmentNames.includes('limpieza') || treatmentNames.includes('profilaxis');
            
            return isOldEnough && isCleaning;
          })
          .map((treatment: any) => {
            const lastTreatmentDate = new Date(treatment.fecha_cita);
            const daysSinceLastTreatment = Math.floor(
              (new Date().getTime() - lastTreatmentDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const treatmentNames = treatment.vista_tratamientos_realizados_detalles
              ?.map((item: any) => item.nombre_tratamiento)
              .join(', ') || 'Tratamiento desconocido';

            return {
              paciente_id: treatment.paciente_id,
              paciente_nombre: treatment.patients?.nombre_completo || 'Desconocido',
              paciente_telefono: treatment.patients?.telefono,
              ultimo_tratamiento: treatmentNames,
              fecha_ultimo_tratamiento: treatment.fecha_cita,
              dias_ultimo_tratamiento: daysSinceLastTreatment,
              tipo_seguimiento: 'limpieza' as const
            };
          });

        // Group by patient to get the most recent treatment
        const patientMap = new Map();
        filteredPatients.forEach((patient: any) => {
          const existing = patientMap.get(patient.paciente_id);
          if (!existing || patient.dias_ultimo_tratamiento < existing.dias_ultimo_tratamiento) {
            patientMap.set(patient.paciente_id, patient);
          }
        });

        const finalPatients = Array.from(patientMap.values());

        // Fetch follow-up status for each patient
        const patientsWithStatus = await Promise.all(
          finalPatients.map(async (patient) => {
            const status = await PatientFollowUpStatusService.getFollowUpStatus(patient.paciente_id);
            return { ...patient, follow_up_status: status };
          })
        );

        setPatients(patientsWithStatus);
      }
    } catch (error) {
      console.error('Error loading follow-up patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getFollowUpTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'limpieza':
        return 'bg-blue-100 text-blue-800';
      case 'ortodoncia':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'limpieza':
        return 'Limpieza';
      case 'ortodoncia':
        return 'Ortodoncia';
      default:
        return 'Otro';
    }
  };

  const handleWhatsAppClick = async (patient: PatientFollowUp) => {
    if (patient.paciente_telefono) {
      const message = `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Solo queríamos recordarte que ya toca tu limpieza dental 😉
Hacerla cada 6 meses ayuda a mantener tu sonrisa sana y brillante 😁✨

Agenda tu cita con nosotros:
📞 94985346
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh  local A3

¡Nos encantará verte pronto y cuidar tu sonrisa! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`;
      
      // Clean phone number - remove spaces, dashes, parentheses
      let cleanPhone = patient.paciente_telefono.replace(/[\s\-\(\)]/g, '');
      
      // Remove country code if present and add it properly
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      // Ensure Honduras country code if not present
      if (!cleanPhone.startsWith('504')) {
        cleanPhone = '504' + cleanPhone;
      }
      
      // Create WhatsApp URL with message
      const whatsappUrl = createWhatsAppUrl(patient.paciente_telefono || '', message);
      window.open(whatsappUrl, '_blank');
      
      // Create or update follow-up status record
      try {
        if (patient.follow_up_status?.id) {
          // Update existing status
          await PatientFollowUpStatusService.markWhatsAppSent(patient.follow_up_status.id);
        } else {
          // Create new status record
          await PatientFollowUpStatusService.createFollowUpStatus({
            paciente_id: patient.paciente_id,
            treatment_date: patient.fecha_ultimo_tratamiento,
            notes: `WhatsApp message sent: ${message}`
          });
        }
        
        // Refresh patient data to update UI
        loadPatients();
      } catch (error) {
        console.error('Error updating follow-up status:', error);
      }
    }
  };

  const handlePatientRespondedToggle = async (patient: PatientFollowUp) => {
    try {
      if (patient.follow_up_status?.id) {
        // Toggle patient responded status
        await PatientFollowUpStatusService.markPatientResponded(patient.follow_up_status.id);
        // Refresh patient data to update UI
        loadPatients();
      } else {
        // Create new status record first
        await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: 'Patient responded to follow-up'
        });
        // Refresh patient data to update UI
        loadPatients();
      }
    } catch (error) {
      console.error('Error updating patient responded status:', error);
    }
  };

  const handleWhatsAppSentToggle = async (patient: PatientFollowUp) => {
    try {
      if (patient.follow_up_status?.id) {
        // Toggle WhatsApp sent status
        await PatientFollowUpStatusService.markWhatsAppSent(patient.follow_up_status.id);
        // Refresh patient data to update UI
        loadPatients();
      } else {
        // Create new status record first
        await PatientFollowUpStatusService.createFollowUpStatus({
          paciente_id: patient.paciente_id,
          treatment_date: patient.fecha_ultimo_tratamiento,
          notes: 'WhatsApp sent'
        });
        // Refresh patient data to update UI
        loadPatients();
      }
    } catch (error) {
      console.error('Error updating WhatsApp sent status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Seguimiento de Pacientes</h1>
          <p className="text-gray-400">
            Pacientes que requieren seguimiento según sus tratamientos
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('limpieza')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'limpieza'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Limpieza
          </button>
          <button
            onClick={() => setFilter('ortodoncia')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'ortodoncia'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Ortodoncia
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          /* Patients List */
          <div className="grid gap-4">
            {patients.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay pacientes pendientes de seguimiento
              </div>
            ) : (
              patients.map((patient) => (
                <div
                  key={patient.paciente_id}
                  className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {patient.paciente_nombre}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getFollowUpTypeColor(patient.tipo_seguimiento)}`}>
                          {getFollowUpTypeLabel(patient.tipo_seguimiento)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Teléfono:</span>
                          <span>{patient.paciente_telefono ? formatPhoneDisplay(patient.paciente_telefono) : 'No registrado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Último tratamiento:</span>
                          <span>{patient.ultimo_tratamiento}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Fecha:</span>
                          <span>{formatDate(patient.fecha_ultimo_tratamiento)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Días desde último tratamiento:</span>
                          <span className={patient.dias_ultimo_tratamiento >= 120 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                            {patient.dias_ultimo_tratamiento} días
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 self-start md:self-center">
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => handleWhatsAppSentToggle(patient)}>
                          <div className={`w-5 h-5 rounded border-2 ${patient.follow_up_status?.whatsapp_sent ? 'bg-green-600 border-green-600' : 'bg-gray-600 border-gray-600'}`}>
                            {patient.follow_up_status?.whatsapp_sent && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293 7.293a1 1 0 001.414-1.414z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-400">WhatsApp enviado</span>
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => handlePatientRespondedToggle(patient)}>
                          <div className={`w-5 h-5 rounded border-2 ${patient.follow_up_status?.patient_responded ? 'bg-green-600 border-green-600' : 'bg-gray-600 border-gray-600'}`}>
                            {patient.follow_up_status?.patient_responded && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293 7.293a1 1 0 001.414-1.414z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-400">Paciente respondió</span>
                        </div>
                      </div>

                      {patient.paciente_telefono && (
                        <button
                          onClick={() => handleWhatsAppClick(patient)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientFollowUpPage() {
  return (
    <PatientFollowUpPageContent />
  );
}
