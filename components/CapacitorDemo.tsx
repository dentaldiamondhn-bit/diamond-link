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
  }, [notificationsInitialized]);

  const handleRequestPermissions = async () => {
    try {
      const result = await requestPermissions();
      setPermissionGranted(result.granted);
      console.log('📱 Permission result:', result);
    } catch (error) {
      console.error('❌ Permission request failed:', error);
    }
  };

  const handleRegisterPushNotifications = async () => {
    try {
      const token = await registerForPushNotifications();
      setPushToken(token);
      console.log('📱 Push token:', token);
    } catch (error) {
      console.error('❌ Push registration failed:', error);
    }
  };

  const handleScheduleTestReminder = async () => {
    try {
      // Schedule a test reminder for 30 seconds from now
      const testDate = new Date(Date.now() + 30 * 1000);
      
      const scheduled = await scheduleAppointmentReminder({
        id: 'test-appointment-123',
        title: 'Cita Dental - Diamond Link',
        body: `Tiene una cita con Dr. Test en 30 segundos`,
        scheduledDate: testDate,
        patientId: testPatientId,
        appointmentId: 'test-appointment-123'
      });

      if (scheduled) {
        console.log('✅ Test reminder scheduled');
        alert('✅ Test reminder scheduled for 30 seconds from now!');
      }
    } catch (error) {
      console.error('❌ Failed to schedule test reminder:', error);
      alert('❌ Failed to schedule test reminder');
    }
  };

  const handleOpenPatientRecord = async () => {
    try {
      await openPatientRecord(testPatientId);
      console.log('📱 Opening patient record:', testPatientId);
    } catch (error) {
      console.error('❌ Failed to open patient record:', error);
    }
  };

  const handleSharePatient = async () => {
    try {
      await sharePatientRecord(testPatientId, 'Paciente de Prueba');
      console.log('📤 Sharing patient record:', testPatientId);
    } catch (error) {
      console.error('❌ Failed to share patient record:', error);
    }
  };

  const handleGenerateShareLink = () => {
    try {
      const link = generateShareLink('patient', testPatientId);
      console.log('🔗 Share link:', link);
      alert(`Share link: ${link}`);
    } catch (error) {
      console.error('❌ Failed to generate share link:', error);
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
      console.error('❌ Patient service test failed:', error);
      alert('❌ Patient service test failed');
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
      console.error('❌ Calendar service test failed:', error);
      alert('❌ Calendar service test failed');
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
      console.error('❌ Ticket service test failed:', error);
      alert('❌ Ticket service test failed');
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
      console.error('❌ Bulk notification test failed:', error);
      alert('❌ Bulk notification test failed');
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🔄 Initializing Capacitor Services...
        </h3>
        <p className="text-yellow-600">
          Please wait while we initialize the mobile services.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleOpenPatientRecord}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            📂 Open Patient Record
          </button>
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
