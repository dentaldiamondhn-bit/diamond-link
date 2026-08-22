'use client';

import React, { useState, useEffect } from 'react';
import { PatientService } from '@/services/patientService';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatPhoneDisplay, createWhatsAppUrl } from '@/utils/phoneUtils';

interface PatientOverviewModalProps {
  pacienteId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface OdontogramStats {
  total_versions: number;
  latest_version: { version: number; fecha_creacion: string; fecha_odontograma?: string | null } | null;
  status_counts: Record<string, number>;
}

interface TreatmentStats {
  total_treatments: number;
  total_amount_paid: number;
  total_amount_billed: number;
  total_discount: number;
  treatments_by_status: { pendiente_firma: number; firmado: number; pagado: number };
  latest_treatment_date: string | null;
  currency: string;
}

interface TreatmentRow {
  id: string;
  fecha_cita: string;
  total_final: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: string;
  moneda: string;
  treatment_names: string;
}

const TOOTH_STATE_LABELS: Record<string, { label: string; color: string }> = {
  sano: { label: 'Sano', color: 'bg-green-100 text-green-700' },
  cariado: { label: 'Cariado', color: 'bg-red-100 text-red-700' },
  amalgama: { label: 'Restauración Amalgama', color: 'bg-gray-100 text-gray-700' },
  resina: { label: 'Restauración Resina', color: 'bg-blue-100 text-blue-700' },
  obturado: { label: 'Obturado', color: 'bg-blue-100 text-blue-700' },
  extraccionind: { label: 'Extracción indicada', color: 'bg-gray-100 text-gray-700' },
  ausente: { label: 'Ausente', color: 'bg-gray-100 text-gray-500' },
  corona: { label: 'Corona', color: 'bg-yellow-100 text-yellow-700' },
  protesis: { label: 'Prótesis', color: 'bg-purple-100 text-purple-700' },
  puente: { label: 'Puente', color: 'bg-purple-100 text-purple-700' },
  implante: { label: 'Implante', color: 'bg-cyan-100 text-cyan-700' },
  endodoncia: { label: 'Endodoncia', color: 'bg-orange-100 text-orange-700' },
  fracturado: { label: 'Fracturado', color: 'bg-red-100 text-red-600' },
  sellante: { label: 'Sellante', color: 'bg-teal-100 text-teal-700' },
  txpulpar: { label: 'Trat. pulpar', color: 'bg-blue-100 text-blue-700' },
  movilidad: { label: 'Movilidad', color: 'bg-yellow-200 text-yellow-800' },
  fistula: { label: 'Fístula', color: 'bg-rose-100 text-rose-700' },
  raiz: { label: 'Raíz Residual', color: 'bg-indigo-100 text-indigo-700' },
  apilado: { label: 'Apiñamiento', color: 'bg-gray-200 text-gray-700' },
  erupcion: { label: 'En Erupción', color: 'bg-orange-200 text-orange-800' },
  odontopatia: { label: 'Odontopatía', color: 'bg-lime-100 text-lime-700' },
  carilla: { label: 'Carilla', color: 'bg-cyan-100 text-cyan-700' },
  temporal: { label: 'Restauración Temporal', color: 'bg-purple-100 text-purple-700' },
  'caries-restauracion': { label: 'Restauración con Caries', color: 'bg-amber-100 text-amber-700' },
  atricion: { label: 'Atrición', color: 'bg-yellow-100 text-yellow-700' },
  erosion: { label: 'Erosión', color: 'bg-orange-100 text-orange-700' },
  abfraccion: { label: 'Abfracción', color: 'bg-purple-100 text-purple-700' },
  abrasion: { label: 'Abrasión', color: 'bg-blue-100 text-blue-700' },
  caries: { label: 'Cariado', color: 'bg-red-100 text-red-700' },
  extraccion: { label: 'Extracción', color: 'bg-gray-100 text-gray-700' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pagado: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
  parcialmente_pagado: { label: 'Parcial', color: 'bg-amber-100 text-amber-700' },
  pendiente: { label: 'Pendiente', color: 'bg-red-100 text-red-700' },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PatientOverviewModal({ pacienteId, isOpen, onClose }: PatientOverviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [odontogramStats, setOdontogramStats] = useState<OdontogramStats | null>(null);
  const [treatmentStats, setTreatmentStats] = useState<TreatmentStats | null>(null);
  const [recentTreatments, setRecentTreatments] = useState<TreatmentRow[]>([]);

  useEffect(() => {
    if (!isOpen || !pacienteId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [patientData, odontStats, treatStats] = await Promise.all([
          PatientService.getPatientById(pacienteId).catch(() => null),
          OdontogramPilotService.getPatientOdontogramStatistics(pacienteId).catch(() => null),
          CompletedTreatmentService.getPatientTreatmentStatistics(pacienteId).catch(() => null),
        ]);

        setPatient(patientData);
        setOdontogramStats(odontStats);
        setTreatmentStats(treatStats);

        // Fetch last 5 treatments with their line items
        // API returns array directly, not wrapped in {data: [...]}
        const treatmentsRes = await fetch(
          `/api/tratamientos-completados?paciente_id=${pacienteId}`
        ).then(r => r.json()).catch(() => []);

        const treatments = Array.isArray(treatmentsRes) ? treatmentsRes : [];

        if (treatments.length > 0) {
          const sorted = [...treatments]
            .sort((a: any, b: any) => new Date(b.fecha_cita).getTime() - new Date(a.fecha_cita).getTime())
            .slice(0, 5);

          const rows: TreatmentRow[] = sorted.map((t: any) => {
            const names = t.tratamientos_realizados
              ?.map((tr: any) => tr.nombre_tratamiento)
              .join(', ') || 'Sin detalles';
            return {
              id: t.id,
              fecha_cita: t.fecha_cita,
              total_final: parseFloat(t.total_final || '0'),
              monto_pagado: parseFloat(t.monto_pagado || '0'),
              saldo_pendiente: parseFloat(t.saldo_pendiente || '0'),
              estado_pago: t.estado_pago || 'pendiente',
              moneda: t.moneda || 'HNL',
              treatment_names: names,
            };
          });
          setRecentTreatments(rows);
        }
      } catch (err) {
        console.error('Error loading patient overview:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, pacienteId]);

  if (!isOpen) return null;

  const totalTeeth = odontogramStats
    ? Object.values(odontogramStats.status_counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-500 to-blue-500">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-lg font-bold text-white truncate">
                  {patient?.nombre_completo || 'Paciente'}
                </h2>
                <div className="flex items-center gap-3 text-sm text-white/80 mt-0.5">
                  {patient?.telefono && (
                    <a
                      href={createWhatsAppUrl(patient.telefono, '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {formatPhoneDisplay(patient.telefono)}
                    </a>
                  )}
                  {patient?.edad && <span>Edad: {patient.edad}</span>}
                  {patient?.numero_identidad && <span>ID: {patient.numero_identidad}</span>}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Odontogram Summary */}
              <Section title="Odontograma" icon="🦷">
                {odontogramStats ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span>{odontogramStats.total_versions} versión(es)</span>
                      {odontogramStats.latest_version && (
                        <>
                          <span>·</span>
                          <span>v{odontogramStats.latest_version.version}</span>
                          <span>·</span>
                          <span>{formatDate(odontogramStats.latest_version.fecha_odontograma || odontogramStats.latest_version.fecha_creacion)}</span>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {Object.entries(odontogramStats.status_counts)
                        .filter(([, count]) => count > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([state, count]) => {
                          const cfg = TOOTH_STATE_LABELS[state] || { label: state, color: 'bg-gray-100 text-gray-600' };
                          return (
                            <div key={state} className={`rounded-lg px-3 py-2 text-center ${cfg.color}`}>
                              <div className="text-lg font-bold">{count}</div>
                              <div className="text-xs">{cfg.label}</div>
                            </div>
                          );
                        })}
                    </div>
                    {totalTeeth > 0 && (
                      <div className="mt-3 text-xs text-gray-400 text-right">{totalTeeth} dientes registrados</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sin odontograma registrado</p>
                )}
              </Section>

              {/* Payments Summary */}
              <Section title="Pagos" icon="💰">
                {treatmentStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatBox
                      label="Tratamientos"
                      value={treatmentStats.total_treatments.toString()}
                      color="text-gray-900 dark:text-white"
                    />
                    <StatBox
                      label="Total facturado"
                      value={formatCurrency(treatmentStats.total_amount_billed, treatmentStats.currency as any)}
                      color="text-gray-900 dark:text-white"
                    />
                    <StatBox
                      label="Total pagado"
                      value={formatCurrency(treatmentStats.total_amount_paid, treatmentStats.currency as any)}
                      color="text-green-600"
                    />
                    <StatBox
                      label="Saldo pendiente"
                      value={formatCurrency(
                        treatmentStats.total_amount_billed - treatmentStats.total_amount_paid,
                        treatmentStats.currency as any
                      )}
                      color={
                        treatmentStats.total_amount_billed - treatmentStats.total_amount_paid > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sin tratamientos registrados</p>
                )}
              </Section>

              {/* Last Treatments */}
              <Section title="Últimos Tratamientos" icon="📋">
                {recentTreatments.length > 0 ? (
                  <div className="space-y-2">
                    {recentTreatments.map(t => {
                      const statusCfg = PAYMENT_STATUS_LABELS[t.estado_pago] || PAYMENT_STATUS_LABELS.pendiente;
                      return (
                        <div
                          key={t.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {t.treatment_names}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatDate(t.fecha_cita)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(t.total_final, t.moneda as any)}
                              </div>
                              {t.saldo_pendiente > 0 && (
                                <div className="text-xs text-red-500">
                                  Saldo: {formatCurrency(t.saldo_pendiente, t.moneda as any)}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sin tratamientos recientes</p>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
