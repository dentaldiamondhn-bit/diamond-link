'use client';

import React, { useState, useEffect } from 'react';
import { useCapacitorNotifications } from '../services/capacitorNotificationService';
import { useDeepLinks } from '../services/deepLinkService';
import { PatientService } from '../services/patientService';
import { CalendarService } from '../services/calendarService';
import { TicketService } from '../services/ticketService';
import { TicketType, TicketPriority, TicketStatus } from '../types/ticket';

export default function CapacitorDemo() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [testPatientId, setTestPatientId] = useState('test-patient-123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Add debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-4), logMessage]); // Keep last 5 logs
    console.log(logMessage);
  };

  // Check browser mode
  const getBrowserMode = () => {
    if (typeof window === 'undefined') return 'Unknown';
    
    // Check if browser is in mobile mode
    const isMobileMode = window.matchMedia('(max-width: 768px)').matches;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    if (isMobileDevice && isMobileMode) {
      return 'Mobile Device + Mobile Mode';
    } else if (isMobileDevice && !isMobileMode) {
      return 'Mobile Device + Desktop Mode (Desktop Site)';
    } else if (!isMobileDevice && isMobileMode) {
      return 'Desktop Device + Mobile Mode';
    } else {
      return 'Desktop Device + Desktop Mode';
    }
  };

  // Mobile browser detection
  const isMobileBrowser = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  };

  // Add mobile browser specific error handling
  useEffect(() => {
    if (isMobileBrowser()) {
      console.log('📱 Mobile browser detected');
      
      // Add mobile-specific error listeners
      const handleError = (event: ErrorEvent) => {
        console.error('📱 Mobile Browser Error:', event.error);
        setError(`Mobile Browser Error: ${event.error?.message || 'Unknown error'}`);
      };
      
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        console.error('📱 Mobile Promise Rejection:', event.reason);
        setError(`Promise Error: ${event.reason?.message || event.reason || 'Unknown promise error'}`);
      };
      
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  const {
    isNative,
    isInitialized: notificationsInitialized,
    requestPermissions,
    scheduleAppointmentReminder,
    registerForPushNotifications,
    openPatientRecord
  } = useCapacitorNotifications();

  const {
    openPatientRecord: openDeepLinkPatient,
    sharePatientRecord,
    generateShareLink
  } = useDeepLinks();

  useEffect(() => {
    setIsInitialized(notificationsInitialized);
    setIsLoading(false);
  }, [notificationsInitialized]);

  // Global error handler
  const handleError = (error: any, context: string) => {
    const errorMessage = `Error in ${context}: ${error?.message || error || 'Unknown error'}`;
    addDebugLog(`❌ ${errorMessage}`);
    setError(errorMessage);
    
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleRequestPermissions = async () => {
    try {
      const result = await requestPermissions();
      setPermissionGranted(result.granted);
      console.log('📱 Permission result:', result);
    } catch (error) {
      handleError(error, 'Permission Request');
    }
  };

  const handleRegisterPushNotifications = async () => {
    try {
      const token = await registerForPushNotifications();
      setPushToken(token);
      console.log('📱 Push token:', token);
    } catch (error) {
      handleError(error, 'Push Notification Registration');
    }
  };

  const handleScheduleTestReminder = async () => {
    try {
      addDebugLog('🔔 Starting test reminder scheduling...');
      
      // Schedule a test reminder for 30 seconds from now
      const testDate = new Date(Date.now() + 30 * 1000);
      addDebugLog(`⏰ Scheduling reminder for: ${testDate.toLocaleTimeString()}`);
      
      const scheduled = await scheduleAppointmentReminder({
        id: 'test-appointment-123',
        title: 'Cita Dental - Diamond Link',
        body: `Tiene una cita con Dr. Test en 30 segundos`,
        scheduledDate: testDate,
        patientId: testPatientId,
        appointmentId: 'test-appointment-123'
      });

      addDebugLog(`📅 Schedule result: ${scheduled ? 'SUCCESS' : 'FAILED'}`);

      if (scheduled) {
        addDebugLog('✅ Test reminder scheduled successfully!');
        alert('✅ Test reminder scheduled for 30 seconds from now!');
      } else {
        addDebugLog('❌ Test reminder scheduling failed');
      }
    } catch (error) {
      handleError(error, 'Test Reminder Scheduling');
    }
  };

  const handleDirectNotificationTest = async () => {
    try {
      addDebugLog('🔔 Testing direct browser notification...');
      
      // Request permission first
      const permission = await Notification.requestPermission();
      addDebugLog(`🔐 Permission result: ${permission}`);
      
      if (permission !== 'granted') {
        addDebugLog('❌ Permission denied for notifications');
        alert('❌ Notification permission denied. Please grant permission in browser settings.');
        return;
      }
      
      addDebugLog('✅ Permission granted, creating notification...');
      
      // Create notification directly
      const notification = new Notification('🔔 Test Notification', {
        body: 'This is a test notification from Diamond Link',
        icon: '/Logo.svg',
        badge: '/Logo.svg',
        tag: 'test-notification',
        requireInteraction: false
      });
      
      addDebugLog('✅ Notification created successfully!');
      
      // Handle click
      notification.onclick = () => {
        addDebugLog('🖱️ Notification clicked');
        notification.close();
        window.focus();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        addDebugLog('⏰ Auto-closing notification');
        notification.close();
      }, 5000);
      
    } catch (error) {
      addDebugLog(`❌ Direct notification failed: ${error.message}`);
      handleError(error, 'Direct Notification Test');
    }
  };

  const handleOpenPatientRecord = async () => {
    try {
      await openPatientRecord(testPatientId);
      console.log('📱 Opening patient record:', testPatientId);
    } catch (error) {
      handleError(error, 'Open Patient Record');
    }
  };

  const handleSharePatient = async () => {
    try {
      await sharePatientRecord(testPatientId, 'Paciente de Prueba');
      console.log('📤 Sharing patient record:', testPatientId);
    } catch (error) {
      handleError(error, 'Share Patient Record');
    }
  };

  const handleGenerateShareLink = () => {
    try {
      const link = generateShareLink('patient', testPatientId);
      console.log('🔗 Share link:', link);
      alert(`Share link: ${link}`);
    } catch (error) {
      handleError(error, 'Generate Share Link');
    }
  };

  const handleTestPatientService = async () => {
    try {
      const scheduled = await PatientService.scheduleAppointmentReminder({
        patientId: testPatientId,
        patientName: 'Paciente de Prueba',
        doctorName: 'Dr. Test',
        appointmentDate: new Date(Date.now() + 60 * 1000), // 1 minute from now
        appointmentId: 'test-service-123'
      });

      if (scheduled) {
        console.log('✅ Patient service reminder scheduled');
        alert('✅ Patient service reminder scheduled for 1 minute from now!');
      }
    } catch (error) {
      handleError(error, 'Patient Service Test');
    }
  };

  const handleTestCalendarService = async () => {
    try {
      // Create a mock calendar event for testing
      const testEvent = {
        id: 'test-calendar-event-123',
        title: 'Cita de Prueba - Calendario',
        start_date: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
        end_date: new Date(Date.now() + 2 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 32 minutes from now
        all_day: false,
        event_type: 'appointment' as const,
        status: 'confirmed' as const,
        priority: 'medium' as const,
        patient_id: testPatientId,
        patient_name: 'Paciente de Prueba',
        created_by: 'test-user',
        patient: {
          paciente_id: testPatientId,
          nombre_completo: 'Paciente de Prueba',
          telefono: '1234567890',
          email: 'test@example.com'
        }
      };

      const scheduled = await CalendarService.scheduleEventNotification(testEvent, 60); // 1 hour before

      if (scheduled) {
        console.log('✅ Calendar service notification scheduled');
        alert('✅ Calendar service notification scheduled for 1 hour before event!');
      }
    } catch (error) {
      handleError(error, 'Calendar Service Test');
    }
  };

  const handleTestTicketService = async () => {
    try {
      // Create a mock ticket for testing
      const testTicket = {
        id: 'test-ticket-123',
        title: 'Ticket de Prueba - Soporte',
        description: 'Este es un ticket de prueba para notificaciones',
        type: TicketType.SYSTEM_ISSUE,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        due_date: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3 minutes from now
        creator_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Send immediate notification
      await TicketService.sendTicketNotification(testTicket, 'created', 'Dr. Test');

      // Schedule reminder for high priority ticket
      const reminderScheduled = await TicketService.scheduleTicketReminder(testTicket, 30); // 30 minutes before

      if (reminderScheduled) {
        console.log('✅ Ticket service reminder scheduled');
        alert('✅ Ticket service notification sent and reminder scheduled!');
      } else {
        console.log('✅ Ticket service notification sent (no reminder scheduled)');
        alert('✅ Ticket service notification sent!');
      }
    } catch (error) {
      handleError(error, 'Ticket Service Test');
    }
  };

  const handleTestBulkNotifications = async () => {
    try {
      // Create mock tickets for bulk notification test
      const testTickets = [
        {
          id: 'bulk-ticket-1',
          title: 'Ticket Bulk 1',
          type: TicketType.TASK,
          priority: TicketPriority.MEDIUM,
          status: TicketStatus.OPEN,
          creator_id: 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'bulk-ticket-2',
          title: 'Ticket Bulk 2',
          type: TicketType.SYSTEM_ISSUE,
          priority: TicketPriority.HIGH,
          status: TicketStatus.OPEN,
          creator_id: 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'bulk-ticket-3',
          title: 'Ticket Bulk 3',
          type: TicketType.PATIENT_CASE,
          priority: TicketPriority.LOW,
          status: TicketStatus.OPEN,
          creator_id: 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      await TicketService.sendBulkTicketNotifications(testTickets, 'assigned');

      console.log('✅ Bulk ticket notifications sent');
      alert('✅ Bulk ticket notifications sent for 3 tickets!');
    } catch (error) {
      handleError(error, 'Bulk Notification Test');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🔄 Initializing Capacitor Services...
        </h3>
        <p className="text-yellow-600">
          Please wait while we initialize the mobile services.
        </p>
        <div className="mt-2 text-sm text-yellow-500">
          Platform: {typeof window !== 'undefined' ? ((window as any).Capacitor?.getPlatform() || 'web') : 'loading...'}
        </div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          ❌ Error Occurred
        </h3>
        <p className="text-red-600">
          {error}
        </p>
        <button
          onClick={() => setError(null)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-red-800">❌ Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        📱 Capacitor Demo - Diamond Link Mobile Features
      </h2>

      {/* Platform Info */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Platform Information
        </h3>
        <div className="space-y-1 text-sm text-blue-600 dark:text-blue-300">
          <p>📱 Native Platform: {isNative ? '✅ Yes' : '❌ No (Web)'}</p>
          <p>🔔 Notifications Initialized: {notificationsInitialized ? '✅ Yes' : '❌ No'}</p>
          <p>👤 Permission Granted: {permissionGranted ? '✅ Yes' : '❌ No'}</p>
          {pushToken && <p>🔑 Push Token: {pushToken.substring(0, 20)}...</p>}
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          🐛 Debug Information
        </h3>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>🌐 Browser Mode: {getBrowserMode()}</p>
          <p>🌐 User Agent: {typeof window !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</p>
          <p>📱 Capacitor Available: {typeof window !== 'undefined' && (window as any).Capacitor ? '✅ Yes' : '❌ No'}</p>
          <p>🔧 Plugins Available: {typeof window !== 'undefined' && (window as any).Capacitor?.Core ? '✅ Yes' : '❌ No'}</p>
          <p>📱 Platform: {typeof window !== 'undefined' ? ((window as any).Capacitor?.getPlatform() || 'web') : 'loading...'}</p>
          <p>🔔 Notification API: {typeof window !== 'undefined' && 'Notification' in window ? '✅ Yes' : '❌ No'}</p>
          <p>📡 Service Worker: {typeof window !== 'undefined' && 'serviceWorker' in navigator ? '✅ Yes' : '❌ No'}</p>
          <p>🔔 Permission: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'}</p>
        </div>
      </div>

      {/* Debug Logs Panel */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          📋 Debug Logs
        </h3>
        <div className="space-y-1 text-sm text-yellow-600 dark:text-yellow-300">
          {debugLogs.length === 0 ? (
            <p>No logs yet...</p>
          ) : (
            debugLogs.map((log, index) => (
              <p key={index} className="font-mono">{log}</p>
            ))
          )}
        </div>
      </div>

      {/* Permissions Section */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          🔐 Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleRequestPermissions}
            disabled={permissionGranted}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {permissionGranted ? '✅ Permissions Granted' : '🔔 Request Permissions'}
          </button>
          <button
            onClick={handleRegisterPushNotifications}
            disabled={!permissionGranted || !isNative}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            📡 Register Push Notifications
          </button>
        </div>
      </div>

      {/* Notification Testing */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          🔔 Notification Testing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleScheduleTestReminder}
            disabled={!permissionGranted}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            ⏰ Schedule Test Reminder (30s)
          </button>
          <button
            onClick={handleTestPatientService}
            disabled={!permissionGranted}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🏥 Test Patient Service (1min)
          </button>
        </div>
      </div>

      {/* Calendar & Ticket Service Testing */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          📅 Calendar & Ticket Testing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleTestCalendarService}
            disabled={!permissionGranted}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            📅 Test Calendar Service
          </button>
          <button
            onClick={handleTestTicketService}
            disabled={!permissionGranted}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🎫 Test Ticket Service
          </button>
          <button
            onClick={handleTestBulkNotifications}
            disabled={!permissionGranted}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            📫 Test Bulk Notifications
          </button>
        </div>
      </div>

      {/* Deep Link Testing */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          🔗 Deep Link Testing
        </h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Test Patient ID:
          </label>
          <input
            type="text"
            value={testPatientId}
            onChange={(e) => setTestPatientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter patient ID"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleScheduleTestReminder}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ⏰ Schedule Test Reminder (30s)
          </button>
          
          <button
            onClick={handleDirectNotificationTest}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            🔔 Direct Notification Test
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleSharePatient}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            📤 Share Patient Record
          </button>
          <button
            onClick={handleGenerateShareLink}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            🔗 Generate Share Link
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          📋 Instructions
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>• Request permissions first to enable notifications</li>
          <li>• Test reminders will trigger in 30-60 seconds</li>
          <li>• Calendar events schedule notifications for 1 hour before</li>
          <li>• Ticket notifications support priority-based reminders</li>
          <li>• Bulk notifications test multiple ticket assignments</li>
          <li>• Deep links work differently on web vs native</li>
          <li>• Push notifications only work on native platforms</li>
          <li>• Check browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
}
