'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PatientsTableModalProps {
  title: string;
  loading: boolean;
  patients: any[];
  onClose: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const formatHNL = (amount: number) => {
  return `L ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
};

const createWhatsAppUrl = (phoneNumber: string) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/504${cleanPhone}`;
};

export default function PatientsTableModal({
  title,
  loading,
  patients,
  onClose,
  emptyTitle = 'No se encontraron pacientes',
  emptyDescription = 'No se encontraron pacientes para tu cuenta.',
}: PatientsTableModalProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredPatients = patients.filter((patient) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.nombre_completo?.toLowerCase().includes(searchLower) ||
      patient.numero_identidad?.toLowerCase().includes(searchLower) ||
      patient.telefono?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar paciente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm w-64"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Paciente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Teléfono
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tratamientos Completados
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Total Pagado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredPatients.map((patient) => {
                          const patientId = patient.paciente_id || patient.id;
                          return (
                            <tr key={patientId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {patient.nombre_completo}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {patient.numero_identidad || 'No disponible'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {patient.telefono ? (
                                    <a
                                      href={createWhatsAppUrl(patient.telefono)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center"
                                    >
                                      <i className="fab fa-whatsapp mr-2"></i>
                                      {patient.telefono}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">No disponible</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {patient.completedTreatmentsCount || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                  {formatHNL(patient.totalPaid || 0)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => router.push(`/menu-navegacion?id=${patientId}`)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center px-2 py-1 rounded border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                  >
                                    <i className="fas fa-folder-open mr-1"></i>
                                    Menú
                                  </button>
                                  <Link
                                    href={`/patient-preview/${patientId}`}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 inline-flex items-center px-2 py-1 rounded border border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                  >
                                    <i className="fas fa-eye mr-1"></i>
                                    Ver
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {filteredPatients.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <i className="fas fa-search text-4xl"></i>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {searchTerm ? 'No se encontraron pacientes' : emptyTitle}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {searchTerm
                            ? `No hay pacientes que coincidan con "${searchTerm}"`
                            : emptyDescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
