'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PeriodontalStudy {
  id: number;
  fecha: string;
  notas: string;
  datos: any;
}

interface ToothMeasurement {
  diente: string;
  vestibular: {
    mesial: string;
    medio: string;
    distal: string;
  };
  palatino: {
    mesial: string;
    medio: string;
    distal: string;
  };
  movilidad: string;
  sangrado: boolean;
  placa: boolean;
  observaciones: string;
}

export default function EstudioPeriodontal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'nuevo' | 'guardados'>('nuevo');
  const [formData, setFormData] = useState({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    indicePlaca: '',
    indiceSangrado: '',
    nivelInsercion: '',
    furcaciones: 'no-evaluado',
    observacionesGenerales: '',
    profilaxis: false,
    raspaje: false,
    cirugia: false,
    mantenimiento: false,
    otro: false,
    otroEspecificar: ''
  });

  const [toothMeasurements, setToothMeasurements] = useState<ToothMeasurement[]>([]);
  const [deletedRowsStack, setDeletedRowsStack] = useState<any[]>([]);
  const [savedStudies, setSavedStudies] = useState<PeriodontalStudy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const teeth = [
    // Upper right (1-8)
    '18', '17', '16', '15', '14', '13', '12', '11',
    // Upper left (9-16)
    '21', '22', '23', '24', '25', '26', '27', '28',
    // Lower left (17-24)
    '38', '37', '36', '35', '34', '33', '32', '31',
    // Lower right (25-32)
    '41', '42', '43', '44', '45', '46', '47', '48'
  ];

  useEffect(() => {
    // Initialize tooth measurements
    const initialMeasurements: ToothMeasurement[] = teeth.map(tooth => ({
      diente: tooth,
      vestibular: { mesial: '', medio: '', distal: '' },
      palatino: { mesial: '', medio: '', distal: '' },
      movilidad: '0',
      sangrado: false,
      placa: false,
      observaciones: ''
    }));
    setToothMeasurements(initialMeasurements);

    // Load saved studies (mock data for now)
    loadSavedStudies();
  }, []);

  const loadSavedStudies = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockStudies: PeriodontalStudy[] = [
        { id: 1, fecha: '2025-09-22', notas: 'Primera evaluación periodontal', datos: {} },
        { id: 2, fecha: '2025-08-15', notas: 'Control de mantenimiento', datos: {} },
        { id: 3, fecha: '2025-07-10', notas: 'Evaluación inicial', datos: {} }
      ];
      setSavedStudies(mockStudies);
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToothMeasurementChange = (toothIndex: number, field: string, value: any) => {
    setToothMeasurements(prev => {
      const updated = [...prev];
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentKey = parent as keyof ToothMeasurement;
        const currentValue = updated[toothIndex][parentKey];
        
        if (typeof currentValue === 'object' && currentValue !== null) {
          updated[toothIndex] = {
            ...updated[toothIndex],
            [parentKey]: {
              ...currentValue,
              [child]: value
            }
          };
        }
      } else {
        updated[toothIndex] = {
          ...updated[toothIndex],
          [field]: value
        };
      }
      return updated;
    });
  };

  const deleteToothRow = (index: number) => {
    const row = toothMeasurements[index];
    setDeletedRowsStack(prev => [...prev, { row, index }]);
    setToothMeasurements(prev => prev.filter((_, i) => i !== index));
  };

  const restoreLastDeletedRow = () => {
    if (deletedRowsStack.length > 0) {
      const { row, index } = deletedRowsStack[deletedRowsStack.length - 1];
      setToothMeasurements(prev => {
        const updated = [...prev];
        updated.splice(index, 0, row);
        return updated;
      });
      setDeletedRowsStack(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirm('¿Está seguro que desea guardar este estudio periodontal?')) {
      return;
    }

    try {
      const studyData = {
        ...formData,
        mediciones: toothMeasurements
      };

      console.log('Datos del estudio periodontal a guardar:', studyData);
      
      // Here you would send the data to your API
      // await fetch('/api/estudio-periodontal', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(studyData)
      // });

      alert('Estudio periodontal guardado correctamente');
      // Optionally reset form or redirect
    } catch (error) {
      console.error('Error al guardar el estudio:', error);
      alert('Ocurrió un error al guardar el estudio');
    }
  };

  const filteredStudies = savedStudies.filter(study => {
    const matchesSearch = !searchTerm || 
      study.fecha.includes(searchTerm) || 
      (study.notas && study.notas.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || study.fecha === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const studiesPerPage = 5;
  const totalPages = Math.ceil(filteredStudies.length / studiesPerPage);
  const startIndex = (currentPage - 1) * studiesPerPage;
  const endIndex = startIndex + studiesPerPage;
  const currentStudies = filteredStudies.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            <i className="fas fa-teeth mr-2 text-teal-600"></i>
            Estudio Periodontal
          </h1>
          <p className="text-gray-600">Registro y gestión de estudios periodontales</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('nuevo')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'nuevo'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-plus-circle mr-2"></i>
                Nuevo Estudio
              </button>
              <button
                onClick={() => setActiveTab('guardados')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'guardados'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-history mr-2"></i>
                Estudios Guardados
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'nuevo' ? (
              /* New Study Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paciente
                    </label>
                    <input
                      type="text"
                      value={formData.patientName}
                      onChange={(e) => handleInputChange('patientName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Odontólogo
                    </label>
                    <input
                      type="text"
                      value={formData.doctor}
                      onChange={(e) => handleInputChange('doctor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                {/* Periodontal Chart */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Chart Periodontal
                    </h3>
                    <button
                      type="button"
                      onClick={restoreLastDeletedRow}
                      disabled={deletedRowsStack.length === 0}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-undo mr-1"></i>
                      Restaurar Último Diente
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Diente
                          </th>
                          <th colSpan={3} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Vestibular
                          </th>
                          <th colSpan={3} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Palatino/Lingual
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Movilidad
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Sangrado
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Placa
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Observaciones
                          </th>
                        </tr>
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 border-b"></th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Mesial</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Medio</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Distal</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Mesial</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Medio</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b">Distal</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b"></th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b"></th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b"></th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 border-b"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {toothMeasurements.map((tooth, index) => (
                          <tr key={tooth.diente} className="hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => deleteToothRow(index)}
                                className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                              >
                                {tooth.diente}
                              </button>
                            </td>
                            {/* Vestibular */}
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.vestibular.mesial}
                                onChange={(e) => handleToothMeasurementChange(index, 'vestibular.mesial', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.vestibular.medio}
                                onChange={(e) => handleToothMeasurementChange(index, 'vestibular.medio', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.vestibular.distal}
                                onChange={(e) => handleToothMeasurementChange(index, 'vestibular.distal', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            {/* Palatino/Lingual */}
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.palatino.mesial}
                                onChange={(e) => handleToothMeasurementChange(index, 'palatino.mesial', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.palatino.medio}
                                onChange={(e) => handleToothMeasurementChange(index, 'palatino.medio', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tooth.palatino.distal}
                                onChange={(e) => handleToothMeasurementChange(index, 'palatino.distal', e.target.value)}
                                className="w-full px-1 py-1 text-center border border-gray-300 rounded"
                              />
                            </td>
                            {/* Movilidad */}
                            <td className="px-2 py-2">
                              <select
                                value={tooth.movilidad}
                                onChange={(e) => handleToothMeasurementChange(index, 'movilidad', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                <option value="0">0</option>
                                <option value="1">I</option>
                                <option value="2">II</option>
                                <option value="3">III</option>
                              </select>
                            </td>
                            {/* Sangrado */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={tooth.sangrado}
                                onChange={(e) => handleToothMeasurementChange(index, 'sangrado', e.target.checked)}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                              />
                            </td>
                            {/* Placa */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={tooth.placa}
                                onChange={(e) => handleToothMeasurementChange(index, 'placa', e.target.checked)}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                              />
                            </td>
                            {/* Observaciones */}
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={tooth.observaciones}
                                onChange={(e) => handleToothMeasurementChange(index, 'observaciones', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Periodontal Parameters */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Parámetros Periodontales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Índice de Placa
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.indicePlaca}
                        onChange={(e) => handleInputChange('indicePlaca', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Índice de Sangrado
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.indiceSangrado}
                        onChange={(e) => handleInputChange('indiceSangrado', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nivel de Inserción Clínica
                      </label>
                      <input
                        type="text"
                        value={formData.nivelInsercion}
                        onChange={(e) => handleInputChange('nivelInsercion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Furcaciones
                      </label>
                      <select
                        value={formData.furcaciones}
                        onChange={(e) => handleInputChange('furcaciones', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="no-evaluado">No evaluado</option>
                        <option value="grado1">Grado I</option>
                        <option value="grado2">Grado II</option>
                        <option value="grado3">Grado III</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones Generales
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacionesGenerales}
                    onChange={(e) => handleInputChange('observacionesGenerales', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Treatment Plan */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Plan de Tratamiento
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.profilaxis}
                        onChange={(e) => handleInputChange('profilaxis', e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-2"
                      />
                      Profilaxis
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.raspaje}
                        onChange={(e) => handleInputChange('raspaje', e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-2"
                      />
                      Raspado y Alisado Radicular
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.cirugia}
                        onChange={(e) => handleInputChange('cirugia', e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-2"
                      />
                      Cirugía Periodontal
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.mantenimiento}
                        onChange={(e) => handleInputChange('mantenimiento', e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-2"
                      />
                      Mantenimiento Periodontal
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.otro}
                        onChange={(e) => handleInputChange('otro', e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-2"
                      />
                      Otro
                    </label>
                    {formData.otro && (
                      <input
                        type="text"
                        value={formData.otroEspecificar}
                        onChange={(e) => handleInputChange('otroEspecificar', e.target.value)}
                        placeholder="Especificar..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ml-6"
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => router.push('/menu-navegacion')}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Volver al Inicio
                  </button>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      <i className="fas fa-save mr-2"></i>
                      Guardar Estudio
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Saved Studies */
              <div>
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por fecha o notas..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={loadSavedStudies}
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Actualizar
                  </button>
                </div>

                {/* Studies Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                            </div>
                          </td>
                        </tr>
                      ) : currentStudies.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                            <i className="fas fa-info-circle mr-2"></i>
                            No se encontraron estudios
                          </td>
                        </tr>
                      ) : (
                        currentStudies.map((study) => (
                          <tr key={study.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(study.fecha)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {study.notas || 'Sin notas'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => alert(`Viendo estudio con ID: ${study.id}`)}
                                  className="text-teal-600 hover:text-teal-900"
                                  title="Ver detalles"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  onClick={() => alert(`Editando estudio con ID: ${study.id}`)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Editar"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('¿Está seguro que desea eliminar este estudio?')) {
                                      setSavedStudies(prev => prev.filter(s => s.id !== study.id));
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <nav className="flex items-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            currentPage === page
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
