'use client';
// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { PatientService } from '@/services/patientService';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { OdontogramService } from '@/services/odontogramService';
import { consentimientoService } from '@/services/consentimientoService';
import { presupuestoService } from '@/services/presupuestoService';
import { Patient } from '@/types/patient';
import { createWhatsAppUrl, formatPhoneDisplay } from '@/utils/phoneUtils';
import { useHistoricalMode } from '@/contexts/HistoricalModeContext';
import { getRecordCategoryInfoSync } from '@/utils/recordCategoryUtils';
import { supabase } from '@/lib/supabase';
import { HistoricalModeService } from '@/services/historicalModeService';
import HistoricalBadge from '@/components/HistoricalBadge';
import MedicalWarningModal from '@/components/MedicalWarningModal';
import HistoricalBanner from '@/components/HistoricalBanner';
import Link from 'next/link';
import AnimatedWallet from '@/components/AnimatedWallet';
import AnimatedReport from '@/components/AnimatedReport';
import AnimatedWhatsApp from '@/components/AnimatedWhatsApp';
import AnimatedTratamientosCompletados from '@/components/AnimatedTratamientosCompletados';

export default function MenuNavegacion() {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [treatmentStats, setTreatmentStats] = useState<any>(null);
  const [treatmentStatsLoading, setTreatmentStatsLoading] = useState(true);
  const [odontogramStats, setOdontogramStats] = useState<any>(null);
  const [odontogramStatsLoading, setOdontogramStatsLoading] = useState(true);
  const [consentimientoStats, setConsentimientoStats] = useState<any>(null);
  const [consentimientoStatsLoading, setConsentimientoStatsLoading] = useState(true);
  const [presupuestoStats, setPresupuestoStats] = useState<any>(null);
  const [presupuestoStatsLoading, setPresupuestoStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bypassHistoricalMode, setBypassHistoricalMode, loading, setCurrentPatient, loadPatientSettings, savePatientSettings } = useHistoricalMode();
  const { isLoaded } = useUser();

  // Function to handle bypass changes using new context method
  const handleBypassChange = async (newBypassValue: boolean) => {
    try {
      const pacienteId = searchParams.get('id');
      if (pacienteId && pacienteId !== 'null' && pacienteId !== 'undefined') {
        await savePatientSettings(pacienteId, newBypassValue);
        console.log('✅ Patient bypass setting updated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to update bypass setting:', error);
      alert('Error al actualizar la configuración del modo histórico');
    }
  };

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const pacienteId = searchParams.get('id');
        
        if (!pacienteId || pacienteId === 'null' || pacienteId === 'undefined') {
          setError('ID de paciente no proporcionado');
          setPatientLoading(false);
          return;
        }

        // Load patient data
        const patientData = await PatientService.getPatientById(pacienteId);
        if (patientData) {
          setPatient(patientData);
          setCurrentPatient(pacienteId);
          
          // Check record category (historical, active, archived)
          const categoryInfo = getRecordCategoryInfoSync(patientData.fecha_inicio);
          setRecordCategoryInfo(categoryInfo);
          
          // Load patient-specific historical mode settings
          await loadPatientSettings(pacienteId);
          
          // Show warning modal using improved algorithm - only if significant conditions exist
          const hasSignificantConditions = 
            (patientData.enfermedades && patientData.enfermedades.trim() !== '' && 
               !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.enfermedades.toLowerCase().trim())) ||
            (patientData.alergias && patientData.alergias.trim() !== '' && 
               !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.alergias.toLowerCase().trim())) ||
            (patientData.medicamentos && patientData.medicamentos.trim() !== '' && 
               !['na', 'n/a', 'no', 'ninguna', 'ninguno', 'ningún', 'sin', 'sin enfermedades', 'sin alergias', 'sin medicamentos', 'sin antecedentes', 'no aplica', 'no se', 'no tiene', 'no presenta', 'no refiere', 'negado', 'niega', 'desconoce', 'no sabe', 'no recuerda'].includes(patientData.medicamentos.toLowerCase().trim())) ||
            (patientData.sexo === 'femenino' && patientData.embarazo === 'si');
          
          if (hasSignificantConditions) {
            setShowWarningModal(true);
          }
        } else {
          setError('Paciente no encontrado');
        }
      } catch (error) {
        console.error('Error loading patient:', error);
        setError('Error al cargar el paciente');
      } finally {
        setPatientLoading(false);
      }
    };

    if (isLoaded) {
      loadPatient();
    }
  }, [searchParams.get('id'), isLoaded]); // Only depend on the ID, not the entire searchParams

  useEffect(() => {
    const loadTreatmentStats = async () => {
      if (!patient) return;
      
      try {
        setTreatmentStatsLoading(true);
        const stats = await CompletedTreatmentService.getPatientTreatmentStatistics(patient.paciente_id);
        setTreatmentStats(stats);
      } catch (error) {
        console.error('Error loading treatment statistics:', error);
        setTreatmentStats(null);
      } finally {
        setTreatmentStatsLoading(false);
      }
    };

    loadTreatmentStats();
  }, [patient]);

  useEffect(() => {
    const loadOdontogramStats = async () => {
      if (!patient) return;
      
      try {
        setOdontogramStatsLoading(true);
        const stats = await OdontogramService.getPatientOdontogramStatistics(patient.paciente_id);
        setOdontogramStats(stats);
      } catch (error) {
        console.error('Error loading odontogram statistics:', error);
        setOdontogramStats(null);
      } finally {
        setOdontogramStatsLoading(false);
      }
    };

    loadOdontogramStats();
  }, [patient]);

  useEffect(() => {
    const loadConsentimientoStats = async () => {
      if (!patient) return;
      
      try {
        setConsentimientoStatsLoading(true);
        const stats = await consentimientoService.getPatientConsentimientoStatistics(patient.paciente_id);
        setConsentimientoStats(stats);
      } catch (error) {
        console.error('Error loading consentimiento statistics:', error);
        setConsentimientoStats(null);
      } finally {
        setConsentimientoStatsLoading(false);
      }
    };

    loadConsentimientoStats();
  }, [patient]);

  useEffect(() => {
    const loadPresupuestoStats = async () => {
      if (!patient) return;
      
      try {
        setPresupuestoStatsLoading(true);
        const stats = await presupuestoService.getPatientPresupuestoStatistics(patient.paciente_id);
        setPresupuestoStats(stats);
      } catch (error) {
        console.error('Error loading presupuesto statistics:', error);
        setPresupuestoStats(null);
      } finally {
        setPresupuestoStatsLoading(false);
      }
    };

    loadPresupuestoStats();
  }, [patient]);

  const calculateAge = (fechaNacimiento: string): string => {
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime())) return 'No especificada';
    
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} años`;
  };

  const getTreatmentStatsDescription = (): JSX.Element => {
    if (treatmentStatsLoading) {
      return <span className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</span>;
    }
    
    if (!treatmentStats) {
      return <span className="text-gray-500 dark:text-gray-400">No hay tratamientos registrados</span>;
    }

    const { 
      total_treatments, 
      total_amount_paid, 
      total_amount_billed, 
      total_discount, 
      currency,
      latest_treatment_date
    } = treatmentStats;

    const outstandingBalance = total_amount_billed - total_amount_paid;
    // Format currency with proper thousand separators and decimal handling
    const formatCurrency = (amount: number, currency: string) => {
      // Handle HNL (Honduran Lempira) and other currencies
      const formatter = new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      return formatter.format(amount);
    };

    const formattedPaid = formatCurrency(total_amount_paid, currency || 'USD');
    const formattedOutstanding = formatCurrency(outstandingBalance, currency || 'USD');
    const formattedSaved = formatCurrency(total_discount, currency || 'USD');

    // Format latest treatment date
    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    return (
      <div className="text-sm space-y-1">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-gray-300">
            {total_treatments} tratamiento{total_treatments !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {formattedPaid} pagado{total_amount_paid !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={outstandingBalance > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : "text-green-600 dark:text-green-400"}>
            {formattedOutstanding} pendiente{outstandingBalance !== 1 ? 's' : ''}
          </span>
        </div>
        {total_discount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Ahorró {formattedSaved}
            </span>
          </div>
        )}
        {latest_treatment_date && (
          <div className="flex items-center space-x-2">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              Último: {formatDate(latest_treatment_date)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getOdontogramDescription = (): JSX.Element => {
    if (odontogramStatsLoading) {
      return <span className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</span>;
    }
    
    if (!odontogramStats) {
      return <span className="text-gray-500 dark:text-gray-400">No hay odontogramas registrados</span>;
    }

    const { total_versions, latest_version, status_counts } = odontogramStats;

    // Format latest version date
    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    // Get all tooth states for display
    const allStates = Object.entries(status_counts)
      .filter(([_, count]: [string, number]) => count > 0)
      .sort(([stateA, countA]: [string, number], [stateB, countB]: [string, number]) => {
        // Sort by status type order: Sanos first, then others alphabetically
        const order = ['sano', 'ausente', 'caries', 'obturado', 'extraccion', 'corona', 'puente', 'implante', 'endodoncia', 'fracturado', 'sellante'];
        const aIndex = order.indexOf(stateA);
        const bIndex = order.indexOf(stateB);
        
        if (aIndex === -1 && bIndex === -1) return stateA.localeCompare(stateB);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

    const getStateLabel = (state: string) => {
      const labels: Record<string, string> = {
        sano: 'Sano',
        caries: 'Cariado',
        obturado: 'Obturado',
        extraccion: 'Extracción indicada',
        ausente: 'Ausente',
        corona: 'Corona',
        puente: 'Puente',
        implante: 'Implante',
        endodoncia: 'Endodoncia',
        fracturado: 'Fracturado',
        sellante: 'Sellante'
      };
      return labels[state] || state.charAt(0).toUpperCase() + state.slice(1);
    };

    return (
      <div className="text-sm space-y-1">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-gray-300">
            {total_versions} versión{total_versions !== 1 ? 'es' : ''}
          </span>
        </div>
        {latest_version && (
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Última: v{latest_version.version}
            </span>
          </div>
        )}
        {latest_version && (
          <div className="flex items-center space-x-2">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {formatDate(latest_version.fecha_creacion)}
            </span>
          </div>
        )}
        {allStates.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {allStates.map(([state, count]) => `${getStateLabel(state)}: ${count}`).join(' • ')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getConsentimientoDescription = (): JSX.Element => {
    if (consentimientoStatsLoading) {
      return <span className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</span>;
    }
    
    if (!consentimientoStats) {
      return <span className="text-gray-500 dark:text-gray-400">No hay consentimientos registrados</span>;
    }

    const { 
      total_consentimientos, 
      activos, 
      firmados, 
      cancelados,
      latest_consentimiento,
      consentimientos_por_tipo 
    } = consentimientoStats;

    // Format latest consentimiento date
    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    // Get top 2 most common consentimiento types for display
    const sortedTypes = Object.entries(consentimientos_por_tipo)
      .filter(([_, count]: [string, number]) => count > 0)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
      .slice(0, 2);

    const getConsentimientoTypeLabel = (tipo: string) => {
      const labels: Record<string, string> = {
        'tratamiento': 'Tratamiento',
        'extraccion': 'Extracción',
        'endodoncia': 'Endodoncia',
        'ortodoncia': 'Ortodoncia',
        'implante': 'Implante',
        'blanqueamiento': 'Blanqueamiento',
        'limpieza': 'Limpieza',
        'radiografia': 'Radiografía',
        'cirugia': 'Cirugía',
        'protesis': 'Prótesis'
      };
      return labels[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
    };

    return (
      <div className="text-sm space-y-1">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-gray-300">
            {total_consentimientos} consentimiento{total_consentimientos !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {firmados} firmados{firmados !== 1 ? 's' : ''}
          </span>
        </div>
        {activos > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {activos} activos
            </span>
          </div>
        )}
        {latest_consentimiento && (
          <div className="flex items-center space-x-2">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              Último: {formatDate(latest_consentimiento.fecha_consentimiento)}
            </span>
          </div>
        )}
        {sortedTypes.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {sortedTypes.map(([tipo, count]) => `${getConsentimientoTypeLabel(tipo)}: ${count}`).join(' • ')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getPresupuestoDescription = (): JSX.Element => {
    if (presupuestoStatsLoading) {
      return <span className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</span>;
    }
    
    if (!presupuestoStats) {
      return <span className="text-gray-500 dark:text-gray-400">No hay presupuestos registrados</span>;
    }

    const { 
      total_presupuestos, 
      pendientes, 
      aceptados, 
      rechazados,
      expirados,
      total_valor_pendiente,
      total_valor_aceptado,
      total_valor_rechazado,
      totals_by_currency,
      latest_presupuesto,
      valor_promedio
    } = presupuestoStats;

    // Format currency with proper currency detection
    const formatCurrency = (amount: number, currency: string = 'HNL') => {
      if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount);
      } else {
        return new Intl.NumberFormat('es-HN', {
          style: 'currency',
          currency: 'HNL',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount);
      }
    };

    // Helper function to render currency amounts by status
    const renderCurrencyAmounts = (status: 'pendientes' | 'aceptados' | 'rechazados') => {
      const totals = totals_by_currency[status];
      const amounts = [];
      
      if (totals.HNL > 0) {
        const colorClass = status === 'pendientes' ? 'text-blue-600 dark:text-blue-400' : 
                         status === 'aceptados' ? 'text-green-600 dark:text-green-400' : 
                         'text-orange-600 dark:text-orange-400';
        
        amounts.push(
          <span key="HNL" className={`${colorClass} font-medium`}>
            {formatCurrency(totals.HNL, 'HNL')}
          </span>
        );
      }
      
      if (totals.USD > 0) {
        const colorClass = status === 'pendientes' ? 'text-blue-600 dark:text-blue-400' : 
                         status === 'aceptados' ? 'text-green-600 dark:text-green-400' : 
                         'text-orange-600 dark:text-orange-400';
        
        amounts.push(
          <span key="USD" className={`${colorClass} font-medium`}>
            {formatCurrency(totals.USD, 'USD')}
          </span>
        );
      }
      
      if (amounts.length === 0) return null;
      
      return (
        <div className="flex items-center space-x-2">
          {amounts.map((amount, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-gray-400">•</span>}
              {amount}
            </React.Fragment>
          ))}
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            {status === 'pendientes' ? 'pendiente' : status === 'aceptados' ? 'aceptado' : 'rechazado'}
          </span>
        </div>
      );
    };

    // Format latest presupuesto date
    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    return (
      <div className="text-sm space-y-1">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-gray-300">
            {total_presupuestos} presupuesto{total_presupuestos !== 1 ? 's' : ''}
          </span>
        </div>
        {pendientes > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {aceptados > 0 && total_valor_aceptado === 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400 font-medium">
              {aceptados} aceptado{aceptados !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {rechazados > 0 && total_valor_rechazado === 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-red-600 dark:text-red-400 font-medium">
              {rechazados} rechazado{rechazados !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {total_valor_pendiente > 0 && renderCurrencyAmounts('pendientes')}
        {total_valor_aceptado > 0 && renderCurrencyAmounts('aceptados')}
        {total_valor_rechazado > 0 && renderCurrencyAmounts('rechazados')}
        {latest_presupuesto && (
          <div className="flex items-center space-x-2">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              Último: {formatDate(latest_presupuesto.quote_date)}
            </span>
          </div>
        )}
        {valor_promedio > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Promedio: {formatCurrency(valor_promedio)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const pacienteId = searchParams.get('id');
const validPacienteId = pacienteId && pacienteId !== 'null' && pacienteId !== 'undefined' ? pacienteId : '';

  // Patient type utility (same as pacientes page)
  const getPatientType = (patient: any) => {
    const calculateAge = (birthDate: string) => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const age = calculateAge(patient.fecha_nacimiento);
    const gender = patient.sexo?.toLowerCase() === 'femenino' ? 'femenino' : 'masculino';
    
    // Determine patient type based on age
    if (age < 18) {
      return {
        category: 'menor',
        label: 'Menor',
        colors: gender === 'femenino' ? {
          header: 'from-pink-500 to-pink-700',
          badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
          badgeText: 'border-pink-200 text-pink-700 dark:text-pink-300'
        } : {
          header: 'from-blue-400 to-blue-600',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          badgeText: 'border-blue-200 text-blue-700 dark:text-blue-300'
        }
      };
    } else if (age >= 80) {
      return {
        category: '4ta',
        label: '4ta',
        colors: gender === 'femenino' ? {
          header: 'from-purple-500 to-purple-700',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          badgeText: 'border-purple-200 text-purple-700 dark:text-purple-300'
        } : {
          header: 'from-gray-500 to-gray-700',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          badgeText: 'border-gray-200 text-gray-700 dark:text-gray-300'
        }
      };
    } else if (age >= 60) {
      return {
        category: '3ra',
        label: '3ra',
        colors: gender === 'femenino' ? {
          header: 'from-red-400 to-red-600',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          badgeText: 'border-red-200 text-red-700 dark:text-red-300'
        } : {
          header: 'from-yellow-500 to-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          badgeText: 'border-yellow-200 text-yellow-700 dark:text-yellow-300'
        }
      };
    } else {
      return {
        category: 'adulto',
        label: 'Adulto',
        colors: {
          header: 'from-teal-500 to-cyan-500',
          badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
          badgeText: 'border-teal-200 text-teal-700 dark:text-teal-300'
        }
      };
    }
  };

  const menuItems = [
    {
      id: 'editar-datos-btn',
      icon: 'fas fa-user-edit',
      title: 'Datos Generales',
      description: 'Actualice la información personal, contacto y antecedentes médicos del paciente.',
      href: `/patient-form?id=${validPacienteId}`
    },
    {
      id: 'registros-paciente',
      icon: 'fas fa-user-chart',
      title: 'Registros del Paciente',
      description: 'Vea los registros completos del paciente incluyendo historial de odontogramas y documentos.',
      href: `/patient-records?id=${validPacienteId}`
    },
    {
      id: 'odontograma',
      icon: 'fas fa-tooth',
      title: 'Odontograma',
      description: getOdontogramDescription(),
      href: `/odontogram?id=${validPacienteId}`
    },
    {
      id: 'estudios-ortodonticos',
      icon: 'fas fa-teeth',
      title: 'Estudios Ortodónticos',
      description: 'Gestione los estudios ortodónticos, incluyendo análisis cefalométricos y registros de tratamientos.',
      href: `/dashboard/orthodontic?id=${validPacienteId}`
    },
    {
      id: 'estudios-periodontales',
      icon: 'fas fa-teeth-open',
      title: 'Estudios Periodontales',
      description: 'Registre y gestione los estudios periodontales, incluyendo índices de placa, sangrado y profundidad de bolsas.',
      href: `/estudio-periodontal?id=${validPacienteId}`
    },
    {
      id: 'consentimientos',
      icon: 'fas fa-file-signature',
      title: 'Consentimientos',
      description: getConsentimientoDescription(),
      href: `/consentimientos?id=${validPacienteId}`
    },
    {
      id: 'presupuesto',
      icon: <AnimatedWallet className="w-4 h-4" />,
      title: 'Presupuestos',
      description: getPresupuestoDescription(),
      href: `/presupuestos?id=${validPacienteId}`
    },
    {
      id: 'reportes',
      icon: <AnimatedReport className="w-4 h-4" />,
      title: 'Reportes',
      description: 'Vea estadísticas y análisis de rendimiento de tratamientos y pacientes.',
      href: `/reports`
    },
    {
      id: 'preformas',
      icon: <AnimatedTratamientosCompletados className="w-8 h-8" />,
      title: 'Tratamientos Completados',
      description: getTreatmentStatsDescription(),
      href: `/tratamientos-completados?paciente_id=${validPacienteId}`
    },
    {
      id: 'gestion-documental',
      icon: 'fas fa-folder-open',
      title: 'Gestión Documental',
      description: 'Administre todos los documentos del paciente, incluyendo informes, radiografías y archivos adjuntos.',
      href: `/dashboard/documents?id=${validPacienteId}`
    }
  ];

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-600 dark:text-gray-400 text-xl flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
            Cargando datos del paciente...
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      {/* Patient Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {patient && (
          <>
            <div 
              className="bg-gradient-to-r p-8 text-white"
              style={{
                background: patient.sexo === 'femenino' && patient.embarazo === 'si'
                  ? 'linear-gradient(to right, rgb(236 72 153), rgb(59 130 246))' // Soft pink to blue gradient for pregnancy
                  : getPatientType(patient).category === 'menor' && patient.sexo === 'femenino' 
                  ? 'linear-gradient(to right, rgb(236 72 153), rgb(219 39 119))'
                  : getPatientType(patient).category === 'menor' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(96 165 250), rgb(59 130 246))'
                  : getPatientType(patient).category === '4ta' && patient.sexo === 'femenino'
                  ? 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))'
                  : getPatientType(patient).category === '4ta' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(107 114 128), rgb(75 85 99))'
                  : getPatientType(patient).category === '3ra' && patient.sexo === 'femenino'
                  ? 'linear-gradient(to right, rgb(248 113 113), rgb(239 68 68))'
                  : getPatientType(patient).category === '3ra' && patient.sexo === 'masculino'
                  ? 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))'
                  : 'linear-gradient(to right, rgb(20 184 166), rgb(6 182 212))'
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold flex items-center">
                  <i className="fas fa-user-injured mr-4"></i>
                  <div className="flex items-center">
                    Información del Paciente
                    <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPatientType(patient).colors.badge} border ${getPatientType(patient).colors.badgeText}`}>
                      {getPatientType(patient).label}
                    </span>
                    {/* Historical banner - only show if historical and bypass is not active */}
                    <HistoricalBadge 
                      isHistorical={recordCategoryInfo?.isHistorical} 
                      isBypassed={bypassHistoricalMode} 
                    />
                  </div>
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-teal-100 text-sm">Paciente actual:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg border border-white/30">
                      {patient?.nombre_completo?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-base font-medium text-white">{patient?.nombre_completo}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Nombre Completo</div>
                  <div className="text-lg font-bold">{patient?.nombre_completo || 'No especificado'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Número de Identidad</div>
                  <div className="text-lg font-bold">{patient?.numero_identidad || 'No especificado'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Edad</div>
                  <div className="text-lg font-bold">
                    {patient?.edad ? `${patient.edad} años` : patient?.fecha_nacimiento ? calculateAge(patient.fecha_nacimiento) : 'No especificada'}
                  </div>
                  {patient?.edad_al_momento_consulta && (
                    <div className="bg-green-100/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-green-300">
                      <div className="text-xs text-green-800 font-medium">Edad al momento</div>
                      <div className="text-lg font-bold text-green-900">
                        {patient.edad_al_momento_consulta} años
                        {patient.fecha_inicio && <span className="text-xs text-green-600 block">({new Date(patient.fecha_inicio).toLocaleDateString('es-HN')})</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-100 mb-1">Teléfono</div>
                  <div className="text-lg font-bold">
                    {patient?.telefono ? (
                      <a 
                        href={createWhatsAppUrl(patient.telefono, patient.codigopais)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-teal-100 transition-colors duration-200 flex items-center gap-2"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <AnimatedWhatsApp />
                        </div>
                        {formatPhoneDisplay(patient.telefono, patient.codigopais)}
                      </a>
                    ) : (
                      'No especificado'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Historical Mode Control */}
      <HistoricalBanner
        isHistorical={recordCategoryInfo?.isHistorical}
        isBypassed={bypassHistoricalMode}
        patientId={validPacienteId}
        onBypassChange={handleBypassChange}
        loading={loading}
      />

      {/* Navigation Menu */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Módulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/30">
                    {typeof item.icon === 'string' ? (
                      <i className={`${item.icon} text-xl`}></i>
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center">{item.icon}</div>
                    )}
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold border border-white/30">
                    Módulo
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed line-clamp-3">
                  {item.description}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    href={item.href}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm transform hover:scale-105"
                  >
                    <i className="fas fa-arrow-right mr-2"></i>
                    {item.id === 'editar-datos-btn' ? 'Editar Datos' : 
                     item.id === 'registros-paciente' ? 'Ver Registros' :
                     item.id === 'odontograma' ? 'Ir al Odontograma' :
                     item.id === 'estudios-ortodonticos' ? 'Ir a Estudios Ortodónticos' :
                     item.id === 'estudios-periodontales' ? 'Ir a Estudios Periodontales' :
                     item.id === 'consentimientos' ? 'Consentimientos' :
                     item.id === 'presupuesto' ? 'Ir a Presupuestos' :
                     item.id === 'preformas' ? 'Ver Tratamientos' :
                     item.id === 'reportes' ? 'Ver Reportes' :
                     item.id === 'gestion-documental' ? 'Ir a Documentos' : 'Ir'}
                  </Link>
                  {item.id === 'consentimientos' && (
                    <Link
                      href={`/consentimientos/new?id=${validPacienteId}`}
                      className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm transform hover:scale-105"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Crear
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8 text-center">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-base"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Volver
        </button>
      </div>

      {/* Improved Medical Warning Modal */}
      <MedicalWarningModal 
        patient={patient}
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      />
    </>
  );
}
