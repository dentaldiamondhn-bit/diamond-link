'use client';

import React, { useState, useEffect } from 'react';
import PushNotificationService from '@/services/pushNotificationService';

export function MobileNotificationSettings() {
  const [status, setStatus] = useState(PushNotificationService.getSubscriptionStatus());
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    // Initialize push notifications on component mount
    PushNotificationService.initialize().then((initialized) => {
      if (initialized) {
        setStatus(PushNotificationService.getSubscriptionStatus());
      }
    });
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const success = await PushNotificationService.subscribe();
      if (success) {
        setStatus(PushNotificationService.getSubscriptionStatus());
      }
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await PushNotificationService.unsubscribe();
      if (success) {
        setStatus(PushNotificationService.getSubscriptionStatus());
      }
    } catch (error) {
      console.error('❌ Error unsubscribing from push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    try {
      await PushNotificationService.showTestNotification();
    } catch (error) {
      console.error('❌ Error showing test notification:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status.isSupported) return 'text-gray-500';
    if (status.permission === 'granted') {
      return status.isSubscribed ? 'text-green-600' : 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getStatusText = () => {
    if (!status.isSupported) return 'Not Supported';
    if (status.permission === 'denied') return 'Permission Denied';
    if (status.permission === 'default') return 'Permission Required';
    if (status.isSubscribed) return 'Subscribed';
    return 'Not Subscribed';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Mobile Notifications</h3>
      
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Status</p>
            <p className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            status.isSupported && status.permission === 'granted' && status.isSubscribed
              ? 'bg-green-500'
              : 'bg-gray-300'
          }`} />
        </div>

        {/* Support Info */}
        {!status.isSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Mobile notifications are not supported in this browser. 
              Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        )}

        {/* Permission Denied */}
        {status.isSupported && status.permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Notification permission was denied. Please enable notifications in your browser settings.
            </p>
          </div>
        )}

        {/* Actions */}
        {status.isSupported && status.permission !== 'denied' && (
          <div className="space-y-3">
            {!status.isSubscribed ? (
              <button
                onClick={handleSubscribe}
                disabled={loading || status.permission !== 'granted'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Subscribing...' : 'Enable Mobile Notifications'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Unsubscribing...' : 'Disable Mobile Notifications'}
                </button>
                
                <button
                  onClick={handleTestNotification}
                  disabled={testLoading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {testLoading ? 'Sending...' : 'Send Test Notification'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Mobile notifications work even when the app is closed</p>
          <p>• You'll receive reminders for calendar events and tasks</p>
          <p>• Notifications are sent to all invitees</p>
        </div>
      </div>
    </div>
  );
}
