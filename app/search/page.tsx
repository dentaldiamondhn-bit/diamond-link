'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PatientService } from '../../services/patientService';
import { Patient } from '../../types/patient';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setSearchResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const patients = await PatientService.searchPatients(term);
      setSearchResults(patients);
    } catch (err) {
      console.error('Error searching patients:', err);
      setError('Error al buscar pacientes. Intente nuevamente.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column - New Patient Button */}
      <div className="lg:w-1/3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-plus text-teal-600 dark:text-teal-400 text-3xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Nuevo Paciente
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crear una nueva historia clínica para un paciente
            </p>
            <Link href="/patient-form">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                <i className="fas fa-plus mr-2"></i>
                Nueva Historia Clínica
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Search and Results */}
      <div className="lg:w-2/3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <i className="fas fa-search text-gray-500 mr-3"></i>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Buscar Expediente
            </h2>
          </div>
          
          <div className="relative mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, ID, teléfono o doctor"
              className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Buscando...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <i className="fas fa-exclamation-circle text-red-500 text-3xl mb-3"></i>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Error en la búsqueda
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={clearSearch}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <i className="fas fa-times mr-2"></i>
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && searchTerm && searchResults.length === 0 && (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <i className="fas fa-search text-gray-300 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                No se encontraron coincidencias
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No hay resultados para "{searchTerm}"
              </p>
              <button
                onClick={clearSearch}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <i className="fas fa-undo mr-2"></i>
                Ver todos los pacientes
              </button>
            </div>
          )}

          {/* Search Results */}
          {!loading && !error && searchResults.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Resultados ({searchResults.length})
                </h3>
                <button
                  onClick={clearSearch}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
                >
                  <i className="fas fa-times mr-1"></i>
                  Limpiar búsqueda
                </button>
              </div>

              <div className="grid gap-4">
                {searchResults.map((patient) => (
                  <div
                    key={patient.paciente_id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                          <span className="text-teal-600 dark:text-teal-400 font-bold text-lg">
                            {getInitials(patient.nombre_completo)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white">
                            {patient.nombre_completo}
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {patient.numero_identidad && (
                              <span>ID: {patient.numero_identidad}</span>
                            )}
                            {patient.telefono && (
                              <span> • {patient.telefono}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/patient-preview/${patient.paciente_id}`}>
                          <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors">
                            <i className="fas fa-eye mr-1"></i>
                            Ver
                          </button>
                        </Link>
                        <Link href={`/patient-form?id=${patient.paciente_id}`}>
                          <button className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                            <i className="fas fa-edit mr-1"></i>
                            Editar
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial State */}
          {!loading && !error && !searchTerm && (
            <div className="text-center py-12">
              <i className="fas fa-search text-gray-300 text-5xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Buscar Expedientes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ingrese un término de búsqueda para encontrar pacientes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
