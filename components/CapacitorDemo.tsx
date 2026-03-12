'use client';

import React, { useState, useEffect } from 'react';
import { useCapacitorNotifications } from '../services/capacitorNotificationService';
import { useDeepLinks } from '../services/deepLinkService';
import { PatientService } from '../services/patientService';

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
          <li>• Deep links work differently on web vs native</li>
          <li>• Push notifications only work on native platforms</li>
          <li>• Check browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
}
