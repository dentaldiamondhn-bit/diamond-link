'use client';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import { TicketService } from '@/services/ticketService';
import { Ticket, TicketStatus, TicketPriority, TicketType, CreateTicketData, UserRole } from '@/types/ticket';
import SystemLogs from '@/components/SystemLogs';
import TicketTimeline from '@/components/TicketTimeline';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { UserSelect } from '@/components/calendar/UserSelect';

export default function TechSupportTickets() {
  const { userRole } = useRoleBasedAccess();
  const { user } = useUser();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Comprehensive modal state
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    type: TicketType.TASK,
    priority: TicketPriority.MEDIUM,
    due_date: '',
    is_reminder: false,
    assignee_ids: [],
    attachments: [],
    patient_id: '',
    maintenance_start: '',
    maintenance_end: ''
  });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showAttachmentSearch, setShowAttachmentSearch] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Check if user is tech support
  if (userRole !== 'tech_support') {
    return <AccessDenied title="Acceso Denegado" message="No tienes permiso para acceder a esta página." />;
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      // Tech support can see all tickets - no filters
      const result = await TicketService.getTickets({});
      if (result.data) {
        setTickets(result.data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: CreateTicketData) => {
    if (!user?.id) return;

    try {
      const result = await TicketService.createTicket(ticketData, user.id);
      if (result.data) {
        setShowCreateModal(false);
        // Reset form
        setFormData({
          title: '',
          description: '',
          type: TicketType.TASK,
          priority: TicketPriority.MEDIUM,
          due_date: '',
          is_reminder: false,
          assignee_ids: [],
          attachments: [],
          patient_id: '',
          maintenance_start: '',
          maintenance_end: ''
        });
        setSelectedPatient(null);
        setSelectedUsers([]);
        setAttachments([]);
        loadTickets(); // Refresh tickets
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.title) {
      alert('El título es requerido');
      return;
    }

    // For non-maintenance tickets, assignees are required
    if (formData.type !== 'MAINTENANCE' && selectedUsers.length === 0) {
      alert('Debe asignar al menos un usuario');
      return;
    }

    // For maintenance tickets, maintenance window is required
    if (formData.type === 'MAINTENANCE' && (!formData.maintenance_start || !formData.maintenance_end)) {
      alert('Las fechas de inicio y fin de mantenimiento son requeridas');
      return;
    }

    const submitData = {
      ...formData,
      // Only include assignee_ids for non-maintenance tickets
      ...(formData.type !== 'MAINTENANCE' && { assignee_ids: selectedUsers.map(u => u.id) }),
      attachments: attachments.filter(a => a.selected).map(a => ({
        attachment_type: a.type,
        attachment_id: a.id,
        attachment_title: a.title,
        attachment_description: a.description,
        metadata: a.data
      })),
      patient_id: selectedPatient?.paciente_id || ''
    };
    
    console.log('DEBUG: Frontend submitting data:', JSON.stringify(submitData, null, 2)); // DEBUG LOG
    console.log('DEBUG: formData.type value:', formData.type); // DEBUG LOG
    console.log('DEBUG: TicketType.MAINTENANCE value:', TicketType.MAINTENANCE); // DEBUG LOG
    
    handleCreateTicket(submitData);
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientSearch(false);
    // Clear attachments when patient changes
    setAttachments([]);
  };

  const loadPatientAttachments = async (patientId: string) => {
    setLoadingAttachments(true);
    try {
      // Load consents
      const consentsResponse = await fetch(`/api/patients/${patientId}/consents`);
      const consents = consentsResponse.ok ? await consentsResponse.json() : [];
      
      // Load odontogram
      const odontogramResponse = await fetch(`/api/patients/${patientId}/odontogram`);
      const odontogram = odontogramResponse.ok ? await odontogramResponse.json() : null;
      
      // Load treatments
      const treatmentsResponse = await fetch(`/api/patients/${patientId}/treatments`);
      const treatments = treatmentsResponse.ok ? await treatmentsResponse.json() : [];
      
      // Load events
      const eventsResponse = await fetch(`/api/patients/${patientId}/events`);
      const events = eventsResponse.ok ? await eventsResponse.json() : [];

      const allAttachments = [
        ...consents.map(c => ({
          id: c.id,
          type: 'consent',
          title: c.title || 'Consentimiento',
          description: c.description,
          date: c.created_at,
          data: c,
          selected: false
        })),
        ...(odontogram ? [{
          id: odontogram.id,
          type: 'odontogram',
          title: 'Odontograma',
          description: 'Estado dental actual',
          date: odontogram.updated_at,
          data: odontogram,
          selected: false
        }] : []),
        ...treatments.map(t => ({
          id: t.id,
          type: 'treatment',
          title: t.nombre_tratamiento || 'Tratamiento',
          description: t.descripcion,
          date: t.fecha_inicio,
          data: t,
          selected: false
        })),
        ...events.map(e => ({
          id: e.id,
          type: 'event',
          title: e.title || 'Evento',
          description: e.description,
          date: e.start_date,
          data: e,
          selected: false
        }))
      ];

      setAttachments(allAttachments);
    } catch (error) {
      console.error('Error loading patient attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (selectedPatient && formData.type === TicketType.PATIENT_CASE) {
      loadPatientAttachments(selectedPatient.paciente_id);
    }
  }, [selectedPatient, formData.type]);

  const toggleAttachment = (attachment: any) => {
    const isSelected = attachments.find(a => 
      a.type === attachment.type && a.id === attachment.id && a.selected
    );
    
    const updatedAttachments = attachments.map(a => 
      a.type === attachment.type && a.id === attachment.id 
        ? { ...a, selected: !isSelected }
        : a
    );
    
    setAttachments(updatedAttachments);
  };

  const calculateMaintenanceDuration = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    
    if (diffMs < 0) return 'Fecha de fin debe ser posterior a la de inicio';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    if (diffDays > 0) {
      return `${diffDays} día(s) y ${remainingHours} hora(s)`;
    } else {
      return `${diffHours} hora(s)`;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT: return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketPriority.LOW: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return 'bg-blue-100 text-blue-800 border-blue-200';
      case TicketStatus.IN_PROGRESS: return 'bg-purple-100 text-purple-800 border-purple-200';
      case TicketStatus.PENDING_REVIEW: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketStatus.RESOLVED: return 'bg-green-100 text-green-800 border-green-200';
      case TicketStatus.CLOSED: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: TicketType) => {
    switch (type) {
      case TicketType.SYSTEM_ISSUE: return 'bg-red-100 text-red-800 border-red-200';
      case TicketType.IMPLEMENTATION: return 'bg-purple-100 text-purple-800 border-purple-200';
      case TicketType.TASK: return 'bg-blue-100 text-blue-800 border-blue-200';
      case TicketType.REMINDER: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketType.PATIENT_CASE: return 'bg-green-100 text-green-800 border-green-200';
      case TicketType.MAINTENANCE: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with System Logs Toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Soporte Técnico</h1>
            <p className="text-gray-600 mt-1">Gestión completa de todos los tickets del sistema</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showLogs 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <i className="fas fa-cog mr-2"></i>
              {showLogs ? 'Ocultar Logs' : 'Ver Logs del Sistema'}
            </button>
            <button 
              onClick={loadTickets}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-sync mr-2"></i>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* System Logs Panel */}
      {showLogs && (
        <div className="mb-6">
          <SystemLogs />
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value={TicketStatus.OPEN}>Abiertos</option>
              <option value={TicketStatus.IN_PROGRESS}>En progreso</option>
              <option value={TicketStatus.PENDING_REVIEW}>Pendiente revisión</option>
              <option value={TicketStatus.RESOLVED}>Resueltos</option>
              <option value={TicketStatus.CLOSED}>Cerrados</option>
            </select>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuevo Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedTicket.type)}`}>
                      {selectedTicket.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Detalles del Ticket</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Descripción:</span>
                      <p className="text-gray-900">{selectedTicket.description || 'Sin descripción'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Creado por:</span>
                      <p className="text-gray-900">{selectedTicket.creator?.name || 'Usuario desconocido'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Fecha de creación:</span>
                      <p className="text-gray-900">
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </p>
                    </div>
                    {selectedTicket.due_date && (
                      <div>
                        <span className="text-sm text-gray-500">Fecha límite:</span>
                        <p className="text-gray-900">
                          {new Date(selectedTicket.due_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Historial de Actividad</h3>
                  <TicketTimeline 
                    activities={(selectedTicket.activities || []).filter(activity => activity.user) as any} 
                    className="max-h-96 overflow-y-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado por
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(ticket.type)}`}>
                      {ticket.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.creator?.name || 'Usuario desconocido'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Ver detalles"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button className="text-green-600 hover:text-green-900 mr-3" title="Editar">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="text-red-600 hover:text-red-900" title="Eliminar">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-ticket-alt text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No se encontraron tickets</p>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Crear Nuevo Ticket</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                    className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                  >
                    <option value={TicketType.TASK}>Tarea</option>
                    <option value={TicketType.SYSTEM_ISSUE}>Problema del Sistema</option>
                    <option value={TicketType.IMPLEMENTATION}>Implementación</option>
                    <option value={TicketType.REMINDER}>Recordatorio</option>
                    <option value={TicketType.PATIENT_CASE}>Caso de Paciente</option>
                    <option value={TicketType.MAINTENANCE}>Mantenimiento</option>
                  </select>
                </div>

                {/* Patient Case Selection */}
                {formData.type === 'patient_case' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Paciente</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        {selectedPatient ? (
                          <div className={`bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-600`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                  {selectedPatient.nombre_completo || `${selectedPatient.nombre} ${selectedPatient.apellido}`}
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                  ID: {selectedPatient.numero_identidad || selectedPatient.paciente_id} • {selectedPatient.telefono}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedPatient(null)}
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-gray-500 dark:text-gray-400 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center`}>
                            No hay paciente seleccionado
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('DEBUG: Blue button clicked');
                          setShowPatientSearch(true);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        title="Buscar paciente"
                        style={{minWidth: '50px', minHeight: '40px'}}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="ml-1 font-bold">+</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                    placeholder="Título del ticket"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                    placeholder="Descripción detallada del ticket"
                  />
                </div>

                {/* Priority and Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prioridad *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                      className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                    >
                      <option value={TicketPriority.LOW}>Baja</option>
                      <option value={TicketPriority.MEDIUM}>Media</option>
                      <option value={TicketPriority.HIGH}>Alta</option>
                      <option value={TicketPriority.URGENT}>Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha límite</label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                    />
                  </div>
                </div>

                {/* Maintenance Window */}
                {formData.type === 'MAINTENANCE' && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-orange-900/20 border-orange-600' : 'bg-orange-50 border-orange-200'}`}>
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="font-semibold text-orange-900 dark:text-orange-100">Ventana de Mantenimiento</h3>
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                        Configure la ventana de mantenimiento para alertar a los usuarios sobre trabajos programados, actualizaciones del sistema o mantenimiento.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Fecha y Hora de Inicio *</label>
                          <input
                            type="datetime-local"
                            value={formData.maintenance_start}
                            onChange={(e) => setFormData({ ...formData, maintenance_start: e.target.value })}
                            className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                            required
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Hora de Honduras (Central Time)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Fecha y Hora de Fin *</label>
                          <input
                            type="datetime-local"
                            value={formData.maintenance_end}
                            onChange={(e) => setFormData({ ...formData, maintenance_end: e.target.value })}
                            className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                            required
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Hora de Honduras (Central Time)
                          </p>
                        </div>
                      </div>

                      {formData.maintenance_start && formData.maintenance_end && (
                        <div className={`mt-4 p-3 rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <p className="text-sm font-medium">
                            Duración: {calculateMaintenanceDuration(formData.maintenance_start, formData.maintenance_end)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patient Information Attachments */}
                {formData.type === 'patient_case' && selectedPatient && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Información del Paciente Adjunta</label>
                      <button
                        type="button"
                        onClick={() => loadPatientAttachments(selectedPatient.paciente_id)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Actualizar
                      </button>
                    </div>
                    
                    {loadingAttachments ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando información del paciente...</p>
                      </div>
                    ) : attachments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {attachments.map((attachment) => (
                          <div
                            key={`${attachment.type}-${attachment.id}`}
                            className={`p-3 border rounded-md cursor-pointer transition-colors ${
                              attachment.selected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => toggleAttachment(attachment)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">{attachment.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {attachment.type} • {new Date(attachment.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                attachment.selected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-gray-200 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
                              }`}>
                                {attachment.selected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-8-8a1 1 0 011.414-1.414L10 8.586V15a1 1 0 102 2v-5.414l7.293 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-gray-500 dark:text-gray-400 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center`}>
                        No hay información del paciente disponible
                      </div>
                    )}
                  </div>
                )}

                {/* User Assignment - Hide for maintenance tickets since they're system-wide */}
                {formData.type !== 'MAINTENANCE' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Asignar a *</label>
                    <UserSelect
                      selectedUsers={selectedUsers}
                      onUsersChange={setSelectedUsers}
                      placeholder="Seleccionar usuarios para asignar..."
                    />
                  </div>
                )}

                {/* Is Reminder */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_reminder}
                      onChange={(e) => setFormData({ ...formData, is_reminder: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Es un recordatorio</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'} transition-colors`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Crear Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Patient Search Modal */}
      <PatientSearchModal
        isOpen={showPatientSearch}
        onClose={() => setShowPatientSearch(false)}
        onSelectPatient={handleSelectPatient}
      />
    </div>
  );
}

// Patient Search Modal Component
function PatientSearchModal({ isOpen, onClose, onSelectPatient }: {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: any) => void;
}) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPatients(data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full mx-4`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Buscar Paciente</h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              ×
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 mb-4`}
            autoFocus
          />

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.paciente_id}
                  className={`p-3 border border-gray-200 dark:border-gray-600 rounded-md mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedPatient?.paciente_id === patient.paciente_id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {patient.nombre_completo || `${patient.nombre} ${patient.apellido}`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {patient.numero_identidad || patient.paciente_id} • {patient.telefono || 'No hay teléfono'}
                  </div>
                </div>
              ))
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No se encontraron pacientes
              </div>
            ) : null}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (selectedPatient) {
                  onSelectPatient(selectedPatient);
                  onClose();
                }
              }}
              disabled={!selectedPatient}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
