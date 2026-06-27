'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientService } from '@/services/patientService';
import { ExportService } from '@/services/exportService';
import { Patient } from '@/types/patient';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { getPatientType } from '@/utils/patientTypeUtils';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import HistoricalBanner from '@/components/HistoricalBanner';
import AnimatedWhatsApp from '@/components/AnimatedWhatsApp';
import AnimatedUser from '@/components/AnimatedUser';
import DocumentDisplay from '@/components/DocumentDisplay';
import MedicalWarningModal from '@/components/MedicalWarningModal';
import { 
  User, Phone, Mail, MapPin, Heart, Activity, Coffee, 
  FileText, Edit3, ArrowLeft, Download, Printer, 
  AlertTriangle, Calendar, Clock, Stethoscope, Smile,
  Utensils, ClipboardList, Signature
} from 'lucide-react';

// Isolated component to prevent authentication conflicts
const IsolatedDocumentDisplay: React.FC<{ documents: string[], patientId: string }> = React.memo(({ documents, patientId }) => {
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
      removable={false}
    />
  );
});

IsolatedDocumentDisplay.displayName = 'IsolatedDocumentDisplay';

export default function PatientPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientType, setPatientType] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'medical' | 'dental' | 'habits' | 'docs'>('personal');

  const { bypassHistoricalMode, setBypassHistoricalMode, loadPatientSettings, savePatientSettings } = useHistoricalMode();

  // Function to load historical mode setting from Supabase
  const loadHistoricalModeSetting = React.useCallback(async () => {
    try {
      const pacienteId = params.id;
      if (!pacienteId || !isLoaded || !user) return;
      
      const [globalResult, patientResult] = await Promise.allSettled([
        supabase
          .from('app_configuration')
          .select('config_value')
          .eq('config_key', 'historical_records_enabled')
          .single(),
        supabase
          .from('historical_mode_settings')
          .select('bypass_historical_mode')
          .eq('clerk_user_id', user.id)
          .eq('patient_id', pacienteId)
          .single()
      ]);
      
      let globalBypass = false;
      if (globalResult.status === 'fulfilled' && globalResult.value.data) {
        globalBypass = globalResult.value.data.config_value !== 'true';
      }
      
      if (patientResult.status === 'fulfilled' && patientResult.value.data) {
        setBypassHistoricalMode(patientResult.value.data.bypass_historical_mode);
      } else {
        setBypassHistoricalMode(globalBypass);
      }
    } catch (error) {
      console.error('Unexpected error loading historical mode setting:', error);
      setBypassHistoricalMode(false);
    }
  }, [params.id, isLoaded, user, setBypassHistoricalMode]);

  const fetchPatient = React.useCallback(async (id: string) => {
    try {
      const patientData = await PatientService.getPatientById(id);
      setPatient(patientData);
      
      const patientTypeData = getPatientType(patientData);
      
      if (patientData.sexo === 'femenino' && patientData.embarazo === 'si') {
        patientTypeData.colors = {
          header: 'from-pink-500 to-blue-500',
          badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
          badgeText: 'border-pink-200 text-pink-700 dark:text-pink-300'
        };
        patientTypeData.label = 'Embarazada';
      }
      
      setPatientType(patientTypeData);
      await loadPatientSettings(patientData.paciente_id!);
      
      const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio || patientData.fecha_inicio_consulta);
      setRecordCategoryInfo(categoryInfo);
      
      // Show warning modal if significant conditions exist
      const hasSignificantConditions = 
        (patientData.enfermedades && !/^(na|n\/a|no|ningun.*|sin.*|negado|niega|desconoce)$/i.test(patientData.enfermedades.trim())) ||
        (patientData.alergias && !/^(na|n\/a|no|ningun.*|sin.*|negado|niega|desconoce)$/i.test(patientData.alergias.trim())) ||
        (patientData.medicamentos && !/^(na|n\/a|no|ningun.*|sin.*|negado|niega|desconoce)$/i.test(patientData.medicamentos.trim())) ||
        (patientData.sexo === 'femenino' && patientData.embarazo === 'si');
      
      if (hasSignificantConditions) setShowWarningModal(true);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('No se pudo cargar la información del paciente');
    } finally {
      setLoading(false);
    }
  }, [loadPatientSettings]);

  useEffect(() => {
    if (params.id && isLoaded) {
      fetchPatient(params.id as string);
      loadHistoricalModeSetting();
    }
  }, [params.id, isLoaded, fetchPatient, loadHistoricalModeSetting]);

  const handlePrint = () => patient && ExportService.exportToPDF(patient);

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    if (!patient) return;
    if (format === 'pdf') ExportService.exportToPDF(patient);
    else if (format === 'html') ExportService.exportToHTML(patient);
    else if (format === 'json') ExportService.exportToJSON(patient);
    setShowExportModal(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : name[0];
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 animate-pulse font-medium">Cargando información del paciente...</p>
    </div>
  );

  if (error || !patient) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <AlertTriangle className="w-16 h-16 text-red-500" />
      <h3 className="text-2xl font-bold">Error</h3>
      <p className="text-gray-600">{error || 'No se encontró el paciente'}</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
    </div>
  );

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'medical', label: 'Médica', icon: Heart },
    { id: 'dental', label: 'Dental', icon: Stethoscope },
    { id: 'habits', label: 'Hábitos', icon: Coffee },
    { id: 'docs', label: 'Documentos', icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Vista Previa</h1>
            <p className="text-xs text-gray-500">#{patient.paciente_id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push(`/patient-form?id=${params.id}`)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-blue-700">
            <Edit3 className="w-4 h-4" /> Editar
          </button>
          <button onClick={() => router.push(`/menu-navegacion?id=${patient.paciente_id}`)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-emerald-700">
            <ArrowLeft className="w-4 h-4" /> Menú
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-violet-700">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-gray-700">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Patient Hero Card */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${patientType?.colors?.header || 'from-teal-500 to-cyan-500'} rounded-3xl shadow-xl p-6 md:p-10 text-white`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-white/20 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 text-4xl font-bold">
            {getInitials(patient.nombre_completo)}
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">{patient.nombre_completo}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md flex items-center gap-2">
                <User className="w-4 h-4" /> {patient.numero_identidad}
              </span>
              {patient.telefono && (
                <a href={createWhatsAppUrl(patient.telefono, patient.pais_codigo || '504')} target="_blank" rel="noopener noreferrer" className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md flex items-center gap-2 hover:bg-white/30 transition-all">
                  <Phone className="w-4 h-4" /> {formatPhoneDisplay(patient.telefono, patient.pais_codigo || '504')}
                </a>
              )}
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {patient.edad} años
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="bg-white/20 px-6 py-2 rounded-2xl font-bold backdrop-blur-md border border-white/30 shadow-lg">
              {patientType?.label || 'Adulto'}
            </div>
            {recordCategoryInfo?.isHistorical && !bypassHistoricalMode && (
              <div className="bg-amber-400 text-amber-950 px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                REGISTRO HISTÓRICO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Banner */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={patient?.paciente_id}
        onBypassChange={savePatientSettings}
        loading={false}
        compact={true}
      />

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8 min-h-[400px]">
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Información Básica" icon={User}>
              <Detail label="Nombre Completo" value={patient.nombre_completo} />
              <Detail label="Identificación" value={`${patient.tipo_identificacion}: ${patient.numero_identidad}`} />
              <Detail label="Fecha de Nacimiento" value={patient.fecha_nacimiento} />
              <Detail label="Edad" value={`${patient.edad} años ${patient.edad_al_momento_consulta ? `(Consulta: ${patient.edad_al_momento_consulta} años)` : ''}`} />
              <Detail label="Sexo" value={patient.sexo} />
              <Detail label="Tipo de Sangre" value={patient.tipo_sangre} />
              <Detail label="Estado Civil" value={patient.estado_civil} />
            </Section>
            <Section title="Contacto y Ubicación" icon={MapPin}>
              <Detail label="Teléfono" value={patient.telefono} isPhone />
              <Detail label="Email" value={patient.email} />
              <Detail label="Dirección" value={patient.direccion} />
              <Detail label="Trabajo / Escolaridad" value={`${patient.trabajo || 'N/A'} / ${patient.escolaridad || 'N/A'}`} />
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                <Detail label="Contacto Emergencia" value={patient.contacto_emergencia} />
                <Detail label="Teléfono Emergencia" value={patient.contacto_telefono} isPhone />
              </div>
            </Section>
            {patient.representante_legal && (
              <Section title="Representante Legal" icon={Signature}>
                <Detail label="Nombre" value={patient.representante_legal} />
                <Detail label="Parentesco" value={patient.parentesco} />
                <Detail label="Teléfono" value={patient.rep_celular} isPhone />
              </Section>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Antecedentes Médicos" icon={Heart}>
              <Detail label="Enfermedades" value={patient.enfermedades} highlight={!!patient.enfermedades} />
              <Detail label="Alergias" value={patient.alergias} highlight={!!patient.alergias} />
              <Detail label="Medicamentos" value={patient.medicamentos} highlight={!!patient.medicamentos} />
              <Detail label="Hospitalizaciones" value={patient.hospitalizaciones} />
              <Detail label="Cirugías" value={patient.cirugias} />
            </Section>
            <Section title="Otros Datos" icon={Activity}>
              <Detail label="Embarazo" value={patient.embarazo === 'si' ? `Sí (${patient.semanas_embarazo || '?'} semanas)` : 'No'} />
              <Detail label="Antecedentes Familiares" value={patient.antecedentes_familiares} />
              <Detail label="Vacunas" value={patient.vacunas} />
              <Detail label="Observaciones Médicas" value={patient.observaciones_medicas} />
            </Section>
          </div>
        )}

        {activeTab === 'dental' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Evaluación Inicial" icon={ClipboardList}>
              <Detail label="Motivo de Consulta" value={patient.motivo} />
              <Detail label="Historial Dental" value={patient.historial} />
              <Detail label="Doctor Asignado" value={patient.doctor} />
              <Detail label="Fecha Inicio" value={patient.fecha_inicio} />
            </Section>
            <Section title="Síntomas y Hallazgos" icon={Smile}>
              <Detail label="Sangrado Encías" value={patient.encias} />
              <Detail label="Dolor al Masticar" value={patient.dolor} />
              <Detail label="Sensibilidad" value={`${patient.sensibilidad} ${patient.tipo_sensibilidad ? `(${patient.tipo_sensibilidad})` : ''}`} />
              <Detail label="Bruxismo" value={`${patient.bruxismo} ${patient.tipo_bruxismo ? `(${patient.tipo_bruxismo})` : ''}`} />
              <Detail label="Chasquidos Mandibulares" value={patient.chasquidos} />
            </Section>
            <Section title="Tratamientos Previos" icon={Stethoscope}>
              <Detail label="Ortodoncia" value={`${patient.ortodoncia} ${patient.orto_finalizado === 'si' ? '(Finalizado)' : ''}`} />
              <Detail label="Prótesis" value={`${patient.protesis} ${patient.protesis_tipo ? `(${patient.protesis_tipo})` : ''}`} />
              <Detail label="Última Limpieza" value={patient.ultima_limpieza} />
            </Section>
            <Section title="Plan de Tratamiento" icon={FileText}>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                {patient.observaciones_plan || 'Sin observaciones registradas'}
              </p>
            </Section>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Hábitos Sistémicos" icon={Activity}>
              <Detail label="Fuma" value={`${patient.fuma} ${patient.fuma_cantidad ? `(${patient.fuma_cantidad}/día)` : ''}`} />
              <Detail label="Alcohol" value={`${patient.alcohol} ${patient.alcohol_frecuencia ? `(${patient.alcohol_frecuencia})` : ''}`} />
              <Detail label="Drogas" value={`${patient.drogas} ${patient.tipo_droga ? `(${patient.tipo_droga})` : ''}`} />
              <Detail label="Café" value={`${patient.cafe} ${patient.cantidad_tazas ? `(${patient.cantidad_tazas} tazas)` : ''}`} />
            </Section>
            <Section title="Higiene y Dieta" icon={Utensils}>
              <Detail label="Cepillado Diario" value={`${patient.f_cepillado} veces`} />
              <Detail label="Hilo Dental / Enjuague" value={`${patient.hilo_dental} / ${patient.enjuague_bucal}`} />
              <Detail label="Dieta Cariogénica" value={`Dulces: ${patient.dulces}, Refrescos: ${patient.refrescos}`} />
              <Detail label="Hábitos Nocivos" value={`Hielo: ${patient.hielo}, Objetos: ${patient.objetos}, Succión Digital: ${patient.suction_digital}`} />
            </Section>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Firma Digital" icon={Signature}>
              {patient.firma_digital ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 inline-block shadow-sm">
                  <img src={patient.firma_digital} alt="Firma" className="max-h-40 grayscale contrast-125" />
                </div>
              ) : (
                <p className="text-gray-400 italic">No hay firma registrada</p>
              )}
            </Section>
            <Section title="Documentos Adjuntos" icon={FileText}>
              {patient.documentos && patient.documentos.length > 0 ? (
                <IsolatedDocumentDisplay documents={patient.documentos} patientId={patient.paciente_id!} />
              ) : (
                <p className="text-gray-400 italic">No hay documentos adjuntos</p>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* Modals */}
      <MedicalWarningModal patient={patient} isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} />

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-center">Exportar Registro</h3>
            <div className="space-y-3">
              <ExportButton label="PDF" icon="fa-file-pdf" color="bg-red-500" onClick={() => handleExport('pdf')} />
              <ExportButton label="HTML" icon="fa-file-code" color="bg-blue-500" onClick={() => handleExport('html')} />
              <ExportButton label="JSON" icon="fa-file-code" color="bg-green-500" onClick={() => handleExport('json')} />
              <button onClick={() => setShowExportModal(false)} className="w-full py-3 text-gray-500 font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="space-y-5">
    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest text-xs">
      <Icon className="w-4 h-4" /> {title}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const Detail = ({ label, value, isPhone, highlight }: { label: string, value: any, isPhone?: boolean, highlight?: boolean }) => {
  const displayValue = value || 'N/A';
  const isNo = displayValue === 'no' || displayValue === 'Ninguna' || displayValue === 'Ninguno';

  return (
    <div className="group">
      <dt className="text-xs font-medium text-gray-400 uppercase mb-1">{label}</dt>
      <dd className={`text-sm font-semibold ${isNo ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'} ${highlight && !isNo ? 'text-red-600 dark:text-red-400' : ''}`}>
        {isPhone && value ? (
          <a href={createWhatsAppUrl(value, '504')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal-600 hover:underline">
            <div className="w-3.5 h-3.5"><AnimatedWhatsApp /></div> {formatPhoneDisplay(value, '504')}
          </a>
        ) : (
          displayValue
        )}
      </dd>
    </div>
  );
};

const ExportButton = ({ label, icon, color, onClick }: any) => (
  <button onClick={onClick} className={`w-full ${color} text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg`}>
    <i className={`fas ${icon}`}></i> {label}
  </button>
);
