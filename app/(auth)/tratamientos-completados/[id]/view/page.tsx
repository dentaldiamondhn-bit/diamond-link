'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, Currency } from '../../../../../utils/currencyUtils';
import { formatDateForDisplay } from '../../../../../utils/dateUtils';
import { Patient } from '../../../../../types/patient';
import SignatureDisplay from '../../../../../components/SignatureDisplay';
import { CompletedTreatmentService } from '../../../../../services/completedTreatmentService';
import { useHistoricalMode } from '../../../../../contexts/HistoricalModeContext';
import { getRecordCategoryInfo } from '../../../../../utils/recordCategoryUtils';
import HistoricalBanner from '../../../../../components/HistoricalBanner';

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
}

export default function TratamientoCompletadoViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [treatment, setTreatment] = useState<CompletedTreatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  const { bypassHistoricalMode, loadPatientSettings } = useHistoricalMode();

  useEffect(() => {
    const loadTreatment = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading treatment with ID:', params.id);
        const treatmentData = await CompletedTreatmentService.getCompletedTreatmentById(params.id);
        console.log('🔍 Raw treatment data:', treatmentData);
        console.log('🔍 Patient data from treatment:', treatmentData?.paciente);
        setTreatment(treatmentData);
        
        if (treatmentData?.paciente) {
          // Load patient-specific historical mode settings first
          await loadPatientSettings(treatmentData.paciente_id);
          
          // For completed treatments, use the treatment date (fecha_cita) for historical determination
          // This is because a completed treatment is a specific event that happened on that date
          const fechaInicio = treatmentData.fecha_cita || 
                          treatmentData.paciente.fecha_inicio || 
                          treatmentData.paciente.fecha_inicio_consulta || 
                          treatmentData.paciente.fecha_nacimiento;
          
          console.log('🔍 Using fechaInicio for historical check:', fechaInicio);
          console.log('🔍 Treatment fecha_cita:', treatmentData.fecha_cita);
          console.log('🔍 Patient fecha_inicio_consulta:', treatmentData.paciente.fecha_inicio_consulta);
          
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
  }, [params.id]);

  const getStatusColor = (estado_pago: string) => {
    switch (estado_pago) {
      case 'pagado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'parcialmente_pagado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pendiente':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (estado_pago: string) => {
    switch (estado_pago) {
      case 'pagado':
        return 'fa-dollar-sign';
      case 'parcialmente_pagado':
        return 'fa-check-circle';
      case 'pendiente':
        return 'fa-clock';
      default:
        return 'fa-question-circle';
    }
  };

  const getStatusText = (estado_pago: string) => {
    switch (estado_pago) {
      case 'pagado':
        return 'Pagado';
      case 'parcialmente_pagado':
        return 'Parcialmente Pagado';
      case 'pendiente':
        return 'Pendiente';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando tratamiento...</p>
        </div>
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Tratamiento no encontrado
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          El tratamiento que buscas no existe o ha sido eliminado.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Crear Nuevo Tratamiento */}
            <button
              onClick={() => {
                const url = treatment.paciente_id 
                  ? `/tratamientos-completados/new?paciente_id=${treatment.paciente_id}`
                  : '/tratamientos-completados/new';
                router.push(url);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <i className="fas fa-plus mr-2"></i>
              Crear Nuevo Tratamiento
            </button>
            
            {/* Right side - Volver */}
            <button
              onClick={() => {
                const url = treatment.paciente_id 
                  ? `/menu-navegacion?id=${encodeURIComponent(treatment.paciente_id)}`
                  : '/menu-navegacion';
                console.log('🔍 Redirecting to:', url);
                router.push(url);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Detalles del Tratamiento Completado
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Paciente: {treatment.paciente?.nombre_completo || 'Paciente desconocido'}
            </p>
          </div>
        </div>
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
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(treatment.estado_pago || 'pendiente')}`}>
          <i className={`fas ${getStatusIcon(treatment.estado_pago || 'pendiente')} mr-2`}></i>
          {getStatusText(treatment.estado_pago || 'pendiente')}
        </span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Información del Paciente
            </h2>
            {treatment.paciente ? (
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Datos Básicos</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {treatment.paciente.nombre_completo}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Identidad</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {treatment.paciente.numero_identidad}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {treatment.paciente.telefono ? (
                          <a 
                            href={`https://wa.me/${(treatment.paciente.codigopais || '504')}${treatment.paciente.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 underline flex items-center gap-1"
                          >
                            <i className="fab fa-whatsapp"></i>
                            {(treatment.paciente.codigopais || '504')} {treatment.paciente.telefono}
                          </a>
                        ) : (
                          <span className="text-gray-500">No disponible</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de Cita</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateForDisplay(treatment.fecha_cita)}
                      </p>
                    </div>
                  </div>
                </div>

                              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Información del paciente no disponible
              </p>
            )}
          </div>
        </div>
        
        {/* Treatment Details */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Detalles del Tratamiento
            </h2>

            {/* Treatment Overview */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha del Tratamiento</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateForDisplay(treatment.fecha_cita)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Estado del Tratamiento</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(treatment.estado_pago || 'pendiente')}`}>
                    <i className={`fas ${getStatusIcon(treatment.estado_pago || 'pendiente')} mr-1`}></i>
                    {getStatusText(treatment.estado_pago || 'pendiente')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total de Tratamientos</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {treatment.tratamientos_realizados?.length || 0} procedimientos
                  </p>
                </div>
              </div>
            </div>

            {/* Treatments List */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Procedimientos Realizados
              </h3>
              
              {/* Always show treatments, regardless of historical mode */}
              {treatment.tratamientos_realizados && treatment.tratamientos_realizados.length > 0 ? (
                <div className="space-y-3">
                  {treatment.tratamientos_realizados.map((item) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {item.nombre_tratamiento}
                              </h4>
                              {(item.notas || item.tratamiento?.notas) && (
                                <i 
                                  className="fas fa-sticky-note text-amber-500 text-sm cursor-help" 
                                  title={`Notas: ${item.notas || item.tratamiento?.notas}`}
                                ></i>
                              )}
                            </div>
                            <span className="ml-2 px-2 py-1 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 text-xs rounded-full">
                              {item.codigo_tratamiento}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Cantidad:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {item.cantidad}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Precio Unitario:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatCurrency(item.precio_original, item.moneda || 'HNL' as Currency)}
                              </span>
                            </div>
                          </div>
                          {/* Doctor Information */}
                          {item.doctor_name && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Tratado por:</span>
                              <span className="ml-2 font-medium text-teal-600 dark:text-teal-400">
                                {item.doctor_name}
                              </span>
                            </div>
                          )}
                          {item.notas && (
                            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Notas del procedimiento:</span>
                              <p className="mt-1 text-gray-700 dark:text-gray-300">
                                {item.notas}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.precio_final, item.moneda || 'HNL' as Currency)}
                          </p>
                          {item.precio_final !== item.precio_original && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              {formatCurrency(item.precio_original, item.moneda || 'HNL' as Currency)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No hay procedimientos registrados
                </p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Resumen Financiero
              </h3>
              
              {/* Check if financial summary should be hidden due to historical mode */}
              {!bypassHistoricalMode && recordCategoryInfo?.isHistorical ? (
                <div className="text-center py-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <i className="fas fa-dollar-sign text-2xl text-amber-600 dark:text-amber-400 mb-2"></i>
                  <p className="text-amber-700 dark:text-amber-300">
                    Información financiera oculta por modo histórico
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(treatment.total_original, treatment.moneda || 'HNL' as Currency)}
                      </span>
                    </div>
                    {treatment.total_descuento > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Descuento ({treatment.tipo_descuento === 'porcentaje' ? `${treatment.valor_descuento}%` : treatment.tipo_descuento}):
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatCurrency(treatment.total_descuento, treatment.moneda || 'HNL' as Currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                      <span className="text-gray-900 dark:text-white">Total Final:</span>
                      <span className="text-teal-600 dark:text-teal-400">
                        {formatCurrency(treatment.total_final, treatment.moneda || 'HNL' as Currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Doctor Notes */}
            {treatment.notas_doctor && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Notas del Doctor
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {treatment.notas_doctor}
                  </p>
                </div>
              </div>
            )}

            {/* Treatment Timeline */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Línea de Tiempo del Tratamiento
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Tratamiento Creado</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateForDisplay(treatment.creado_en)}
                    </p>
                  </div>
                </div>
                {treatment.actualizado_en !== treatment.creado_en && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Última Actualización</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateForDisplay(treatment.actualizado_en)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    (treatment.estado_pago || 'pendiente') === 'pagado' ? 'bg-green-500' : 
                    (treatment.estado_pago || 'pendiente') === 'parcialmente_pagado' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(treatment.estado_pago || 'pendiente') === 'pagado' ? 'Tratamiento Pagado' : 
                       (treatment.estado_pago || 'pendiente') === 'parcialmente_pagado' ? 'Tratamiento Parcialmente Pagado' : 
                       'Tratamiento Pendiente de Pago'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateForDisplay(treatment.actualizado_en)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Signature */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Firma del Paciente
          </h3>
          {treatment.firma_paciente_url ? (
            <SignatureDisplay 
              signatureUrl={treatment.firma_paciente_url} 
              label="Firma del Paciente" 
            />
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <i className="fas fa-signature text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
              <p className="text-gray-500 dark:text-gray-400">
                No hay firma registrada
              </p>
            </div>
          )}
        </div>

        </div>
    </div>
    </>
  );
}