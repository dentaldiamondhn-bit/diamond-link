'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TicketService } from '@/services/ticketService';
import { Ticket, TicketStatus, TicketType, TicketPriority, UserRole, CreateTicketData } from '@/types/ticket';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Filter, Clock, AlertCircle, CheckCircle, User, Calendar, MessageSquare, Settings, TrendingUp } from 'lucide-react';
import { UserSelect } from '@/components/calendar/UserSelect';

export default function TicketsPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
    search: ''
  });

  // User role from metadata - handle both role formats
  const userRole = user?.publicMetadata?.role as UserRole || UserRole.STAFF;
  const normalizedUserRole = userRole?.replace('-', '_')?.toUpperCase() as any;

  useEffect(() => {
    loadTickets();
  }, [userRole]);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let result;
      
      if (userRole === UserRole.TECH_SUPPORT || userRole === UserRole.ADMIN) {
        // Tech support and admin can see all tickets
        result = await TicketService.getTickets({});
      } else if (userRole === UserRole.DOCTOR) {
        // Doctors can see department tickets
        result = await TicketService.getTickets({});
      } else {
        // Staff can see their assigned and created tickets
        result = await TicketService.getTickets({});
      }

      if (result.data) {
        // Filter out MAINTENANCE tickets for non-tech-support roles
        let filteredData = result.data;
        if (userRole !== UserRole.TECH_SUPPORT) {
          filteredData = result.data.filter(ticket => ticket.type !== 'MAINTENANCE');
        }
        setTickets(filteredData);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    if (filters.status) {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }
    if (filters.type) {
      filtered = filtered.filter(ticket => ticket.type === filters.type);
    }
    if (filters.priority) {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }
    if (filters.search) {
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  };

  const handleCreateTicket = async (ticketData: CreateTicketData) => {
    if (!user?.id) return;

    try {
      const result = await TicketService.createTicket(ticketData, user.id);
      if (result.data) {
        setShowCreateModal(false);
        loadTickets(); // Refresh tickets
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await TicketService.updateTicket(ticketId, { status: newStatus }, user?.id || '');
      loadTickets(); // Refresh tickets
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT: return 'text-red-600 bg-red-50 border-red-200';
      case TicketPriority.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case TicketPriority.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case TicketPriority.LOW: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return 'text-blue-600 bg-blue-50 border-blue-200';
      case TicketStatus.IN_PROGRESS: return 'text-purple-600 bg-purple-50 border-purple-200';
      case TicketStatus.PENDING_REVIEW: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case TicketStatus.RESOLVED: return 'text-green-600 bg-green-50 border-green-200';
      case TicketStatus.CLOSED: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case TicketType.SYSTEM_ISSUE: return <Settings className="w-4 h-4" />;
      case TicketType.IMPLEMENTATION: return <TrendingUp className="w-4 h-4" />;
      case TicketType.TASK: return <CheckCircle className="w-4 h-4" />;
      case TicketType.REMINDER: return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const canCreateTicket = () => {
    // Handle both role formats (tech_support and tech-support)
    return normalizedUserRole === 'STAFF' || 
           normalizedUserRole === 'DOCTOR' || 
           normalizedUserRole === 'ADMIN' || 
           normalizedUserRole === 'TECH_SUPPORT';
  };

  const canEditTicket = (ticket: Ticket) => {
    return ticket.creator_id === user?.id || 
           ticket.assignee_id === user?.id || 
           userRole === UserRole.ADMIN || 
           userRole === UserRole.TECH_SUPPORT;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Contenido Principal */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sección de Bienvenida */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Tickets y Tareas
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Gestiona tickets y tareas para la clínica dental
              </p>
              <div className="mt-4 flex justify-end">
                {canCreateTicket() && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Ticket
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center">
                <Filter className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={`rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                >
                  <option value="">Todos los Estados</option>
                  <option value={TicketStatus.OPEN}>Abierto</option>
                  <option value={TicketStatus.IN_PROGRESS}>En Progreso</option>
                  <option value={TicketStatus.PENDING_REVIEW}>Revisión Pendiente</option>
                  <option value={TicketStatus.RESOLVED}>Resuelto</option>
                  <option value={TicketStatus.CLOSED}>Cerrado</option>
                </select>
              </div>

              <div className="flex items-center">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className={`rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                >
                  <option value="">Todos los Tipos</option>
                  <option value={TicketType.SYSTEM_ISSUE}>Problema del Sistema</option>
                  <option value={TicketType.IMPLEMENTATION}>Implementación</option>
                  <option value={TicketType.TASK}>Tarea</option>
                  <option value={TicketType.REMINDER}>Recordatorio</option>
                </select>
              </div>

              <div className="flex items-center">
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className={`rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                >
                  <option value="">Todas las Prioridades</option>
                  <option value={TicketPriority.LOW}>Baja</option>
                  <option value={TicketPriority.MEDIUM}>Media</option>
                  <option value={TicketPriority.HIGH}>Alta</option>
                  <option value={TicketPriority.URGENT}>Urgente</option>
                </select>
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar tickets..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                />
              </div>
            </div>
          </div>

        {/* Tickets Grid */}
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(ticket.type)}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{ticket.title}</h3>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  {canEditTicket(ticket) && (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Description */}
                {ticket.description && (
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ticket.description.length > 150 
                      ? `${ticket.description.substring(0, 150)}...` 
                      : ticket.description
                    }
                  </p>
                )}

                {/* Metadata */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {ticket.assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                    
                    {ticket.due_date && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {new Date(ticket.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {ticket.status === TicketStatus.OPEN && canEditTicket(ticket) && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, TicketStatus.IN_PROGRESS)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Iniciar
                      </button>
                    )}
                    
                    {ticket.status === TicketStatus.IN_PROGRESS && canEditTicket(ticket) && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, TicketStatus.RESOLVED)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTickets.length === 0 && !loading && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">No se encontraron tickets</h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                {filters.search || filters.status || filters.type || filters.priority 
                  ? 'Intenta ajustar los filtros' 
                  : 'Crea tu primer ticket para comenzar'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
          userRole={userRole}
        />
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          userRole={userRole}
          onUpdate={loadTickets}
        />
      )}
    </>
  );
}

// Create Ticket Modal Component
function CreateTicketModal({ onClose, onSubmit, userRole }: { 
  onClose: () => void; 
  onSubmit: (data: CreateTicketData) => void;
  userRole: UserRole;
}) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    type: TicketType.TASK,
    priority: TicketPriority.MEDIUM,
    due_date: '',
    is_reminder: false,
    assignee_ids: [],
    attachments: [],
    patient_id: ''
  });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showAttachmentSearch, setShowAttachmentSearch] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert('Debe asignar al menos un usuario a este ticket');
      return;
    }
    
    const submitData = {
      ...formData,
      assignee_ids: selectedUsers.map(u => u.id),
      attachments,
      patient_id: selectedPatient?.paciente_id || ''
    };
    
    onSubmit(submitData);
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
          data: c
        })),
        ...(odontogram ? [{
          id: odontogram.id,
          type: 'odontogram',
          title: 'Odontograma',
          description: 'Estado dental actual',
          date: odontogram.updated_at,
          data: odontogram
        }] : []),
        ...treatments.map(t => ({
          id: t.id,
          type: 'treatment',
          title: t.nombre_tratamiento || 'Tratamiento',
          description: t.descripcion,
          date: t.fecha_inicio,
          data: t
        })),
        ...events.map(e => ({
          id: e.id,
          type: 'event',
          title: e.title || 'Evento',
          description: e.description,
          date: e.start_date,
          data: e
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

  const getSelectedAttachments = () => {
    return attachments.filter(a => a.selected).map(a => ({
      attachment_type: a.type,
      attachment_id: a.id,
      attachment_title: a.title,
      attachment_description: a.description,
      metadata: a.data
    }));
  };

  useEffect(() => {
    const selectedAttachments = getSelectedAttachments();
    setFormData(prev => ({ ...prev, attachments: selectedAttachments }));
  }, [attachments]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Crear Nuevo Ticket</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type - Moved to top */}
            <div>
              <label className="block text-sm font-medium mb-2">Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
              >
                <option value={TicketType.TASK}>Tarea</option>
                <option value={TicketType.SYSTEM_ISSUE}>Problema del Sistema</option>
                <option value={TicketType.IMPLEMENTATION}>Implementación (Sugerencia)</option>
                <option value={TicketType.REMINDER}>Recordatorio</option>
                <option value={TicketType.PATIENT_CASE}>Caso de Paciente</option>
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
                    onClick={() => setShowPatientSearch(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    title="Buscar paciente"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Patient Information Attachments */}
            {formData.type === TicketType.PATIENT_CASE && selectedPatient && (
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${
                                attachment.type === 'consent' ? 'bg-green-500' :
                                attachment.type === 'odontogram' ? 'bg-blue-500' :
                                attachment.type === 'treatment' ? 'bg-purple-500' :
                                attachment.type === 'event' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className="font-medium text-sm">{attachment.title}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {attachment.description}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {attachment.type} • {new Date(attachment.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-2">
                            {attachment.selected ? (
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                    No se encontró información del paciente para adjuntar
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Título *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* User Assignment - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Asignado a *
              </label>
              <UserSelect
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                placeholder="Seleccionar usuarios para asignar..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Seleccione al menos un usuario para asignar este ticket
              </p>
            </div>

            {formData.type === TicketType.REMINDER && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_reminder"
                  checked={formData.is_reminder}
                  onChange={(e) => setFormData({ ...formData, is_reminder: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_reminder" className="text-sm">Este es un ticket de recordatorio</label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-md ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
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

      {/* Patient Search Modal */}
      {showPatientSearch && (
        <PatientSearchModal
          isOpen={showPatientSearch}
          onClose={() => setShowPatientSearch(false)}
          onSelectPatient={handleSelectPatient}
        />
      )}
    </div>
  );
}

// Patient Search Modal Component - Fixed to match EventModal
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

// Ticket Detail Modal Component
function TicketDetailModal({ 
  ticket, 
  onClose, 
  userRole, 
  onUpdate 
}: { 
  ticket: Ticket; 
  onClose: () => void; 
  userRole: UserRole;
  onUpdate: () => void;
}) {
  const { theme } = useTheme();
  const { user } = useUser();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddComment = async () => {
    if (!comment.trim() || !user?.id) return;

    try {
      setLoading(true);
      await TicketService.addComment(ticket.id, user.id, comment);
      setComment('');
      onUpdate(); // Refresh ticket data
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{ticket.title}</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description */}
              {ticket.description && (
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Comments/Activities */}
              <div>
                <h3 className="font-semibold mb-4">Línea de Tiempo de Actividad</h3>
                <div className="space-y-3">
                  {ticket.activities?.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          activity.activity_type === 'STATUS_CHANGE' ? 'bg-blue-600' :
                          activity.activity_type === 'COMMENT' ? 'bg-green-600' :
                          activity.activity_type === 'ASSIGNMENT' ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}>
                          {activity.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{activity.user?.name}</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {activity.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Comment */}
              <div>
                <h3 className="font-semibold mb-2">Agregar Comentario</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    className={`flex-1 rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={loading || !comment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Agregando...' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Metadata */}
              <div>
                <h3 className="font-semibold mb-3">Detalles</h3>
                <div className="space-y-2">
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tipo</span>
                    <p className="font-medium">{ticket.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Prioridad</span>
                    <p className="font-medium">{ticket.priority}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Estado</span>
                    <p className="font-medium">{ticket.status.replace('_', ' ')}</p>
                  </div>
                  {ticket.due_date && (
                    <div>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Fecha de Vencimiento</span>
                      <p className="font-medium">{new Date(ticket.due_date).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Creado por</span>
                    <p className="font-medium">{ticket.creator?.name}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Asignado a</span>
                    <p className="font-medium">{ticket.assignee?.name || 'Sin asignar'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
