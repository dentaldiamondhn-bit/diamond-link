'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { PatientService } from '@/services/patientService';
import { supabase } from '@/lib/supabase';
import { formatPhoneDisplay } from '@/utils/phoneUtils';
import { Patient } from '@/types/patient';
import {
  useChartStore,
  useOverlayStore,
} from '@/lib/store';
import { ChartData, CHART_TEMPLATE, ALL_TEETH, FDIToothNumber, ActiveIndices } from '@/lib/types';
import { buildChartDataFromStudy } from '@/lib/utils/studyToChart';
import {
  AnalysisModal,
  CalibrationModal,
  ClassificationModal,
  IntervalModal,
  JawChart,
  LeftActionPanel,
  QrModal,
  RightClinicalPanel,
  SummaryModal,
  ThreeDModal,
} from '@/components/periodontal';
import type { ClinicalModalKey } from '@/components/periodontal';
import { Button, Input } from '@/components/ui';
import { Plus, ChevronLeft, ChevronDown, ChevronUp, Save, Trash2, Eye, Edit } from 'lucide-react';

function EstudioPeriodontalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [savedStudies, setSavedStudies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'saved'>('chart');
  const [readOnly, setReadOnly] = useState(false);
  const [datosCollapsed, setDatosCollapsed] = useState(false);
  const [openModal, setOpenModal] = useState<ClinicalModalKey | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const pacienteId = searchParams.get('paciente_id');

  const {
    chartData,
    isGmInverted,
    activeRemoteControl,
    isOverlayMode,
    reset,
    initializeFromPatient,
    loadFromApiData,
    updateField,
    setChartData,
    collectDataAsJson,
  } = useChartStore();

  const { overlayData, setOverlayData, clearOverlay } = useOverlayStore();

  const loadSavedStudies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(pacienteId && { paciente_id: pacienteId }),
        ...(searchTerm && { search: searchTerm }),
        ...(dateFilter && { date: dateFilter })
      });

      const response = await fetch(`/api/estudios-periodontales?${params}`);
      if (!response.ok) throw new Error('Failed to fetch studies');
      
      const result = await response.json();
      setSavedStudies(result.data || []);
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, dateFilter, pacienteId, searchTerm]);

  const loadPatientData = useCallback(async () => {
    if (pacienteId) {
      try {
        const patientData = await PatientService.getPatientById(pacienteId);
        setPatient(patientData);
        initializeFromPatient(patientData.paciente_id, patientData.nombre_completo);
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setPatientLoading(false);
      }
    } else {
      setPatientLoading(false);
    }
  }, [initializeFromPatient, pacienteId]);

  useEffect(() => {
    if (pacienteId) {
      loadPatientData();
    } else {
      setPatientLoading(false);
      initializeFromPatient('new', '');
    }
  }, [initializeFromPatient, loadPatientData, pacienteId]);

  useEffect(() => {
    loadSavedStudies();
  }, [loadSavedStudies]);

  useEffect(() => {
    if (!isOverlayMode) {
      clearOverlay();
      return;
    }

    let cancelled = false;

    const loadComparisonStudy = async () => {
      if (!pacienteId) {
        clearOverlay();
        return;
      }

      try {
        const listResponse = await fetch(`/api/estudios-periodontales?paciente_id=${pacienteId}&limit=10`);
        if (!listResponse.ok) throw new Error('Failed to fetch studies');
        const listResult = await listResponse.json();
        const previousStudy = (listResult.data || [])[0];

        if (!previousStudy) {
          clearOverlay();
          return;
        }

        const detailResponse = await fetch(`/api/estudios-periodontales/${previousStudy.id}`);
        if (!detailResponse.ok) throw new Error('Failed to fetch study detail');
        const detailResult = await detailResponse.json();
        const study = detailResult.data || detailResult;

        if (!cancelled) {
          setOverlayData(buildChartDataFromStudy(study));
        }
      } catch (error) {
        console.error('Error loading comparison study:', error);
        if (!cancelled) clearOverlay();
      }
    };

    loadComparisonStudy();

    return () => {
      cancelled = true;
    };
  }, [clearOverlay, isOverlayMode, pacienteId, setOverlayData]);

  // Auto-populate Odontólogo: patient's assigned doctor (doctor / otro_doctor
  // columns from patient-form) wins; fall back to the authenticated doctor's
  // name resolved through doctors.user_email. Editable afterwards, and never
  // clobbers a value the clinician (or a loaded study) already set.
  const assignedPatientDoctor = patient
    ? (patient.doctor && patient.doctor !== 'otro'
        ? patient.doctor
        : (patient.otro_doctor || '').trim())
    : '';

  useEffect(() => {
    if (!patient) return;
    if (useChartStore.getState().chartData.clinician) return;

    if (assignedPatientDoctor) {
      updateField('clinician', assignedPatientDoctor);
      return;
    }

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('doctors')
          .select('name')
          .eq('user_email', email)
          .single();
        if (!cancelled && data?.name && !useChartStore.getState().chartData.clinician) {
          useChartStore.getState().updateField('clinician', data.name);
        }
      } catch {
        // Non-blocking: leave Odontólogo empty if the lookup fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignedPatientDoctor, patient, updateField, user]);

  const handleInputChange = (field: string, value: any) => {
    updateField(field, value);
  };

  const handleExportJson = () => {
    const data = collectDataAsJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estudio-periodontal-${chartData.patient_number || 'paciente'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      try {
        const parsed = JSON.parse(String(loadEvent.target?.result ?? '{}'));
        setChartData(parsed);
        setReadOnly(false);
      } catch {
        alert('El archivo seleccionado no contiene un JSON válido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const currentState = useChartStore.getState();
    const patientId = pacienteId || currentState.chartData.patient_number;
    
    if (!patientId || patientId === 'new') {
      alert('Por favor seleccione un paciente antes de crear el estudio periodontal.');
      return;
    }
    
    if (!confirm('¿Está seguro que desea guardar este estudio periodontal?')) {
      return;
    }

    try {
      const payload = currentState.prepareApiPayload();
      
      const response = await fetch('/api/estudios-periodontales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save study');
      }

      await response.json();
      alert('Estudio periodontal guardado correctamente');
      
      reset();
      setActiveTab('saved');
      loadSavedStudies();
      
    } catch (error) {
      console.error('Error al guardar el estudio:', error);
      alert('Ocurrió un error al guardar el estudio: ' + (error as Error).message);
    }
  };

  const filteredStudies = savedStudies.filter(study => {
    const fecha = study.fecha_estudio || '';
    const notas = study.observaciones_generales || '';
    const matchesSearch = !searchTerm ||
      fecha.includes(searchTerm) ||
      notas.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || fecha === dateFilter;
    return matchesSearch && matchesDate;
  });

  const studiesPerPage = 10;
  const totalPages = Math.ceil(filteredStudies.length / studiesPerPage);
  const currentStudies = filteredStudies.slice(
    (currentPage - 1) * studiesPerPage,
    currentPage * studiesPerPage
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const loadStudy = async (studyId: string, readOnly: boolean) => {
    try {
      const response = await fetch(`/api/estudios-periodontales/${studyId}`);
      if (!response.ok) throw new Error('Failed to fetch study');
      const result = await response.json();
      const study = result.data || result;

      loadFromApiData(study);
      setReadOnly(readOnly);
      setActiveTab('chart');
    } catch (error) {
      console.error('Error loading study:', error);
      alert('Ocurrió un error al cargar el estudio: ' + (error as Error).message);
    }
  };

  const deleteStudy = async (studyId: string) => {
    if (!confirm('¿Está seguro que desea eliminar este estudio periodontal?')) return;

    try {
      const response = await fetch(`/api/estudios-periodontales/${studyId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete study');
      loadSavedStudies();
    } catch (error) {
      console.error('Error deleting study:', error);
      alert('Ocurrió un error al eliminar el estudio: ' + (error as Error).message);
    }
  };

  const compactLabelClass = 'block text-[11px] font-medium text-gray-400 mb-1';
  const slimInputClass = 'h-8 text-xs px-2.5 py-1 w-full';
  const dateInputClass =
    'h-8 text-xs px-2.5 py-1 w-full dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100';
  const phoneDisplay = patient?.telefono
    ? patient.telefono.trim().startsWith('+')
      ? patient.telefono
      : formatPhoneDisplay(patient.telefono, (patient.codigopais || '504').replace(/^\+/, ''))
    : '–';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { id: 'chart' as const, label: 'Nuevo Estudio' },
          { id: 'saved' as const, label: 'Estudios Guardados' },
        ]).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'saved' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar</label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Fecha u observaciones..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={loadSavedStudies}>
                Actualizar
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Fecha</th>
                  <th className="px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Observaciones</th>
                  <th className="px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500">Cargando...</td>
                  </tr>
                ) : currentStudies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No se encontraron estudios periodontales.</td>
                  </tr>
                ) : currentStudies.map(study => (
                  <tr key={study.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{formatDate(study.fecha_estudio)}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600">{study.observaciones_generales || '-'}</td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadStudy(study.id, true)}>
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => loadStudy(study.id, false)}>
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteStudy(study.id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">Pagina {currentPage} de {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="mb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Datos del Estudio</h3>
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-xs text-gray-500 dark:text-gray-400">
                {patient ? `${patient.nombre_completo}${chartData.date ? ` · ${chartData.date}` : ''}` : 'Sin paciente'}
              </span>
              <button
                type="button"
                onClick={() => setDatosCollapsed(value => !value)}
                className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                title={datosCollapsed ? 'Mostrar datos del estudio' : 'Ocultar datos del estudio'}
              >
                {datosCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {datosCollapsed ? 'Mostrar' : 'Ocultar'}
              </button>
            </div>
          </div>

          {!datosCollapsed && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className={compactLabelClass}>Paciente</label>
                {patientLoading ? (
                  <div className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                ) : patient ? (
                  <div className="flex h-8 items-center overflow-hidden rounded border border-gray-300 bg-gray-50 px-2.5 dark:border-gray-600 dark:bg-gray-700">
                    <p className="min-w-0 truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                      {patient.nombre_completo}
                    </p>
                  </div>
                ) : (
                  <Input placeholder="Seleccione un paciente" disabled className={slimInputClass} />
                )}
              </div>
              <div>
                <label className={compactLabelClass}>DNI</label>
                <div className="flex h-8 items-center overflow-hidden rounded border border-gray-300 bg-gray-50 px-2.5 dark:border-gray-600 dark:bg-gray-700">
                  <p className="truncate text-xs text-gray-900 dark:text-gray-100">{patient?.numero_identidad || '–'}</p>
                </div>
              </div>
              <div>
                <label className={compactLabelClass}>Teléfono</label>
                <div className="flex h-8 items-center overflow-hidden rounded border border-gray-300 bg-gray-50 px-2.5 dark:border-gray-600 dark:bg-gray-700">
                  <p className="truncate whitespace-nowrap text-xs text-gray-900 dark:text-gray-100">{phoneDisplay}</p>
                </div>
              </div>
              <div>
                <label className={compactLabelClass}>Fecha</label>
                <Input
                  type="date"
                  value={chartData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={readOnly}
                  className={dateInputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={compactLabelClass}>Odontólogo</label>
                <Input
                  value={chartData.clinician}
                  onChange={(e) => handleInputChange('clinician', e.target.value)}
                  disabled={readOnly}
                  className={slimInputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={compactLabelClass}>Objetivo del Estudio</label>
                <Input
                  value={chartData.objetivo_estudio || ''}
                  onChange={(e) => handleInputChange('objetivo_estudio', e.target.value)}
                  disabled={readOnly}
                  placeholder="Objetivo del estudio..."
                  className={slimInputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Estado Periodontal</h2>
            {isOverlayMode && (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                Comparativa activa - edición bloqueada
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            <LeftActionPanel
              onSave={handleFormSubmit}
              onExport={handleExportJson}
              onImport={() => importInputRef.current?.click()}
              disabled={readOnly}
            />

            <div className="min-w-0 flex-1" style={{ maxWidth: '1100px' }}>
              <JawChart
                data={chartData}
                isGmInverted={isGmInverted}
                activeRemoteControl={activeRemoteControl}
                overlayData={overlayData}
                readOnly={readOnly}
              />
            </div>

            <RightClinicalPanel onOpenModal={setOpenModal} />
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJson}
            className="hidden"
          />
      </div>

      <div className="space-y-6">

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Observaciones Generales</h3>
          <textarea
            value={chartData.observaciones_generales || ''}
            onChange={(e) => handleInputChange('observaciones_generales', e.target.value)}
            disabled={readOnly}
            rows={4}
            placeholder="Observaciones generales del estudio..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white disabled:opacity-60"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan de Tratamiento</h3>
          <div className="space-y-2">
            {[
              { key: 'profilaxis', label: 'Profilaxis' },
              { key: 'raspaje', label: 'Raspado y Alisado Radicular' },
              { key: 'cirugia', label: 'Cirugía Periodontal' },
              { key: 'mantenimiento', label: 'Mantenimiento Periodontal' },
              { key: 'otro', label: 'Otro' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chartData.plan_tratamiento?.[item.key] || false}
                  onChange={(e) => handleInputChange(`plan_tratamiento.${item.key}`, e.target.checked)}
                  disabled={readOnly}
                  className="h-4 w-4 text-teal-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              </label>
            ))}
            {chartData.plan_tratamiento?.otro && (
              <Input
                value={chartData.plan_tratamiento?.otroEspecificar || ''}
                onChange={(e) => handleInputChange('plan_tratamiento.otroEspecificar', e.target.value)}
                disabled={readOnly}
                placeholder="Especificar otro tratamiento..."
                className="w-full"
              />
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={() => router.push('/menu-navegacion')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver al Menú
          </Button>
          <div className="flex items-center gap-2">
            {readOnly && (
              <Button variant="outline" onClick={() => setReadOnly(false)}>
                <Edit className="w-4 h-4 mr-2" />
                Habilitar Edición
              </Button>
            )}
            <Button onClick={handleFormSubmit} disabled={readOnly}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Estudio
            </Button>
          </div>
        </div>
      </div>
      </>
      )}

      <SummaryModal open={openModal === 'summary'} onOpenChange={open => !open && setOpenModal(null)} />
      <AnalysisModal open={openModal === 'analysis'} onOpenChange={open => !open && setOpenModal(null)} />
      <ClassificationModal
        open={openModal === 'classification'}
        onOpenChange={open => !open && setOpenModal(null)}
      />
      <IntervalModal open={openModal === 'interval'} onOpenChange={open => !open && setOpenModal(null)} />
      <ThreeDModal open={openModal === 'three-d'} onOpenChange={open => !open && setOpenModal(null)} />
      <QrModal open={openModal === 'qr'} onOpenChange={open => !open && setOpenModal(null)} />
      <CalibrationModal
        open={openModal === 'calibration'}
        onOpenChange={open => !open && setOpenModal(null)}
      />
    </div>
  );
}

export default function EstudioPeriodontal() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Cargando...</div></div>}>
      <EstudioPeriodontalContent />
    </Suspense>
  );
}