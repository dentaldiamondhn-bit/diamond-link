'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  Info,
  PenLine,
  Phone,
  Plus,
  StickyNote,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, Currency } from '../../../../../utils/currencyUtils';
import { formatDateForDisplay } from '../../../../../utils/dateUtils';
import { SimpleTimezoneFix } from '../../../../../services/simpleTimezoneFix';
import { Patient } from '../../../../../types/patient';
import SignatureDisplay from '../../../../../components/SignatureDisplay';
import { CompletedTreatmentService } from '../../../../../services/completedTreatmentService';
import { useHistoricalMode } from '../../../../../contexts/HistoricalModeContext';
import { getRecordCategoryInfo, type HistoricalRecordInfo } from '../../../../../utils/recordCategoryUtils';
import HistoricalBanner from '../../../../../components/HistoricalBanner';
import StatusBadge from '../../../../../components/tratamientos-completados/StatusBadge';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  GLASS_DIVIDER,
  GLASS_FIELD_LABEL,
  GLASS_HEADING,
  GLASS_INSET,
  GLASS_MUTED,
  GLASS_PANEL,
  GLASS_SUMMARY,
} from '../../../../../components/tratamientos-completados/glassTheme';
import {
  getPaymentStatusPresentation,
  type PaymentStatusTone,
} from '@/lib/treatments/completedTreatmentMetrics';
import type { PaymentStatus } from '@/lib/treatments/completedTreatmentSort';

interface CompletedTreatment {
  id: string;
  paciente_id: string;
  fecha_cita: string;
  total_original: number;
  total_descuento: number;
  total_final: number;
  moneda: Currency;
  tipo_descuento: 'monto' | 'porcentaje' | 'ninguno';
  valor_descuento: number;
  notas_doctor?: string;
  firma_paciente_url?: string;
  firma_doctor_url?: string;
  estado: 'pendiente_firma' | 'firmado' | 'pagado';
  estado_pago?: 'pendiente' | 'pagado' | 'parcialmente_pagado';
  creado_en: string;
  actualizado_en: string;
  paciente?: Patient;
  tratamientos_realizados?: {
    id: string;
    tratamiento_completado_id: string;
    tratamiento_id: number;
    nombre_tratamiento: string;
    codigo_tratamiento: string;
    precio_original: number;
    precio_final: number;
    moneda: Currency;
    cantidad: number;
    notas?: string;
    doctor_id?: string;
    doctor_name?: string;
    tratamiento?: {
      id: number;
      nombre: string;
      precio: number;
      codigo: string;
      especialidad?: string;
      notas?: string;
    };
  }[];
  tratamientos_inventario?: {
    id: string;
    tratamiento_completado_id: string;
    inventario_id: string;
    nombre: string;
    codigo?: string;
    cantidad: number;
    precio: number;
    moneda: Currency;
    imagen_url?: string;
    notas?: string;
  }[];
}

const PAYMENT_DOT_CLASSES: Record<PaymentStatusTone, string> = {
  pagado: 'bg-emerald-500',
  parcialmente_pagado: 'bg-amber-500',
  pendiente: 'bg-rose-500',
};

const PAYMENT_ICON: Record<PaymentStatusTone, LucideIcon> = {
  pagado: CheckCircle2,
  parcialmente_pagado: Wallet,
  pendiente: Clock3,
};

const PAYMENT_ICON_CLASSES: Record<PaymentStatusTone, string> = {
  pagado: 'text-emerald-600 dark:text-emerald-400',
  parcialmente_pagado: 'text-amber-600 dark:text-amber-400',
  pendiente: 'text-rose-600 dark:text-rose-400',
};

const PAYMENT_TIMELINE_LABEL: Record<PaymentStatusTone, string> = {
  pagado: 'Tratamiento Pagado',
  parcialmente_pagado: 'Tratamiento Parcialmente Pagado',
  pendiente: 'Tratamiento Pendiente de Pago',
};

export default function TratamientoCompletadoViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [treatment, setTreatment] = useState<CompletedTreatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<HistoricalRecordInfo | null>(null);
  const { bypassHistoricalMode, loadPatientSettings } = useHistoricalMode();

  // Unwrap params with React.use()
  const resolvedParams = use(params);
  const treatmentId = resolvedParams.id;

  useEffect(() => {
    const loadTreatment = async () => {
      try {
        setLoading(true);
        
        const treatmentData = await CompletedTreatmentService.getCompletedTreatmentById(treatmentId);
        setTreatment(treatmentData as CompletedTreatment | null);
        
        if (treatmentData?.paciente) {
          // Load patient-specific historical mode settings first
          await loadPatientSettings(treatmentData.paciente_id);
          
          // For completed treatments, use the treatment date (fecha_cita) for historical determination
          // This is because a completed treatment is a specific event that happened on that date
          const fechaInicio = treatmentData.fecha_cita || 
                          treatmentData.paciente.fecha_inicio || 
                          treatmentData.paciente.fecha_nacimiento;
          
          // Then get record category info
          const categoryInfo = await getRecordCategoryInfo(fechaInicio);
          setRecordCategoryInfo(categoryInfo);
        }
      } catch (error) {
        console.error('Error loading treatment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTreatment();
  }, [treatmentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600 dark:border-emerald-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Cargando tratamiento...</p>
        </div>
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
          Tratamiento no encontrado
        </h3>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          El tratamiento que buscas no existe o ha sido eliminado.
        </p>
      </div>
    );
  }

  const paymentStatus: PaymentStatus = treatment.estado_pago || 'pendiente';
  const paymentTone = getPaymentStatusPresentation(paymentStatus).tone;
  const PaymentIcon = PAYMENT_ICON[paymentTone];

  return (
    <>
      {/* Top Action Bar */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className={cn(GLASS_PANEL, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
          {/* Left side - Crear Nuevo Tratamiento */}
          <button
            type="button"
            onClick={() => {
              const url = treatment.paciente_id 
                ? `/tratamientos-completados/new?paciente_id=${treatment.paciente_id}`
                : '/tratamientos-completados/new';
              router.push(url);
            }}
            className={BTN_PRIMARY}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Crear Nuevo Tratamiento
          </button>

          {/* Right side - Volver */}
          <button
            type="button"
            onClick={() => {
              const url = treatment.paciente_id 
                ? `/tratamientos-completados?paciente_id=${encodeURIComponent(treatment.paciente_id)}`
                : '/tratamientos-completados';
              router.push(url);
            }}
            className={BTN_SECONDARY}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Detalles del Tratamiento Completado
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Paciente: {treatment.paciente?.nombre_completo || 'Paciente desconocido'}
          </p>
        </div>

        {/* Historical Mode Banner - Prominent Position */}
        <HistoricalBanner
          isHistorical={recordCategoryInfo?.isHistorical}
          isBypassed={bypassHistoricalMode}
          patientId={treatment?.paciente_id}
          loading={loading}
          compact={false}
          showBypassToggle={true}
        />

        {/* Status Badge */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge status={paymentStatus} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="lg:col-span-1">
            <div className={cn(GLASS_PANEL, 'p-6')}>
              <h2 className={cn(GLASS_HEADING, 'mb-5 flex items-center gap-2 text-slate-900 dark:text-white')}>
                <User className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Información del Paciente
              </h2>

              {treatment.paciente ? (
                <div className="space-y-4">
                  <div className={cn('border-b pb-4', GLASS_DIVIDER)}>
                    <p className={cn(GLASS_MUTED, 'text-slate-500 dark:text-slate-400')}>Nombre</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <User className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {treatment.paciente.nombre_completo}
                    </p>
                  </div>

                  <div className={cn('border-b pb-4', GLASS_DIVIDER)}>
                    <p className={cn(GLASS_MUTED, 'text-slate-500 dark:text-slate-400')}>Identidad</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {treatment.paciente.numero_identidad}
                    </p>
                  </div>

                  <div className={cn('border-b pb-4', GLASS_DIVIDER)}>
                    <p className={cn(GLASS_MUTED, 'text-slate-500 dark:text-slate-400')}>Teléfono</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {treatment.paciente.telefono ? (
                        <a
                          href={`https://wa.me/${(treatment.paciente.codigopais || '504')}${treatment.paciente.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-600 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {(treatment.paciente.codigopais || '504')} {treatment.paciente.telefono}
                        </a>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">No disponible</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className={cn(GLASS_MUTED, 'text-slate-500 dark:text-slate-400')}>Fecha de Cita</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {SimpleTimezoneFix.formatDisplayDate(treatment.fecha_cita)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Información del paciente no disponible
                </p>
              )}
            </div>
          </div>

          {/* Treatment Details */}
          <div className="lg:col-span-2">
            <div className={cn(GLASS_PANEL, 'p-6')}>
              <h2 className={cn(GLASS_HEADING, 'mb-5 text-slate-900 dark:text-white')}>
                Detalles del Tratamiento
              </h2>

              {/* Treatment Overview */}
              <div className={cn(GLASS_INSET, 'mb-6 grid grid-cols-1 gap-4 p-4 md:grid-cols-3')}>
                <div>
                  <p className={cn(GLASS_FIELD_LABEL, 'text-slate-700 dark:text-slate-300')}>
                    Fecha del Tratamiento
                  </p>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {SimpleTimezoneFix.formatDisplayDate(treatment.fecha_cita)}
                  </p>
                </div>

                <div>
                  <p className={cn(GLASS_FIELD_LABEL, 'text-slate-700 dark:text-slate-300')}>
                    Estado del Tratamiento
                  </p>
                  <StatusBadge status={paymentStatus} />
                </div>

                <div>
                  <p className={cn(GLASS_FIELD_LABEL, 'text-slate-700 dark:text-slate-300')}>
                    Total de Tratamientos
                  </p>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Info className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {(treatment.tratamientos_realizados?.length || 0) + (treatment.tratamientos_inventario?.length || 0)} procedimientos
                  </p>
                </div>
              </div>

              {/* Treatments List */}
              <div className="mb-6">
                <h3 className={cn(GLASS_HEADING, 'mb-3 text-base text-slate-900 dark:text-white')}>
                  Procedimientos Realizados
                </h3>

                {/* Always show treatments, regardless of historical mode */}
                {treatment.tratamientos_realizados && treatment.tratamientos_realizados.length > 0 || treatment.tratamientos_inventario && treatment.tratamientos_inventario.length > 0 ? (
                  <div className="space-y-3">
                    {treatment.tratamientos_realizados?.map((item) => (
                      <div key={item.id} className={cn(GLASS_INSET, 'p-4')}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white">
                                {item.nombre_tratamiento}
                              </h4>
                              {(item.notas || item.tratamiento?.notas) && (
                                <span
                                  className="inline-flex"
                                  title={`Notas: ${item.notas || item.tratamiento?.notas}`}
                                >
                                  <StickyNote
                                    className="h-4 w-4 cursor-help text-amber-500"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                                {item.codigo_tratamiento}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Cantidad:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                  {item.cantidad}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Precio Unitario:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                  {formatCurrency(item.precio_original, item.moneda || 'HNL' as Currency)}
                                </span>
                              </div>
                            </div>

                            {/* Doctor Information */}
                            {item.doctor_name && (
                              <div className="mt-3 text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Tratado por:</span>
                                <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                                  {item.doctor_name}
                                </span>
                              </div>
                            )}

                            {item.notas && (
                              <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/60 p-2 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                                <span className="text-slate-500 dark:text-slate-400">
                                  Notas del procedimiento:
                                </span>
                                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                  {item.notas}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 shrink-0 text-right">
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(item.precio_final, item.moneda || 'HNL' as Currency)}
                            </p>
                            {item.precio_final !== item.precio_original && (
                              <p className="text-sm text-slate-500 line-through dark:text-slate-400">
                                {formatCurrency(item.precio_original, item.moneda || 'HNL' as Currency)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Inventory (insumos) items used */}
                    {treatment.tratamientos_inventario?.map((item) => (
                      <div
                        key={`inv-${item.id}`}
                        className={cn(
                          GLASS_INSET,
                          'p-4 border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20',
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white">
                                {item.nombre}
                              </h4>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                Inventario
                              </span>
                              {item.codigo && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {item.codigo}
                                </span>
                              )}
                            </div>

                            {item.imagen_url && (
                              <div className="mb-3">
                                <img
                                  src={item.imagen_url}
                                  alt={item.nombre}
                                  className="h-20 w-20 rounded-lg border border-slate-200/80 object-cover dark:border-slate-800"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Cantidad:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                  {item.cantidad}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Precio Unitario:</span>
                                <span className="ml-2 font-medium text-slate-900 dark:text-white">
                                  {formatCurrency(item.precio, item.moneda || 'HNL' as Currency)}
                                </span>
                              </div>
                            </div>

                            {item.notas && (
                              <div className="mt-3 rounded-lg border border-amber-200/70 bg-white/60 p-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/10">
                                <span className="text-slate-500 dark:text-slate-400">Notas:</span>
                                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                  {item.notas}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 shrink-0 text-right">
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(item.precio, item.moneda || 'HNL' as Currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay procedimientos registrados
                  </p>
                )}
              </div>

              {/* Doctor Notes */}
              {treatment.notas_doctor && (
                <div className={cn('mt-2 border-t pt-4', GLASS_DIVIDER)}>
                  <h3 className={cn(GLASS_HEADING, 'mb-3 flex items-center gap-2 text-base text-slate-900 dark:text-white')}>
                    <StickyNote className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Notas del Doctor
                  </h3>
                  <div className="rounded-lg border border-sky-200/80 bg-sky-50/70 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {treatment.notas_doctor}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Summary, Timeline and Signature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Total Final */}
          <div className={cn(GLASS_PANEL, 'p-6')}>
            <h3 className={cn(GLASS_HEADING, 'mb-4 flex items-center gap-2 text-slate-900 dark:text-white')}>
              <Coins className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Total Final
            </h3>

            {/* Check if financial summary should be hidden due to historical mode */}
            {!bypassHistoricalMode && recordCategoryInfo?.isHistorical ? (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-6 text-center dark:border-amber-800/60 dark:bg-amber-950/20">
                <AlertTriangle
                  className="mx-auto mb-2 h-7 w-7 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Información financiera oculta por modo histórico
                </p>
              </div>
            ) : (
              <div className={cn(GLASS_INSET, 'space-y-2 p-4')}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(treatment.total_original, treatment.moneda || 'HNL' as Currency)}
                  </span>
                </div>

                {treatment.total_descuento > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      Descuento ({treatment.tipo_descuento === 'porcentaje' ? `${treatment.valor_descuento}%` : treatment.tipo_descuento}):
                    </span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      -{formatCurrency(treatment.total_descuento, treatment.moneda || 'HNL' as Currency)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    GLASS_SUMMARY,
                    'mt-2 flex items-center justify-between border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400',
                  )}
                >
                  <span>Total Final:</span>
                  <span className="text-base font-bold">
                    {formatCurrency(treatment.total_final, treatment.moneda || 'HNL' as Currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Treatment Timeline */}
          <div className={cn(GLASS_PANEL, 'p-6')}>
            <h3 className={cn(GLASS_HEADING, 'mb-4 flex items-center gap-2 text-slate-900 dark:text-white')}>
              <Clock3 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Línea de Tiempo del Tratamiento
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Tratamiento Creado
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateForDisplay(treatment.creado_en)}
                  </p>
                </div>
              </div>

              {treatment.actualizado_en !== treatment.creado_en && (
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-blue-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Última Actualización
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateForDisplay(treatment.actualizado_en)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span
                  className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', PAYMENT_DOT_CLASSES[paymentTone])}
                  aria-hidden="true"
                />
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                    <PaymentIcon
                      className={cn('h-4 w-4 shrink-0', PAYMENT_ICON_CLASSES[paymentTone])}
                      aria-hidden="true"
                    />
                    {PAYMENT_TIMELINE_LABEL[paymentTone]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateForDisplay(treatment.actualizado_en)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Signature */}
          <div className="md:col-span-2">
            <div className={cn(GLASS_PANEL, 'p-6')}>
              <h3 className={cn(GLASS_HEADING, 'mb-4 flex items-center gap-2 text-slate-900 dark:text-white')}>
                <PenLine className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Firma del Paciente
              </h3>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[240px]">
                {treatment.firma_paciente_url ? (
                  <SignatureDisplay
                    signatureUrl={treatment.firma_paciente_url}
                    label="Firma del Paciente"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <PenLine className="mb-3 h-10 w-10 text-slate-500" aria-hidden="true" />
                    <p className="text-sm text-slate-400">
                      No hay firma registrada
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
