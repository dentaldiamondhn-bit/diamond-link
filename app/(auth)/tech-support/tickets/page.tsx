
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, RefreshCw, TicketIcon, Calendar, Paperclip, FileText, Wrench, Bug, Lightbulb, User, Bell, Plus, ChevronRight, AlertCircle, Activity, CheckCircle, Filter, Settings, TrendingUp, ChevronDown, MessageSquare, AlertTriangle, Clock, LayoutGrid, List, UserPlus } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';
import { TicketService } from '@/services/ticketService';
import { Ticket, TicketStatus, TicketPriority, TicketType, CreateTicketData, CreateTicketAttachmentData, UserRole, ActivityType } from '@/types/ticket';
import SystemLogs from '@/components/SystemLogs';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { UserSelect } from '@/components/calendar/UserSelect';
import { UserAvatar } from '@/components/calendar/UserComponents';
import { CalendarInviteesService } from '@/services/calendarInviteesService';
import DocumentDisplay from '@/components/DocumentDisplay';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, ACTIVITY_LABELS } from '@/lib/ticketLabels';
import { supabase } from '@/lib/supabase';

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

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const prefsLoaded = useRef(false);

  // Document upload state - store files locally until ticket creation
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'warning', text: string} | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // User role from metadata - normalize to uppercase enum to handle both formats
  const userRole = (user?.publicMetadata?.role as string || 'STAFF').replace('-', '_').toUpperCase() as UserRole;
  const normalizedUserRole = userRole;

  useEffect(() => {
    loadTickets();
  }, [userRole]);

  useEffect(() => {
    if (!user?.id || prefsLoaded.current) return;
    (async () => {
      const prefs = await UserPreferencesService.getPagePreferences(user.id, 'tech-support-tickets');
      if (prefs?.viewMode) setViewMode(prefs.viewMode);
      prefsLoaded.current = true;
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !prefsLoaded.current) return;
    UserPreferencesService.updatePagePreferences(user.id, 'tech-support-tickets', { viewMode }).catch(() => {});
  }, [viewMode, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('tech-support-tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as Ticket : t));
          } else if (payload.eventType === 'INSERT') {
            setTickets(prev => [...prev, payload.new as Ticket]);
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [tickets, filters, activeTab]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const result = await TicketService.getTickets({});

      if (result.data) {
        let filteredData = result.data;

        if (userRole === UserRole.TECH_SUPPORT) {
          filteredData = result.data;
        } else if (userRole === UserRole.ADMIN) {
          filteredData = result.data.filter(ticket => ticket.creator_id === user?.id);
        } else {
          filteredData = result.data.filter(ticket => {
            const isCreator = ticket.creator_id === user?.id;
            const isAssignee = ticket.assignees && ticket.assignees.some(assignee => assignee.user_id === user?.id);
            return isCreator || isAssignee;
          });
          filteredData = filteredData.filter(ticket => ticket.status !== TicketStatus.CLOSED);
        }

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

    if (activeTab === 'active') {
      filtered = filtered.filter(ticket => ticket.status !== TicketStatus.CLOSED);
    } else {
      filtered = filtered.filter(ticket => ticket.status === TicketStatus.CLOSED);
    }

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
      let uploadedUrls: string[] = [];
      
      // Upload documents first if there are any selected files
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        setUploadMessage({
          type: 'success',
          text: 'Subiendo documentos...'
        });

        const formData = new FormData();
        
        // Generate a temporary ticket ID for upload
        formData.append('ticketId', `temp-${Date.now()}`);
        
        for (const file of selectedFiles) {
          formData.append('files', file);
        }

        const response = await fetch('/api/upload-ticket-documents', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al subir documentos');
        }

        uploadedUrls = result.uploadedUrls || [];
        setUploadedDocuments(uploadedUrls);
      }

      // Convert uploaded document URLs to attachment format
      const docAttachments: CreateTicketAttachmentData[] = uploadedUrls.map(url => {
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
        setSelectedFiles([]);
        setUploadedDocuments([]);
        setUploadMessage(null);
        setIsUploading(false);
        loadTickets(); // Refresh tickets
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      setUploadMessage({
        type: 'warning',
        text: 'Error al crear el ticket: ' + (error as Error).message
      });
    } finally {
      setIsUploading(false);
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

  // Modern status styles with gradients
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

  // Modern priority styles
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
      case TicketType.SYSTEM_ISSUE: return <AlertTriangle className="w-4 h-4" />;
      case TicketType.IMPLEMENTATION: return <Lightbulb className="w-4 h-4" />;
      case TicketType.TASK: return <CheckCircle className="w-4 h-4" />;
      case TicketType.REMINDER: return <Bell className="w-4 h-4" />;
      case TicketType.PATIENT_CASE: return <User className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const canCreateTicket = () => {
    return normalizedUserRole === 'STAFF' || 
           normalizedUserRole === 'DOCTOR' || 
           normalizedUserRole === 'ADMIN' || 
           normalizedUserRole === 'TECH_SUPPORT';
  };

  const canChangeTicketStatus = (ticket: Ticket) => {
    // Admin and tech support can always change status
    if (userRole === UserRole.ADMIN || userRole === UserRole.TECH_SUPPORT) {
      return true;
    }
    // Check if current user is an assignee
    const isAssignee = ticket.assignees && ticket.assignees.some(assignee => assignee.user_id === user?.id);
    return isAssignee;
  };

  const canViewTicketDetails = (ticket: Ticket) => {
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

  // Handle document selection for ticket (store locally, upload on ticket creation)
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      return;
    }

    // Store files locally instead of uploading immediately
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Show success message
    setUploadMessage({
      type: 'success',
      text: `${files.length} documento(s) seleccionado(s). Se subirán al crear el ticket.`
    });

    // Clear file input
    e.target.value = '';

    // Clear message after 3 seconds
    setTimeout(() => {
      setUploadMessage(null);
    }, 3000);
  };

  // Remove selected document
  const removeSelectedDocument = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove uploaded document
  const removeUploadedDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const getAttachmentUrl = (attachment: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    
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
    
    const submitData = {
      ...formData,
      assignee_ids: selectedUsers.map(u => u.id),
      attachments: [...getSelectedAttachments(), ...docAttachments],
      patient_id: selectedPatient?.paciente_id || ''
    };
    
    onSubmit(submitData);
    setModalLoading(false);
  }

  return (
    <>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl shadow-xl mb-6">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Tickets y Tareas</h1>
                </div>
                <p className="text-emerald-100 text-lg">Gestiona tickets y tareas para la clínica dental</p>
              </div>
              
              {canCreateTicket() && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Crear Ticket
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{filteredTickets.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Abiertos</p>
                <p className="text-2xl font-bold text-blue-600">{tickets.filter(t => t.status === TicketStatus.OPEN).length}</p>
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
                <p className="text-2xl font-bold text-violet-600">{tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{tickets.filter(t => t.status === TicketStatus.RESOLVED).length}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'active'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Activos ({tickets.filter(t => t.status !== TicketStatus.CLOSED).length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'archived'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Archivados ({tickets.filter(t => t.status === TicketStatus.CLOSED).length})
            </button>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 inline mr-1.5" />
                  Cuadricula
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4 inline mr-1.5" />
                  Lista
                </button>
              </div>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Todos los Estados</option>
                  <option value={TicketStatus.OPEN}>Abierto</option>
                  <option value={TicketStatus.IN_PROGRESS}>En Progreso</option>
                  <option value={TicketStatus.PENDING_REVIEW}>Revisión Pendiente</option>
                  <option value={TicketStatus.RESOLVED}>Resuelto</option>
                  <option value={TicketStatus.CLOSED}>Cerrado</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Todos los Tipos</option>
                  <option value={TicketType.SYSTEM_ISSUE}>Problema del Sistema</option>
                  <option value={TicketType.IMPLEMENTATION}>Implementación</option>
                  <option value={TicketType.TASK}>Tarea</option>
                  <option value={TicketType.REMINDER}>Recordatorio</option>
                </select>
                <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Todas las Prioridades</option>
                  <option value={TicketPriority.LOW}>Baja</option>
                  <option value={TicketPriority.MEDIUM}>Media</option>
                  <option value={TicketPriority.HIGH}>Alta</option>
                  <option value={TicketPriority.URGENT}>Urgente</option>
                </select>
                <TrendingUp className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Grid/List View */}
        {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const statusStyles = getStatusStyles(ticket.status);
            const priorityStyles = getPriorityStyles(ticket.priority);
            
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {ticket.ticket_number && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{ticket.ticket_number}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{ticket.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {ticket.description?.length > 80 
                        ? `${ticket.description.substring(0, 80)}...` 
                        : ticket.description || 'Sin descripción'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles.bg} ${statusStyles.text}`}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityStyles.bg} ${priorityStyles.text}`}>
                    {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                  </span>
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {TYPE_LABELS[ticket.type] || ticket.type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {ticket.creator && (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar user={ticket.creator} size="sm" />
                      <span className="text-xs truncate max-w-[100px]">{ticket.creator.first_name || ticket.creator.email}</span>
                    </div>
                  )}
                  {ticket.assignees && ticket.assignees.length > 0 && (
                    <>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-1">
                        <UserAvatar user={ticket.assignees[0].user} size="sm" />
                        <span className="text-xs truncate max-w-[100px]">{ticket.assignees[0].user?.first_name || ticket.assignees[0].user?.email}</span>
                        {ticket.assignees.length > 1 && (
                          <span className="text-xs text-gray-500 ml-1">+{ticket.assignees.length - 1}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <span>{new Date(ticket.created_at).toLocaleDateString('es-HN')}</span>
                  {ticket.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ticket.due_date).toLocaleDateString('es-HN')}
                    </span>
                  )}
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {ticket.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        ) : (
        <div className="w-full overflow-x-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 font-medium px-4">Ticket</th>
                <th className="pb-3 font-medium px-4 hidden md:table-cell">Tipo</th>
                <th className="pb-3 font-medium px-4">Estado</th>
                <th className="pb-3 font-medium px-4 hidden lg:table-cell">Prioridad</th>
                <th className="pb-3 font-medium px-4 hidden lg:table-cell">Asignados</th>
                <th className="pb-3 font-medium px-4 hidden md:table-cell">Creado</th>
                <th className="pb-3 font-medium px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const statusStyles = getStatusStyles(ticket.status);
                const priorityStyles = getPriorityStyles(ticket.priority);
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          ticket.type === TicketType.SYSTEM_ISSUE ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                          ticket.type === TicketType.IMPLEMENTATION ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                          ticket.type === TicketType.REMINDER ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                          ticket.type === TicketType.PATIENT_CASE ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        }`}>
                          {getTypeIcon(ticket.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {ticket.ticket_number && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{ticket.ticket_number}</span>
                            )}
                            <span className="font-medium text-slate-800 dark:text-white truncate">{ticket.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{ticket.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{TYPE_LABELS[ticket.type] || ticket.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${priorityStyles.bg} ${priorityStyles.text}`}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex -space-x-2">
                        {ticket.assignees?.slice(0, 3).map((a, i) => (
                          a.user ? <UserAvatar key={i} user={a.user} size="sm" /> : null
                        ))}
                        {(ticket.assignees?.length || 0) > 3 && (
                          <span className="text-xs text-slate-500 ml-1">+{ticket.assignees!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(ticket.created_at).toLocaleDateString('es-HN')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Empty State */}
        {filteredTickets.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No se encontraron tickets</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {filters.search || filters.status || filters.type || filters.priority 
                ? 'Intenta ajustar los filtros de búsqueda' 
                : 'Crea tu primer ticket para comenzar'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create Ticket Modal - Modern Design */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedFiles([]);
            setUploadedDocuments([]);
            setUploadMessage(null);
            setIsUploading(false);
          }}
          onSubmit={handleCreateTicket}
          userRole={userRole}
          selectedFiles={selectedFiles}
          uploadedDocuments={uploadedDocuments}
          isUploading={isUploading}
          uploadMessage={uploadMessage}
          onDocumentUpload={handleDocumentUpload}
          onRemoveSelectedDocument={removeSelectedDocument}
          onRemoveUploadedDocument={removeUploadedDocument}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  {selectedAttachment.attachment_type === 'treatment' ? 'Detalles del Tratamiento' :
                   selectedAttachment.attachment_type === 'consent' ? 'Documento de Consentimiento' :
                   selectedAttachment.attachment_type === 'odontogram' ? 'Odontograma' :
                   selectedAttachment.attachment_type === 'event' ? 'Detalles del Evento' :
                   'Adjunto'}
                </h2>
                <button
                  onClick={handleCloseAttachmentModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
              <div className="space-y-6">
                {/* Attachment Info */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Información</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Título:</span>
                      <span className="font-medium text-slate-800 dark:text-white">{selectedAttachment.attachment_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Descripción:</span>
                      <span className="font-medium text-slate-800 dark:text-white">{selectedAttachment.attachment_description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Tipo:</span> 
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        selectedAttachment.attachment_type === 'treatment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        selectedAttachment.attachment_type === 'consent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        selectedAttachment.attachment_type === 'odontogram' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        selectedAttachment.attachment_type === 'event' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
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
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Detalles Adicionales</h3>
                    <div className="space-y-3 text-sm">
                      {selectedAttachment.metadata.fecha_cita && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Fecha:</span> 
                          <span className="font-medium text-slate-800 dark:text-white">{new Date(selectedAttachment.metadata.fecha_cita).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedAttachment.metadata.total_final && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Total:</span> 
                          <span className="font-medium text-slate-800 dark:text-white">Lps. {selectedAttachment.metadata.total_final}</span>
                        </div>
                      )}
                      {selectedAttachment.metadata.estado && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Estado:</span> 
                          <span className="font-medium text-slate-800 dark:text-white">{selectedAttachment.metadata.estado}</span>
                        </div>
                      )}
                      {selectedAttachment.metadata.estado_pago && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Estado de Pago:</span> 
                          <span className="font-medium text-slate-800 dark:text-white">{selectedAttachment.metadata.estado_pago}</span>
                        </div>
                      )}
                      {selectedAttachment.metadata.paciente && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Paciente:</span> 
                          <span className="font-medium text-slate-800 dark:text-white">{selectedAttachment.metadata.paciente.nombre_completo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      const url = getAttachmentUrl(selectedAttachment);
                      if (url !== '#') {
                        window.open(url, '_blank');
                      }
                    }}
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Ver en Sistema
                  </button>
                  <button
                    onClick={handleCloseAttachmentModal}
                    className="px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

// Create Ticket Modal Component - Modern Design
function CreateTicketModal({ 
  onClose, 
  onSubmit, 
  userRole,
  selectedFiles,
  uploadedDocuments,
  isUploading,
  uploadMessage,
  onDocumentUpload,
  onRemoveSelectedDocument,
  onRemoveUploadedDocument
}: { 
  onClose: () => void; 
  onSubmit: (data: CreateTicketData) => void;
  userRole: UserRole;
  selectedFiles: File[];
  uploadedDocuments: string[];
  isUploading: boolean;
  uploadMessage: {type: 'success' | 'warning', text: string} | null;
  onDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedDocument: (index: number) => void;
  onRemoveUploadedDocument: (index: number) => void;
}) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    type: TicketType.TASK,
    priority: TicketPriority.MEDIUM,
    is_reminder: false,
    assignee_ids: [],
    attachments: [],
    patient_id: ''
  });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Default the assignment to tech-support users so most tickets can be created without selecting assignees
  useEffect(() => {
    let cancelled = false;
    CalendarInviteesService.getAllUsers()
      .then((users) => {
        if (cancelled) return;
        const techSupportUsers = users.filter((u: any) => (u.role || '').toLowerCase() === 'tech_support');
        if (techSupportUsers.length > 0) {
          setSelectedUsers(techSupportUsers);
        }
      })
      .catch((error) => console.error('Error pre-loading tech-support users:', error));
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    const submitData = {
      ...formData,
      assignee_ids: selectedUsers.map(u => u.id),
      attachments: [...getSelectedAttachments(), ...docAttachments],
      patient_id: selectedPatient?.paciente_id || ''
    };
    
    onSubmit(submitData);
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientSearch(false);
    setAttachments([]);
  };

  const loadPatientAttachments = async (patientId: string) => {
    setLoadingAttachments(true);
    try {
      const consentsResponse = await fetch(`/api/patients/${patientId}/consents`);
      const consents = consentsResponse.ok ? await consentsResponse.json() : [];
      
      const odontogramResponse = await fetch(`/api/odontogram-pilot/active?patient_id=${patientId}`);
      const odontogram = odontogramResponse.ok ? await odontogramResponse.json() : null;
      
      const treatmentsResponse = await fetch(`/api/tratamientos-completados?paciente_id=${patientId}`);
      const treatments = treatmentsResponse.ok ? await treatmentsResponse.json() : [];
      
      const eventsResponse = await fetch(`/api/patients/${patientId}/events`);
      const events = eventsResponse.ok ? await eventsResponse.json() : [];

      const allAttachments = [
        ...consents.map((c: any) => ({
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
        ...treatments.map((t: any) => {
          const treatmentItems = t.tratamientos_realizados || [];
          const treatmentCount = treatmentItems.reduce((sum: number, tr: any) => sum + (tr.cantidad || 1), 0);
          const treatmentTotal = treatmentItems.reduce((sum: number, tr: any) => sum + ((tr.precio_final || 0) * (tr.cantidad || 1)), 0) || t.total_final || 0;
          const treatmentNames = treatmentItems.length > 0 
            ? treatmentItems.map((tr: any) => tr.nombre_tratamiento).join(', ')
            : t.nombre_tratamiento || 'Tratamiento';
          return {
            id: t.id,
            type: 'treatment',
            title: `${t.nombre_tratamiento || 'Tratamiento'} (${treatmentCount} tratamiento${treatmentCount > 1 ? 's' : ''})`,
            description: `${treatmentNames} • Lps. ${treatmentTotal} • ${t.estado || ''}`,
            date: t.fecha_cita,
            data: t
          };
        }),
        ...events.map((e: any) => ({
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Crear Nuevo Ticket
              </h2>
            </div>
            <button
              onClick={onClose}
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipo de Ticket</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Paciente</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {selectedPatient ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-emerald-900 dark:text-emerald-100">
                              {selectedPatient.nombre_completo || `${selectedPatient.nombre} ${selectedPatient.apellido}`}
                            </div>
                            <div className="text-sm text-emerald-700 dark:text-emerald-300">
                              ID: {selectedPatient.numero_identidad || selectedPatient.paciente_id} • {selectedPatient.telefono}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(null)}
                            className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Patient Information Attachments */}
            {formData.type === TicketType.PATIENT_CASE && selectedPatient && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Información del Paciente Adjunta</label>
                  <button
                    type="button"
                    onClick={() => loadPatientAttachments(selectedPatient.paciente_id)}
                    className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Actualizar
                  </button>
                </div>
                
                {loadingAttachments ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Cargando información...</p>
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {attachments.map((attachment) => (
                      <div
                        key={`${attachment.type}-${attachment.id}`}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          attachment.selected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500'
                        }`}
                        onClick={() => toggleAttachment(attachment)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${
                                attachment.type === 'consent' ? 'bg-emerald-500' :
                                attachment.type === 'odontogram' ? 'bg-purple-500' :
                                attachment.type === 'treatment' ? 'bg-blue-500' :
                                attachment.type === 'event' ? 'bg-amber-500' :
                                'bg-slate-500'
                              }`}></div>
                              <span className="font-medium text-sm text-slate-800 dark:text-white">{attachment.title}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {attachment.description}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {attachment.type} • {attachment.date ? new Date(attachment.date).toLocaleDateString('es-HN', { timeZone: 'UTC' }) : 'Sin fecha'}
                            </p>
                          </div>
                          <div className="ml-2">
                            {attachment.selected ? (
                              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                    No se encontró información del paciente para adjuntar
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Título del Ticket *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Ej: Problema con tratamiento del paciente"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descripción del Caso</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="Describa el problema o caso del paciente..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prioridad del Ticket *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value={TicketPriority.LOW}>Baja</option>
                <option value={TicketPriority.MEDIUM}>Media</option>
                <option value={TicketPriority.HIGH}>Alta</option>
                <option value={TicketPriority.URGENT}>Urgente</option>
              </select>
            </div>

            {/* User Assignment */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Asignado a *
              </label>
              <UserSelect
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                placeholder="Seleccionar usuarios para asignar..."
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Seleccione al menos un usuario para asignar este ticket
              </p>
            </div>

            {/* Reminder */}
            {formData.type === TicketType.REMINDER && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_reminder"
                  checked={formData.is_reminder}
                  onChange={(e) => setFormData({ ...formData, is_reminder: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_reminder" className="ml-2 text-sm text-slate-700 dark:text-slate-300">Este es un ticket de recordatorio</label>
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
                  onChange={onDocumentUpload}
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
              
              {/* Show selected files (not yet uploaded) */}
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Documentos seleccionados ({selectedFiles.length}):
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">{file.name}</span>
                          <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedDocument(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show uploaded documents (after successful upload) */}
              {uploadedDocuments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Documentos subidos ({uploadedDocuments.length}):
                  </h4>
                  <DocumentDisplay 
                    documents={uploadedDocuments}
                    removable={true}
                    onRemove={onRemoveUploadedDocument}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
          />

          <div className="mt-4 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              </div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.paciente_id}
                  className={`p-4 border-2 rounded-xl mb-2 cursor-pointer transition-all ${
                    selectedPatient?.paciente_id === patient.paciente_id 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500'
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
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Isolated component to prevent authentication conflicts
const IsolatedDocumentDisplay: React.FC<{ documents: string[], removable?: boolean }> = React.memo(({ documents, removable = false }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <DocumentDisplay 
      documents={documents} 
      removable={removable}
    />
  );
});

IsolatedDocumentDisplay.displayName = 'IsolatedDocumentDisplay';
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
  const [draftStatus, setDraftStatus] = useState<TicketStatus>(ticket.status);
  const [saving, setSaving] = useState(false);
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [draftAssignees, setDraftAssignees] = useState<any[]>(
    ticket.assignees?.map(a => a.user).filter(Boolean) || []
  );
  const hasChanges = draftStatus !== ticket.status || comment.trim() !== '' || editingAssignees;

  const canReassign = userRole === UserRole.ADMIN || userRole === UserRole.TECH_SUPPORT || ticket.creator_id === user?.id;

  const handleSave = async () => {
    if (!user?.id) return;
    if (!hasChanges) return;

    setSaving(true);
    try {
      if (draftStatus !== ticket.status) {
        await TicketService.updateTicket(ticket.id, { status: draftStatus }, user.id, comment.trim() || undefined);
      } else if (comment.trim()) {
        await TicketService.updateTicket(ticket.id, {}, user.id, comment.trim());
      }
      if (editingAssignees) {
        const newIds = draftAssignees.map(u => u.id);
        await TicketService.reassignTicket(ticket.id, newIds, user.id);
      }
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving ticket changes:', error);
    } finally {
      setSaving(false);
    }
  };

  // Modern status styles
  const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white', icon: <AlertCircle className="w-3.5 h-3.5" /> };
      case TicketStatus.IN_PROGRESS: return { bg: 'bg-gradient-to-r from-violet-500 to-violet-600', text: 'text-white', icon: <Activity className="w-3.5 h-3.5" /> };
      case TicketStatus.PENDING_REVIEW: return { bg: 'bg-gradient-to-r from-amber-500 to-amber-600', text: 'text-white', icon: <Clock className="w-3.5 h-3.5" /> };
      case TicketStatus.RESOLVED: return { bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600', text: 'text-white', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      case TicketStatus.CLOSED: return { bg: 'bg-gradient-to-r from-slate-500 to-slate-600', text: 'text-white', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      default: return { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', text: 'text-white', icon: <AlertCircle className="w-3.5 h-3.5" /> };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {ticket.ticket_number && (
                    <span className="inline-flex items-center px-3 py-2 bg-white/20 rounded-xl text-sm font-medium mr-3">
                      {ticket.ticket_number}
                    </span>
                  )}
                  {ticket.title}
                </h2>
                <div className="flex gap-2 mt-2">
                  {/* Status Selector for Admin, Tech Support, or Creator when RESOLVED */}
                  {(userRole === UserRole.ADMIN || userRole === UserRole.TECH_SUPPORT || (ticket.creator_id === user?.id && ticket.status === TicketStatus.RESOLVED)) ? (
                    <div className="relative">
                      <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value as TicketStatus)}
                        className={`appearance-none px-3 py-1.5 pr-8 rounded-lg text-sm font-medium cursor-pointer transition-all border ${
                          draftStatus === TicketStatus.OPEN 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50' 
                            : draftStatus === TicketStatus.IN_PROGRESS
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                            : draftStatus === TicketStatus.PENDING_REVIEW
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                            : draftStatus === TicketStatus.RESOLVED
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                            : draftStatus === TicketStatus.CLOSED
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {ticket.creator_id === user?.id && ticket.status === TicketStatus.RESOLVED ? (
                          <option value={TicketStatus.CLOSED}>Cerrado</option>
                        ) : (
                          <>
                            <option value={TicketStatus.OPEN}>Abierto</option>
                            <option value={TicketStatus.IN_PROGRESS}>En Progreso</option>
                            <option value={TicketStatus.PENDING_REVIEW}>Revisión Pendiente</option>
                            <option value={TicketStatus.RESOLVED}>Resuelto</option>
                            <option value={TicketStatus.CLOSED}>Cerrado</option>
                          </>
                        )}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className={`w-4 h-4 ${
                          draftStatus === TicketStatus.OPEN ? 'text-blue-500' 
                          : draftStatus === TicketStatus.IN_PROGRESS ? 'text-violet-500'
                          : draftStatus === TicketStatus.PENDING_REVIEW ? 'text-amber-500'
                          : draftStatus === TicketStatus.RESOLVED ? 'text-emerald-500'
                          : draftStatus === TicketStatus.CLOSED ? 'text-slate-500'
                          : 'text-slate-500'
                        }`} />
                      </div>
                    </div>
                  ) : (
                    // Just show status badge for non-admin users
                    (() => {
                      const statusStyles = getStatusStyles(ticket.status);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                          {statusStyles.icon}
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                      );
                    })()
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                    {TYPE_LABELS[ticket.type] || ticket.type}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                    {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-290px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {ticket.description && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Descripción
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-emerald-600" />
                    Adjuntos ({ticket.attachments.length})
                  </h3>
                  <div className="space-y-3">
                    {ticket.attachments.map((attachment) => (
                      <div key={attachment.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Paperclip className="w-4 h-4 text-slate-500" />
                              <h4 className="font-medium text-sm text-slate-800 dark:text-white">{attachment.attachment_title}</h4>
                              <span className={`text-xs px-2 py-1 rounded-lg ${
                                attachment.attachment_type === 'treatment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                attachment.attachment_type === 'consent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                attachment.attachment_type === 'odontogram' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                attachment.attachment_type === 'event' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                attachment.attachment_type === 'document' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {attachment.attachment_type === 'treatment' ? 'Tratamiento' :
                                 attachment.attachment_type === 'consent' ? 'Consentimiento' :
                                 attachment.attachment_type === 'odontogram' ? 'Odontograma' :
                                 attachment.attachment_type === 'event' ? 'Evento' :
                                 attachment.attachment_type === 'document' ? 'Documento' :
                                 attachment.attachment_type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {attachment.attachment_description}
                            </p>
                            
                            {/* Show document preview for document attachments */}
                            {attachment.attachment_type === 'document' && (
                              <div className="mb-3">
                                <IsolatedDocumentDisplay 
                                  documents={attachment.file_url ? [attachment.file_url] : []}
                                  removable={false}
                                />
                              </div>
                            )}
                            
                            {attachment.metadata && (
                              <div className="text-xs text-slate-500 dark:text-slate-500">
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
                          <div className="flex gap-2 ml-4">
                            {(attachment.attachment_type === 'treatment' || attachment.attachment_type === 'consent' || attachment.attachment_type === 'odontogram' || attachment.attachment_type === 'event') && attachment.metadata && (
                              <button
                                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                                onClick={() => onViewAttachment(attachment)}
                              >
                                Ver
                              </button>
                            )}
                            {attachment.attachment_type === 'document' && attachment.file_url && (
                              <button
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                onClick={() => window.open(attachment.file_url, '_blank')}
                              >
                                Ver
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
                <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Línea de Tiempo de Actividad
                </h4>
                {ticket.activities && ticket.activities.length > 0 ? (
                  <div className="space-y-3">
                    {ticket.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                        {activity.user?.profileImageUrl ? (
                          <img src={activity.user.profileImageUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              {(activity.user?.name || activity.user?.first_name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {activity.user?.name || activity.user?.first_name || 'Usuario'}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                              {activity.activity_type === ActivityType.STATUS_CHANGE && 'Cambio de estado'}
                              {activity.activity_type === ActivityType.COMMENT && 'Comentario'}
                              {activity.activity_type === ActivityType.ASSIGNMENT && 'Asignación'}
                              {activity.activity_type === ActivityType.EDIT && 'Edición'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(activity.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">{activity.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">No hay actividades</p>
                )}
              </div>

              {/* Add Note */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Agregar Nota</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe tu nota..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1.5">La nota se guardará al presionar Guardar.</p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Detalles
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Tipo de Ticket</span>
                    <p className="font-medium text-slate-800 dark:text-white">{TYPE_LABELS[ticket.type] || ticket.type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Prioridad</span>
                    <p className="font-medium text-slate-800 dark:text-white">{PRIORITY_LABELS[ticket.priority] || ticket.priority}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Estado</span>
                    <p className="font-medium text-slate-800 dark:text-white">{STATUS_LABELS[ticket.status] || ticket.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Creado por</span>
                    <div className="mt-1">
                      {ticket.creator ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar user={ticket.creator} size="sm" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {ticket.creator.first_name && ticket.creator.last_name 
                              ? `${ticket.creator.first_name} ${ticket.creator.last_name}`
                              : ticket.creator.email || 'Usuario'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <i className="fas fa-user-slash text-gray-500 dark:text-gray-400 text-xs"></i>
                          </div>
                          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Sin asignar</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Asignado a</span>
                      {canReassign && !editingAssignees && (
                        <button
                          onClick={() => setEditingAssignees(true)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Reasignar
                        </button>
                      )}
                    </div>
                    {editingAssignees ? (
                      <div className="mt-2">
                        <UserSelect
                          selectedUsers={draftAssignees}
                          onUsersChange={(users) => {
                            setDraftAssignees(users);
                          }}
                          placeholder="Seleccionar usuarios..."
                        />
                        <button
                          onClick={() => setEditingAssignees(false)}
                          className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Cancelar reasignación
                        </button>
                      </div>
                    ) : (
                    <div className="mt-1 space-y-1">
                      {ticket.assignees && ticket.assignees.length > 0 ? (
                        ticket.assignees.map((assignee, index) => (
                          <div key={assignee.user_id || index} className="flex items-center gap-2">
                            {assignee.user ? (
                              <>
                                <UserAvatar user={assignee.user} size="sm" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {assignee.user.first_name && assignee.user.last_name 
                                    ? `${assignee.user.first_name} ${assignee.user.last_name}`
                                    : assignee.user.email || 'Usuario'}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <i className="fas fa-user-slash text-gray-500 dark:text-gray-400 text-xs"></i>
                                </div>
                                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Usuario desconocido</span>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <i className="fas fa-user-slash text-gray-500 dark:text-gray-400 text-xs"></i>
                          </div>
                          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Sin asignar</span>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  {ticket.due_date && (
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Fecha límite</span>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {new Date(ticket.due_date).toLocaleString('es-HN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
