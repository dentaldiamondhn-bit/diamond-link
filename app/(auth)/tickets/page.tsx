'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TicketService } from '@/services/ticketService';
import { Ticket, TicketStatus, TicketType, TicketPriority, UserRole, CreateTicketData, ActivityType } from '@/types/ticket';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Filter, Clock, AlertCircle, CheckCircle, User, Calendar, MessageSquare, Settings, TrendingUp, Paperclip } from 'lucide-react';
import { UserSelect } from '@/components/calendar/UserSelect';

export default function TicketsPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
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
        // Filter tickets based on user role
        let filteredData = result.data;
        
        if (userRole !== UserRole.TECH_SUPPORT && userRole !== UserRole.ADMIN) {
          // For non-admin users, only show tickets they created or are assigned to
          filteredData = result.data.filter(ticket => {
            const isCreator = ticket.creator_id === user?.id;
            const isAssignee = ticket.assignees && ticket.assignees.some(assignee => assignee.user_id === user?.id);
            return isCreator || isAssignee;
          });
        }
        
        // Filter out MAINTENANCE tickets for non-tech-support roles
        if (userRole !== UserRole.TECH_SUPPORT) {
          filteredData = filteredData.filter(ticket => ticket.type !== 'MAINTENANCE');
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

  const canChangeTicketStatus = (ticket: Ticket) => {
    // Only assignees can change ticket status (not creators)
    // Admin and tech support can also change status for oversight
    const isAssignee = ticket.assignees && ticket.assignees.some(assignee => assignee.user_id === user?.id);
    return isAssignee || 
           userRole === UserRole.ADMIN || 
           userRole === UserRole.TECH_SUPPORT;
  };

  const canViewTicketDetails = (ticket: Ticket) => {
    // Both creators and assignees can view ticket details
    // Admin and tech support can also view for oversight
    const isCreator = ticket.creator_id === user?.id;
    const isAssignee = ticket.assignees && ticket.assignees.some(assignee => assignee.user_id === user?.id);
    return isCreator || isAssignee || 
           userRole === UserRole.ADMIN || 
           userRole === UserRole.TECH_SUPPORT;
  };

  const handleViewAttachment = (attachment: any) => {
    setSelectedAttachment(attachment);
    setShowAttachmentModal(true);
  };

  const handleCloseAttachmentModal = () => {
    setSelectedAttachment(null);
    setShowAttachmentModal(false);
  };

  const getAttachmentUrl = (attachment: any) => {
    // Generate appropriate URLs based on attachment type
    switch (attachment.attachment_type) {
      case 'treatment':
        return `/tratamientos-completados/${attachment.attachment_id}/view`;
      case 'consent':
        return `/paciente/${attachment.metadata?.paciente_id}?tab=consents&consent=${attachment.attachment_id}`;
      case 'odontogram':
        return `/paciente/${attachment.metadata?.paciente_id}?tab=odontogram&odontogram=${attachment.attachment_id}`;
      case 'event':
        return `/calendar?event=${attachment.attachment_id}`;
      default:
        return '#';
    }
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
                  
                  {canViewTicketDetails(ticket) && (
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
                        {ticket.assignees && ticket.assignees.length > 0 
                          ? `${ticket.assignees.length} asignado(s)` 
                          : 'Sin asignar'}
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
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="flex items-center">
                        <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {ticket.attachments.length} adjunto(s)
                        </span>
                      </div>
                    )}
                    {ticket.status === TicketStatus.OPEN && canChangeTicketStatus(ticket) && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, TicketStatus.IN_PROGRESS)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Iniciar
                      </button>
                    )}
                    
                    {ticket.status === TicketStatus.IN_PROGRESS && canChangeTicketStatus(ticket) && (
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
          onViewAttachment={handleViewAttachment}
        />
      )}

      {/* Attachment Detail Modal */}
      {showAttachmentModal && selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {selectedAttachment.attachment_type === 'treatment' ? 'Detalles del Tratamiento' :
                   selectedAttachment.attachment_type === 'consent' ? 'Documento de Consentimiento' :
                   selectedAttachment.attachment_type === 'odontogram' ? 'Odontograma' :
                   selectedAttachment.attachment_type === 'event' ? 'Detalles del Evento' :
                   'Adjunto'}
                </h2>
                <button
                  onClick={handleCloseAttachmentModal}
                  className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Attachment Info */}
                <div>
                  <h3 className="font-semibold mb-2">Información</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Título:</span> {selectedAttachment.attachment_title}
                    </div>
                    <div>
                      <span className="font-medium">Descripción:</span> {selectedAttachment.attachment_description}
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        selectedAttachment.attachment_type === 'treatment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        selectedAttachment.attachment_type === 'consent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        selectedAttachment.attachment_type === 'odontogram' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        selectedAttachment.attachment_type === 'event' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {selectedAttachment.attachment_type === 'treatment' ? 'Tratamiento' :
                         selectedAttachment.attachment_type === 'consent' ? 'Consentimiento' :
                         selectedAttachment.attachment_type === 'odontogram' ? 'Odontograma' :
                         selectedAttachment.attachment_type === 'event' ? 'Evento' :
                         selectedAttachment.attachment_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedAttachment.metadata && (
                  <div>
                    <h3 className="font-semibold mb-2">Detalles Adicionales</h3>
                    <div className="space-y-2 text-sm">
                      {selectedAttachment.metadata.fecha_cita && (
                        <div>
                          <span className="font-medium">Fecha:</span> {new Date(selectedAttachment.metadata.fecha_cita).toLocaleDateString()}
                        </div>
                      )}
                      {selectedAttachment.metadata.total_final && (
                        <div>
                          <span className="font-medium">Total:</span> Lps. {selectedAttachment.metadata.total_final}
                        </div>
                      )}
                      {selectedAttachment.metadata.estado && (
                        <div>
                          <span className="font-medium">Estado:</span> {selectedAttachment.metadata.estado}
                        </div>
                      )}
                      {selectedAttachment.metadata.estado_pago && (
                        <div>
                          <span className="font-medium">Estado de Pago:</span> {selectedAttachment.metadata.estado_pago}
                        </div>
                      )}
                      {selectedAttachment.metadata.paciente && (
                        <div>
                          <span className="font-medium">Paciente:</span> {selectedAttachment.metadata.paciente.nombre_completo}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      const url = getAttachmentUrl(selectedAttachment);
                      if (url !== '#') {
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Ver en Sistema
                  </button>
                  <button
                    onClick={handleCloseAttachmentModal}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} rounded-md transition-colors`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow ticket creation without assignees for now
    // if (selectedUsers.length === 0) {
    //   alert('Debe asignar al menos un usuario a este ticket');
    //   return;
    // }
    
    const submitData = {
      ...formData,
      assignee_ids: selectedUsers.map(u => u.id),
      attachments: getSelectedAttachments(),
      patient_id: selectedPatient?.paciente_id || ''
    };
    
    onSubmit(submitData);
  };

  const handleSelectPatient = (patient: any) => {
    console.log('DEBUG: Patient selected:', patient); // DEBUG LOG
    setSelectedPatient(patient);
    setShowPatientSearch(false);
    // Clear attachments when patient changes
    setAttachments([]);
    console.log('DEBUG: Patient set, formData.type:', formData.type); // DEBUG LOG
  };

  const loadPatientAttachments = async (patientId: string) => {
    console.log('DEBUG: Loading patient attachments for:', patientId); // DEBUG LOG
    setLoadingAttachments(true);
    try {
      // Load consents
      const consentsResponse = await fetch(`/api/patients/${patientId}/consents`);
      const consents = consentsResponse.ok ? await consentsResponse.json() : [];
      
      // Load odontogram
      const odontogramResponse = await fetch(`/api/patients/${patientId}/odontogram`);
      const odontogram = odontogramResponse.ok ? await odontogramResponse.json() : null;
      
      // Load treatments
      console.log('DEBUG: Fetching tratamientos-completados for patient:', patientId); // DEBUG LOG
      const treatmentsResponse = await fetch(`/api/tratamientos-completados?paciente_id=${patientId}`);
      const treatments = treatmentsResponse.ok ? await treatmentsResponse.json() : [];
      console.log('DEBUG: Treatments response:', treatmentsResponse.ok, treatments.length, 'items'); // DEBUG LOG
      
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
        ...treatments.map(t => {
          console.log('DEBUG: Treatment data:', t); // DEBUG LOG
          const treatmentItems = t.tratamientos_realizados || [];
          console.log('DEBUG: Treatment items array:', JSON.stringify(treatmentItems)); // DEBUG LOG
          console.log('DEBUG: Treatment items length:', treatmentItems.length); // DEBUG LOG
          console.log('DEBUG: Treatment items type:', Array.isArray(treatmentItems)); // DEBUG LOG
          const treatmentCount = treatmentItems.reduce((sum, tr) => sum + (tr.cantidad || 1), 0);
          const treatmentTotal = treatmentItems.reduce((sum, tr) => sum + ((tr.precio_final || 0) * (tr.cantidad || 1)), 0) || t.total_final || 0;
          console.log('DEBUG: Calculated total:', treatmentTotal, 'vs total_final:', t.total_final); // DEBUG LOG
          console.log('DEBUG: Total treatment count:', treatmentCount); // DEBUG LOG
          const treatmentNames = treatmentItems.length > 0 
            ? treatmentItems.map(tr => tr.nombre_tratamiento).join(', ')
            : t.nombre_tratamiento || 'Tratamiento';
          console.log('DEBUG: Treatment names:', treatmentNames); // DEBUG LOG
          return {
            id: t.id,
            type: 'treatment',
            title: `${t.nombre_tratamiento || 'Tratamiento'} (${treatmentCount} tratamiento${treatmentCount > 1 ? 's' : ''})`,
            description: `${treatmentNames} • Lps. ${treatmentTotal} • ${t.estado || ''}`,
            date: t.fecha_cita,
            data: t
          }
        }),
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
    console.log('DEBUG: useEffect triggered - selectedPatient:', selectedPatient, 'formData.type:', formData.type); // DEBUG LOG
    console.log('DEBUG: TicketType.PATIENT_CASE value:', TicketType.PATIENT_CASE); // DEBUG LOG
    if (selectedPatient && formData.type === TicketType.PATIENT_CASE) {
      console.log('DEBUG: Loading attachments for patient case'); // DEBUG LOG
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
    console.log('DEBUG: All attachments:', attachments);
    console.log('DEBUG: Selected attachments:', attachments.filter(a => a.selected));
    const selected = attachments.filter(a => a.selected).map(a => ({
      attachment_type: a.type,
      attachment_id: a.id,
      attachment_title: a.title,
      attachment_description: a.description,
      metadata: a.data
    }));
    console.log('DEBUG: Mapped attachments:', selected);
    return selected;
  };

  useEffect(() => {
    const selectedAttachments = getSelectedAttachments();
    setFormData(prev => ({ ...prev, attachments: selectedAttachments }));
  }, [attachments]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Crear Nuevo Ticket
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type - Moved to top */}
            <div>
                <label className="block text-sm font-medium mb-2">Tipo de Ticket</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={TicketType.TASK}>Tarea</option>
                  <option value={TicketType.SYSTEM_ISSUE}>Problema del Sistema</option>
                  <option value={TicketType.IMPLEMENTATION}>Implementación (Sugerencia)</option>
                  <option value={TicketType.REMINDER}>Recordatorio</option>
                  <option value={TicketType.PATIENT_CASE}>Caso de Paciente</option>
                </select>
              </div>

            {/* Patient Case Selection */}
            {formData.type === TicketType.PATIENT_CASE && (
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
                              {attachment.type} • {attachment.date ? new Date(attachment.date).toLocaleDateString('es-HN', { timeZone: 'UTC' }) : 'Sin fecha'}
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
              <label className="block text-sm font-medium mb-2">Título del Ticket *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                placeholder="Ej: Problema con tratamiento del paciente"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción del Caso</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full rounded-md border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2`}
                rows={3}
                placeholder="Describa el problema o caso del paciente..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prioridad del Ticket *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Ticket'}
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
  onUpdate,
  onViewAttachment 
}: { 
  ticket: Ticket; 
  onClose: () => void; 
  userRole: UserRole;
  onUpdate: () => void;
  onViewAttachment: (attachment: any) => void;
}) {
  const { theme } = useTheme();
  const { user } = useUser();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddComment = async (ticketId?: string) => {
    if (!comment.trim() || !user?.id) return;

    try {
      setLoading(true);
      await TicketService.addComment(ticketId || ticket.id, user.id, comment);
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

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Adjuntos</h3>
                  <div className="space-y-2">
                    {ticket.attachments.map((attachment) => (
                      <div key={attachment.id} className={`p-3 rounded-lg border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <h4 className="font-medium text-sm">{attachment.attachment_title}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${
                                attachment.attachment_type === 'treatment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                attachment.attachment_type === 'consent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                attachment.attachment_type === 'odontogram' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                attachment.attachment_type === 'event' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {attachment.attachment_type === 'treatment' ? 'Tratamiento' :
                                 attachment.attachment_type === 'consent' ? 'Consentimiento' :
                                 attachment.attachment_type === 'odontogram' ? 'Odontograma' :
                                 attachment.attachment_type === 'event' ? 'Evento' :
                                 attachment.attachment_type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {attachment.attachment_description}
                            </p>
                            {attachment.metadata && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {attachment.metadata.fecha_cita && (
                                  <span>Fecha: {new Date(attachment.metadata.fecha_cita).toLocaleDateString()}</span>
                                )}
                                {attachment.metadata.total_final && (
                                  <span className="ml-3">Total: Lps. {attachment.metadata.total_final}</span>
                                )}
                                {attachment.metadata.estado && (
                                  <span className="ml-3">Estado: {attachment.metadata.estado}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {attachment.attachment_type === 'treatment' && attachment.metadata && (
                              <button
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                onClick={() => onViewAttachment(attachment)}
                              >
                                Ver Detalles
                              </button>
                            )}
                            {attachment.attachment_type === 'consent' && attachment.metadata && (
                              <button
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                onClick={() => onViewAttachment(attachment)}
                              >
                                Ver Documento
                              </button>
                            )}
                            {attachment.attachment_type === 'odontogram' && attachment.metadata && (
                              <button
                                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                onClick={() => onViewAttachment(attachment)}
                              >
                                Ver Odontograma
                              </button>
                            )}
                            {attachment.attachment_type === 'event' && attachment.metadata && (
                              <button
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                                onClick={() => onViewAttachment(attachment)}
                              >
                                Ver Evento
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Línea de Tiempo de Actividad</h4>
                {ticket.activities && ticket.activities.length > 0 ? (
                  <div className="space-y-3">
                    {ticket.activities.map((activity) => (
                      <div key={activity.id} className={`p-3 rounded-lg border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {activity.activity_type === ActivityType.STATUS_CHANGE && 'Cambio de estado'}
                              {activity.activity_type === ActivityType.COMMENT && 'Comentario'}
                              {activity.activity_type === ActivityType.ASSIGNMENT && 'Asignación'}
                              {activity.activity_type === ActivityType.EDIT && 'Edición'}
                            </p>
                            <p className="text-sm mt-1">{activity.content}</p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No hay actividades</p>
                )}

              {/* Add Comment */}
              <div>
                <h3 className="font-semibold mb-2">Agregar Comentario</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    className={`flex-1 px-3 py-2 border rounded-md ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <button
                    onClick={() => handleAddComment(ticket.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
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
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tipo de Ticket</span>
                    <p className="font-medium">{ticket.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Prioridad</span>
                    <p className="font-medium">{ticket.priority}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Estado</span>
                    <p className="font-medium">{ticket.status}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Creado por</span>
                    <p className="font-medium">{ticket.creator?.name || 'Usuario'}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Asignado a</span>
                    <p className="font-medium">
                      {ticket.assignees && ticket.assignees.length > 0 
                        ? `${ticket.assignees.length} usuario(s)` 
                        : 'Sin asignar'}
                    </p>
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
