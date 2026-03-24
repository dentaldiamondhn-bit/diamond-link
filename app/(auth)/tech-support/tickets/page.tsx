'use client';

import React, { useState, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import { TicketService } from '@/services/ticketService';
import { StorageService } from '@/services/storageService';
import { Ticket, TicketStatus, TicketPriority, TicketType, CreateTicketData, CreateTicketAttachmentData, UserRole } from '@/types/ticket';
import SystemLogs from '@/components/SystemLogs';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { UserSelect } from '@/components/calendar/UserSelect';
import { 
  Ticket as TicketIcon, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Settings, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar,
  Paperclip,
  FileText,
  Wrench,
  Bug,
  Lightbulb,
  Bell,
  Users,
  Activity,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Zap,
  Send
} from 'lucide-react';

export default function TechSupportTickets() {
  const { userRole } = useRoleBasedAccess();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Prevent hydration mismatch - show loading until client is ready
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
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
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'warning', text: string} | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

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

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await TicketService.updateTicket(ticketId, { status: newStatus }, user?.id || '');
      loadTickets(); // Refresh tickets
      
      // Update the selected ticket if it's the one being modified
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleAddComment = async (ticketId?: string) => {
    if (!comment.trim() || !user?.id) return;

    try {
      setCommentLoading(true);
      await TicketService.addComment(ticketId || selectedTicket?.id, user.id, comment);
      setComment('');
      loadTickets(); // Refresh to get updated activities
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: CreateTicketData) => {
    if (!user?.id) return;

    try {
      // Convert uploaded document URLs to attachment format
      const docAttachments: CreateTicketAttachmentData[] = uploadedDocuments.map(url => {
        const fileName = decodeURIComponent(url.split('/').pop() || 'documento');
        return {
          attachment_type: 'document' as const,
          attachment_id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          attachment_title: fileName,
          file_url: url
        };
      });
      
      // Add uploaded documents to the ticket data
      const ticketDataWithDocs = {
        ...ticketData,
        attachments: [...(ticketData.attachments || []), ...docAttachments]
      };
      
      const result = await TicketService.createTicket(ticketDataWithDocs, user.id);
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
        setUploadedDocuments([]);
        setUploadMessage(null);
        loadTickets(); // Refresh tickets
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  // Handle document upload for ticket
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      
      // Use a ticket-specific folder - generate a temporary ID until ticket is created
      formData.append('ticketId', `temp-${Date.now()}`);
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/upload-ticket-documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documentos');
      }

      // Add uploaded URLs to state
      if (result.uploadedUrls && result.uploadedUrls.length > 0) {
        setUploadedDocuments(prev => [...prev, ...result.uploadedUrls]);
      }

      // Show success message
      const message = `Se subieron ${result.uploadedUrls.length} archivo(s) correctamente.`;
      
      setUploadMessage({
        type: 'success',
        text: message
      });

      // Clear file input
      e.target.value = '';

      // Clear message after 5 seconds
      setTimeout(() => {
        setUploadMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Document upload error:', error);
      setUploadMessage({
        type: 'warning',
        text: 'Error al subir documentos: ' + (error as Error).message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remove uploaded document
  const removeUploadedDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
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
      const treatmentsResponse = await fetch(`/api/patients/${patientId}/tratamientos-completados`);
      const treatments = treatmentsResponse.ok ? await treatmentsResponse.json() : [];
      
      // Load events
      const eventsResponse = await fetch(`/api/patients/${patientId}/events`);
      const events = eventsResponse.ok ? await eventsResponse.json() : [];
      
      // Load presupuestos
      const presupuestosResponse = await fetch(`/api/presupuestos`);
      const presupuestos = presupuestosResponse.ok ? await presupuestosResponse.json() : [];
      const patientPresupuestos = presupuestos.filter((p: any) => p.paciente_id === patientId);

      const allAttachments = [
        ...consents.map((c: any) => ({
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
        ...treatments.map((t: any) => ({
          id: t.id,
          type: 'treatment',
          title: t.nombre_tratamiento || 'Tratamiento',
          description: t.descripcion,
          date: t.fecha_cita,
          data: t,
          selected: false
        })),
        ...events.map((e: any) => ({
          id: e.id,
          type: 'event',
          title: e.title || 'Evento',
          description: e.description,
          date: e.start_date,
          data: e,
          selected: false
        })),
        ...patientPresupuestos.map((p: any) => ({
          id: p.id,
          type: 'presupuesto',
          title: p.nombre || 'Presupuesto',
          description: p.descripcion || `Presupuesto #${p.id}`,
          date: p.created_at,
          data: p,
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
    if (selectedPatient && formData.type === 'PATIENT_CASE') {
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

  // Modern status colors with gradients
  const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: 
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600', 
          text: 'text-white',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      case TicketStatus.IN_PROGRESS: 
        return { 
          bg: 'bg-gradient-to-r from-violet-500 to-violet-600', 
          text: 'text-white',
          icon: <Activity className="w-3.5 h-3.5" />
        };
      case TicketStatus.PENDING_REVIEW: 
        return { 
          bg: 'bg-gradient-to-r from-amber-500 to-amber-600', 
          text: 'text-white',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case TicketStatus.RESOLVED: 
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600', 
          text: 'text-white',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case TicketStatus.CLOSED: 
        return { 
          bg: 'bg-gradient-to-r from-slate-500 to-slate-600', 
          text: 'text-white',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      default: 
        return { 
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600', 
          text: 'text-white',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
    }
  };

  // Modern priority colors
  const getPriorityStyles = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT: 
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-red-600', 
          text: 'text-white',
          glow: 'shadow-red-500/30'
        };
      case TicketPriority.HIGH: 
        return { 
          bg: 'bg-gradient-to-r from-orange-500 to-orange-600', 
          text: 'text-white',
          glow: 'shadow-orange-500/30'
        };
      case TicketPriority.MEDIUM: 
        return { 
          bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', 
          text: 'text-white',
          glow: 'shadow-amber-500/30'
        };
      case TicketPriority.LOW: 
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500', 
          text: 'text-white',
          glow: 'shadow-emerald-500/30'
        };
      default: 
        return { 
          bg: 'bg-gradient-to-r from-gray-500 to-slate-500', 
          text: 'text-white',
          glow: 'shadow-gray-500/30'
        };
    }
  };

  // Type icons
  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case TicketType.SYSTEM_ISSUE: return <Bug className="w-4 h-4" />;
      case TicketType.IMPLEMENTATION: return <Lightbulb className="w-4 h-4" />;
      case TicketType.TASK: return <CheckCircle className="w-4 h-4" />;
      case TicketType.REMINDER: return <Bell className="w-4 h-4" />;
      case TicketType.PATIENT_CASE: return <User className="w-4 h-4" />;
      case TicketType.MAINTENANCE: return <Wrench className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  // Ticket statistics
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
    resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl mb-6">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Panel de Soporte Técnico</h1>
              </div>
              <p className="text-indigo-100 text-lg">Gestión completa de todos los tickets del sistema</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  showLogs 
                    ? 'bg-white text-purple-600 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">{showLogs ? 'Ocultar Logs' : 'Ver Logs'}</span>
              </button>
              <button 
                onClick={loadTickets}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="font-medium">Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <TicketIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Abiertos</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">En Progreso</p>
              <p className="text-2xl font-bold text-violet-600">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Resueltos</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* System Logs Panel */}
      {showLogs && (
        <div className="mb-6">
          <SystemLogs />
        </div>
      )}

      {/* Modern Filters and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Todos', count: stats.total },
              { value: TicketStatus.OPEN, label: 'Abiertos', count: stats.open },
              { value: TicketStatus.IN_PROGRESS, label: 'En Progreso', count: stats.inProgress },
              { value: TicketStatus.RESOLVED, label: 'Resueltos', count: stats.resolved }
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === item.value
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <span>{item.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === item.value 
                    ? 'bg-white/20' 
                    : 'bg-slate-200 dark:bg-slate-600'
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Grid - Modern Card Layout */}
      <div className="grid gap-4 w-full overflow-x-hidden">
        {filteredTickets.map((ticket) => {
          const statusStyles = getStatusStyles(ticket.status);
          const priorityStyles = getPriorityStyles(ticket.priority);
          
          return (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="group bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-2xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 w-full overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full overflow-hidden">
                {/* Left Section - Type Icon & Title */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-xl ${
                    ticket.type === TicketType.SYSTEM_ISSUE ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                    ticket.type === TicketType.IMPLEMENTATION ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                    ticket.type === TicketType.MAINTENANCE ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                    ticket.type === TicketType.PATIENT_CASE ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    ticket.type === TicketType.REMINDER ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  }`}>
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {ticket.ticket_number && (
                          <span className="inline-flex items-center px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium mr-2">
                            {ticket.ticket_number}
                          </span>
                        )}
                        {ticket.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm truncate mt-1">
                        {ticket.description || 'Sin descripción'}
                      </p>
                    </div>
                </div>

                {/* Middle Section - Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text} shadow-sm`}>
                    {statusStyles.icon}
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${priorityStyles.bg} ${priorityStyles.text} shadow-sm`}>
                    {ticket.priority}
                  </span>
                </div>

                {/* Right Section - Meta */}
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span className="truncate max-w-[100px]">{ticket.creator?.name || 'Usuario'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(ticket.created_at).toLocaleDateString('es-HN')}</span>
                  </div>
                  {ticket.assignees && ticket.assignees.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{ticket.assignees.length}</span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <TicketIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No se encontraron tickets</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchTerm || filter !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Crea tu primer ticket para comenzar'
            }
          </p>
        </div>
      )}

      {/* Ticket Detail Modal - Modern Design */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    selectedTicket.type === TicketType.SYSTEM_ISSUE ? 'bg-white/20 text-white' :
                    selectedTicket.type === TicketType.IMPLEMENTATION ? 'bg-white/20 text-white' :
                    'bg-white/20 text-white'
                  }`}>
                    {getTypeIcon(selectedTicket.type)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedTicket.ticket_number && (
                        <span className="inline-flex items-center px-3 py-2 bg-white/20 rounded-xl text-sm font-medium mr-3">
                          {selectedTicket.ticket_number}
                        </span>
                      )}
                      {selectedTicket.title}
                    </h2>
                    <div className="flex gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                        {selectedTicket.type}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Status & Priority Row */}
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const statusStyles = getStatusStyles(selectedTicket.status);
                      const priorityStyles = getPriorityStyles(selectedTicket.priority);
                      return (
                        <>
                          {/* Status Dropdown - allows changing status in modal */}
                          <div className="relative">
                            <select
                              value={selectedTicket.status}
                              onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                              className={`appearance-none px-4 py-2 pr-10 rounded-full text-sm font-medium cursor-pointer transition-all shadow-lg ${
                                selectedTicket.status === TicketStatus.OPEN 
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50' 
                                  : selectedTicket.status === TicketStatus.IN_PROGRESS
                                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                                  : selectedTicket.status === TicketStatus.PENDING_REVIEW
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                  : selectedTicket.status === TicketStatus.RESOLVED
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                  : selectedTicket.status === TicketStatus.CLOSED
                                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              <option value={TicketStatus.OPEN}>Abierto</option>
                              <option value={TicketStatus.IN_PROGRESS}>En Progreso</option>
                              <option value={TicketStatus.PENDING_REVIEW}>Pendiente Revisión</option>
                              <option value={TicketStatus.RESOLVED}>Resuelto</option>
                              <option value={TicketStatus.CLOSED}>Cerrado</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ChevronDown className={`w-4 h-4 ${
                                selectedTicket.status === TicketStatus.OPEN ? 'text-blue-500' 
                                : selectedTicket.status === TicketStatus.IN_PROGRESS ? 'text-violet-500'
                                : selectedTicket.status === TicketStatus.PENDING_REVIEW ? 'text-amber-500'
                                : selectedTicket.status === TicketStatus.RESOLVED ? 'text-emerald-500'
                                : 'text-slate-500'
                              }`} />
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${priorityStyles.bg} ${priorityStyles.text} shadow-lg`}>
                            {selectedTicket.priority}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Descripción
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedTicket.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Attachments */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-indigo-600" />
                        Adjuntos ({selectedTicket.attachments.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedTicket.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="text-slate-700 dark:text-slate-300">{attachment.attachment_title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Timeline */}
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600" />
                      Línea de Tiempo de Actividad
                    </h3>
                    {selectedTicket.activities && selectedTicket.activities.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTicket.activities.map((activity) => (
                          <div key={activity.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                  {activity.activity_type === 'STATUS_CHANGE' && 'Cambio de estado'}
                                  {activity.activity_type === 'COMMENT' && 'Comentario'}
                                  {activity.activity_type === 'ASSIGNMENT' && 'Asignación'}
                                  {activity.activity_type === 'EDIT' && 'Edición'}
                                </p>
                                <p className="text-sm mt-1 text-slate-800 dark:text-white">{activity.content}</p>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {new Date(activity.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                          <Activity className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">No hay actividad registrada</p>
                      </div>
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Agregar Comentario</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escribe tu comentario..."
                        className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedTicket?.id)}
                      />
                      <button
                        onClick={() => handleAddComment(selectedTicket?.id)}
                        disabled={commentLoading || !comment.trim()}
                        className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Detalles
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tipo de Ticket</p>
                        <p className="font-medium text-slate-800 dark:text-white">{selectedTicket.type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Prioridad</p>
                        <p className="font-medium text-slate-800 dark:text-white">{selectedTicket.priority}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Fecha de creación</p>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {new Date(selectedTicket.created_at).toLocaleString('es-HN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Creado por</p>
                        <p className="font-medium text-slate-800 dark:text-white">{selectedTicket.creator?.name || 'Usuario desconocido'}</p>
                      </div>
                      {selectedTicket.due_date && (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Fecha límite</p>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {new Date(selectedTicket.due_date).toLocaleString('es-HN')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Asignados</p>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {selectedTicket.assignees && selectedTicket.assignees.length > 0 
                            ? selectedTicket.assignees.map(a => a.user?.name || 'Usuario').join(', ')
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
      )}

      {/* Create Ticket Modal - Modern Design */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Crear Nuevo Ticket</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setUploadedDocuments([]);
                    setUploadMessage(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                {formData.type === TicketType.PATIENT_CASE && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Paciente</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        {selectedPatient ? (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold text-indigo-900 dark:text-indigo-100">
                                  {selectedPatient.nombre_completo || `${selectedPatient.nombre} ${selectedPatient.apellido}`}
                                </div>
                                <div className="text-sm text-indigo-700 dark:text-indigo-300">
                                  ID: {selectedPatient.numero_identidad || selectedPatient.paciente_id} • {selectedPatient.telefono}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedPatient(null)}
                                className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 dark:text-slate-400 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-center">
                            No hay paciente seleccionado
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPatientSearch(true)}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Título del ticket"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Descripción detallada del ticket"
                  />
                </div>

                {/* Priority and Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prioridad *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      <option value={TicketPriority.LOW}>Baja</option>
                      <option value={TicketPriority.MEDIUM}>Media</option>
                      <option value={TicketPriority.HIGH}>Alta</option>
                      <option value={TicketPriority.URGENT}>Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fecha límite</label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Maintenance Window */}
                {formData.type === 'MAINTENANCE' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-xl border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center mb-3">
                      <Wrench className="w-5 h-5 text-orange-600 mr-2" />
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">Ventana de Mantenimiento</h3>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                      Configure la ventana de mantenimiento para alertar a los usuarios sobre trabajos programados.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Fecha y Hora de Inicio *</label>
                        <input
                          type="datetime-local"
                          value={formData.maintenance_start}
                          onChange={(e) => setFormData({ ...formData, maintenance_start: e.target.value })}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Fecha y Hora de Fin *</label>
                        <input
                          type="datetime-local"
                          value={formData.maintenance_end}
                          onChange={(e) => setFormData({ ...formData, maintenance_end: e.target.value })}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    {formData.maintenance_start && formData.maintenance_end && (
                      <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Duración: {calculateMaintenanceDuration(formData.maintenance_start, formData.maintenance_end)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* User Assignment */}
                {formData.type !== 'MAINTENANCE' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Asignar a *</label>
                    <UserSelect
                      selectedUsers={selectedUsers}
                      onUsersChange={setSelectedUsers}
                      placeholder="Seleccionar usuarios para asignar..."
                    />
                  </div>
                )}

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Documentos adjuntos</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      id="ticket-documentos" 
                      name="ticket-documentos" 
                      multiple 
                      accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" 
                      onChange={handleDocumentUpload}
                      disabled={isUploading}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    
                    {isUploading && (
                      <div className="flex items-center text-sm text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Subiendo...
                      </div>
                    )}
                  </div>
                  
                  {uploadMessage && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      uploadMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {uploadMessage.text}
                    </div>
                  )}
                  
                  {uploadedDocuments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Documentos subidos ({uploadedDocuments.length}):
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadedDocuments.map((docUrl, index) => {
                          const fileName = decodeURIComponent(docUrl.split('/').pop() || 'documento');
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">{fileName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedDocument(index)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setUploadedDocuments([]);
                      setUploadMessage(null);
                    }}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all font-medium"
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
    </div>
  );
}

// Patient Search Modal Component - Modern Design
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Buscar Paciente</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />

          <div className="mt-4 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              </div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.paciente_id}
                  className={`p-4 border-2 rounded-xl mb-2 cursor-pointer transition-all ${
                    selectedPatient?.paciente_id === patient.paciente_id 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="font-semibold text-slate-800 dark:text-white">
                    {patient.nombre_completo || `${patient.nombre} ${patient.apellido}`}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    ID: {patient.numero_identidad || patient.paciente_id} • {patient.telefono || 'Sin teléfono'}
                  </div>
                </div>
              ))
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No se encontraron pacientes
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
