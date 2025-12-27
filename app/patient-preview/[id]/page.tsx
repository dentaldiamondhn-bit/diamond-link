'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientService } from '../../../services/patientService';
import { ExportService } from '../../../services/exportService';
import { Patient } from '../../../types/patient';

export default function PatientPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
    }
  }, [params.id]);

  const fetchPatient = async (id: string) => {
    try {
      const patientData = await PatientService.getPatientById(id);
      setPatient(patientData);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('No se pudo cargar la información del paciente');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (patient) {
      ExportService.exportToPDF(patient);
    }
  };

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    if (!patient) return;
    
    switch (format) {
      case 'pdf':
        ExportService.exportToPDF(patient);
        break;
      case 'html':
        ExportService.exportToHTML(patient);
        break;
      case 'json':
        ExportService.exportToJSON(patient);
        break;
    }
    setShowExportModal(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Error
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error || 'No se encontró el paciente'}
        </p>
        <button
          onClick={() => router.back()}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Vista Previa del Paciente
        </h1>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {/* Edit Patient Button */}
          <button
            onClick={() => router.push(`/patient-form?id=${params.id}`)}
            className="btn bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
          >
            <i className="fas fa-edit"></i>
            Editar
          </button>
          
          {/* New Patient Button */}
          <button
            onClick={() => router.push('/patient-form')}
            className="btn bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Nueva Historia
          </button>
          
          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="btn bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition flex items-center gap-2"
          >
            <i className="fas fa-download"></i>
            Exportar
          </button>
          
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="btn bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            <i className="fas fa-print"></i>
            Imprimir
          </button>
        </div>
      </div>

      {/* Patient Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
            <span className="text-teal-600 dark:text-teal-400 font-bold text-xl">
              {getInitials(patient.nombre_completo)}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {patient.nombre_completo}
            </h2>
            <div className="text-gray-600 dark:text-gray-400">
              {patient.numero_identidad && <span>ID: {patient.numero_identidad}</span>}
              {patient.telefono && <span> • Tel: {patient.telefono}</span>}
            </div>
          </div>
          <div className="text-right">
            <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full text-sm">
              Paciente #{patient.paciente_id}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-user mr-2"></i>
            Información Personal
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Nombre Completo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.nombre_completo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Identificación:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_identificacion}</p>
            </div>
            {patient.numero_identidad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Número de Identidad:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.numero_identidad}</p>
              </div>
            )}
            {patient.fecha_nacimiento && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fecha_nacimiento}</p>
              </div>
            )}
            {patient.edad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Edad:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.edad} años</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sexo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.sexo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Sangre:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.tipo_sangre}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-address-book mr-2"></i>
            Información de Contacto
          </h3>
          <div className="space-y-3">
            {patient.telefono && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Teléfono:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.telefono}</p>
              </div>
            )}
            {patient.email && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.email}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dirección:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.direccion}</p>
            </div>
            {patient.contacto_emergencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Contacto de Emergencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.contacto_emergencia}</p>
              </div>
            )}
            {patient.contacto_telefono && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Teléfono de Emergencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.contacto_telefono}</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-heartbeat mr-2"></i>
            Información Médica
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Enfermedades:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enfermedades || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Alergias:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.alergias || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Medicamentos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.medicamentos || 'Ninguno'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Hospitalizaciones:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hospitalizaciones || 'Ninguna'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Cirugías:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cirugias || 'Ninguna'}</p>
            </div>
            {patient.embarazo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Embarazo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.embarazo}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Antecedentes Familiares:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.antecedentes_familiares || 'Ninguno'}</p>
            </div>
            {patient.vacunas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Vacunas:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.vacunas}</p>
              </div>
            )}
            {patient.observaciones_medicas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones Médicas:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.observaciones_medicas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Habits Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-smoking mr-2"></i>
            Hábitos
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Fuma:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.fuma}</p>
            </div>
            {patient.fuma_cantidad && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Cantidad (cigarrillos/día):</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fuma_cantidad}</p>
              </div>
            )}
            {patient.fuma_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.fuma_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Alcohol:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.alcohol}</p>
            </div>
            {patient.alcohol_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.alcohol_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Drogas:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.drogas}</p>
            </div>
            {patient.tipo_droga && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de Droga:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_droga}</p>
              </div>
            )}
            {patient.drogas_frecuencia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.drogas_frecuencia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Café:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cafe}</p>
            </div>
            {patient.cantidad_tazas && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tazas al día:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.cantidad_tazas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Diet Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-utensils mr-2"></i>
            Dieta y Hábitos Alimenticios
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Objetos duros:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.objetos}</p>
            </div>
            {patient.morder && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Morderse:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.morder}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Hielo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hielo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Boca:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.boca}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Refrescos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.refrescos}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dulces:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dulces}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Pegajosos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.pegajosos}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Azucarados:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.azucarados}</p>
            </div>
            {patient.obs && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.obs}</p>
              </div>
            )}
          </div>
        </div>

        {/* Oral Hygiene */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-toothbrush mr-2"></i>
            Higiene Oral
          </h3>
          <div className="space-y-3">
            {patient.visitas_dentista && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Visitas al dentista:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.visitas_dentista}</p>
              </div>
            )}
            {patient.obsgen && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones generales:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.obsgen}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Frecuencia de cepillado:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.f_cepillado} veces al día</p>
            </div>
            {patient.tipocepillo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de cepillo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipocepillo}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Pasta dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.pastadental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Cambio de cepillo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.cambio_cepillo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Hilo dental:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.hilo_dental}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Enjuague bucal:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.enjuague_bucal}</p>
            </div>
          </div>
        </div>

        {/* Dental Examination */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-search mr-2"></i>
            Examen Dental
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de consulta:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.motivo}</p>
            </div>
            {patient.historial && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Historial:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.historial}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Encías:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.encias}</p>
            </div>
            {patient.sangrado_encia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Sangrado de encías:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.sangrado_encia}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor}</p>
            </div>
            {patient.dolor_masticar && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Dolor al masticar:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_masticar}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de cabeza:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza}</p>
            </div>
            {patient.dolor_cabeza_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de cabeza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_cabeza_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos}</p>
            </div>
            {patient.chasquidos_mandibulares && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Chasquidos mandibulares:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.chasquidos_mandibulares}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dolor de oído:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido}</p>
            </div>
            {patient.dolor_oido_detalle && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Detalles del dolor de oído:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.dolor_oido_detalle}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Succión digital:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.suction_digital}</p>
            </div>
          </div>
        </div>

        {/* Orthodontic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-teeth mr-2"></i>
            Información Ortodóntica
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Ortodoncia:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.ortodoncia}</p>
            </div>
            {patient.orto_finalizado && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Finalizado:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.orto_finalizado}</p>
              </div>
            )}
            {patient.orto_motivo_no_finalizado && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de no finalización:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.orto_motivo_no_finalizado}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Prótesis:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.protesis}</p>
            </div>
            {patient.protesis_tipo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de prótesis:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.protesis_tipo}</p>
              </div>
            )}
            {patient.protesis_nocturno && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Uso nocturno:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.protesis_nocturno}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Sensibilidad:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.sensibilidad}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Bruxismo:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.bruxismo}</p>
            </div>
            {patient.tipo_bruxismo && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de bruxismo:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_bruxismo}</p>
              </div>
            )}
            {patient.ultima_limpieza && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Última limpieza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.ultima_limpieza}</p>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-notes-medical mr-2"></i>
            Plan de Tratamiento
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Necesita ortodoncia:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.necesita_ortodoncia}</p>
            </div>
            {patient.detalles_ortodoncia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Detalles de ortodoncia:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.detalles_ortodoncia}</p>
              </div>
            )}
            {patient.relacion_molar && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Relación molar:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.relacion_molar}</p>
              </div>
            )}
            {patient.relacion_canina && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Relación canina:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.relacion_canina}</p>
              </div>
            )}
            {patient.tipo_mordida && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de mordida:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_mordida}</p>
              </div>
            )}
            {patient.apiñamiento && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Apiñamiento:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.apiñamiento}</p>
              </div>
            )}
            {patient.espacios && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Espacios:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.espacios}</p>
              </div>
            )}
            {patient.lineamedia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Línea media:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.lineamedia}</p>
              </div>
            )}
            {patient.diagnostico && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Diagnóstico:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.diagnostico}</p>
              </div>
            )}
            {patient.tipo_aparatologia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo de aparatología:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tipo_aparatologia}</p>
              </div>
            )}
            {patient.otro_aparatologia && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Otra aparatología:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.otro_aparatologia}</p>
              </div>
            )}
            {patient.tratamiento && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tratamiento:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.tratamiento}</p>
              </div>
            )}
            {patient.observaciones_plan && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Observaciones del plan:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.observaciones_plan}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dental Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-tooth mr-2"></i>
            Información Dental General
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Motivo de Consulta:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.motivo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Doctor:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.doctor}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.fecha_inicio}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Seguro:</span>
              <p className="text-gray-600 dark:text-gray-400">{patient.seguro}</p>
            </div>
            {patient.poliza && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Póliza:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.poliza}</p>
              </div>
            )}
            {patient.contacto && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Contacto del seguro:</span>
                <p className="text-gray-600 dark:text-gray-400">{patient.contacto}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          <i className="fas fa-signature mr-2"></i>
          Firma Digital
        </h3>
        
        {patient.firma_digital ? (
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
            <img 
              src={patient.firma_digital} 
              alt="Firma del paciente" 
              className="max-w-full h-auto"
              style={{ maxHeight: '200px' }}
            />
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <i className="fas fa-signature text-gray-300 text-4xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">
              No hay firma digital registrada para este paciente
            </p>
          </div>
        )}
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {patient.firma_digital 
            ? `Firma digital del paciente registrada el ${patient.fecha_inicio}`
            : 'Este paciente no tiene firma digital registrada'
          }
        </p>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Exportar Historia Clínica
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Seleccione el formato de exportación:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Exportar como PDF
              </button>
              <button
                onClick={() => handleExport('html')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-code mr-2"></i>
                Exportar como HTML
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-code mr-2"></i>
                Exportar como JSON
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
