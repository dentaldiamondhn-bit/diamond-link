'use client';

import React, { useState, useEffect } from 'react';
import { CalendarHomeWidget } from '@/services/calendarHomeWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Smartphone, 
  Home, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Widget as WidgetIcon,
  Shortcut
} from 'lucide-react';

interface WidgetRequestProps {
  className?: string;
}

export const WidgetRequest: React.FC<WidgetRequestProps> = ({ className = '' }) => {
  const [widgetSupport, setWidgetSupport] = useState<{
    supportsWidget: boolean;
    supportsShortcut: boolean;
    platform: string;
  } | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [isCreatingShortcut, setIsCreatingShortcut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    checkWidgetSupport();
  }, []);

  const checkWidgetSupport = async () => {
    try {
      const support = await CalendarHomeWidget.checkWidgetSupport();
      setWidgetSupport(support);
    } catch (error) {
      console.error('Error checking widget support:', error);
      setErrorMessage('Unable to check widget support');
    }
  };

  const handleAddWidget = async () => {
    setIsAddingWidget(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const success = await CalendarHomeWidget.requestHomeScreenWidget();
      if (success) {
        setSuccessMessage('Widget added to home screen successfully! 🎉');
      } else {
        setErrorMessage('Unable to add widget to home screen');
      }
    } catch (error) {
      console.error('Error adding widget:', error);
      setErrorMessage('Failed to add widget. Please try again.');
    } finally {
      setIsAddingWidget(false);
    }
  };

  const handleCreateShortcut = async () => {
    setIsCreatingShortcut(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const success = await CalendarHomeWidget.createCalendarShortcut();
      if (success) {
        setSuccessMessage('Calendar shortcut created successfully! 🚀');
      } else {
        setErrorMessage('Unable to create calendar shortcut');
      }
    } catch (error) {
      console.error('Error creating shortcut:', error);
      setErrorMessage('Failed to create shortcut. Please try again.');
    } finally {
      setIsCreatingShortcut(false);
    }
  };

  const handleShowInstructions = async () => {
    try {
      await CalendarHomeWidget.showWidgetInstructions();
      setSuccessMessage('Instructions sent to your notifications! 📱');
    } catch (error) {
      console.error('Error showing instructions:', error);
      setErrorMessage('Unable to show instructions');
    }
  };

  if (!widgetSupport) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto p-6 ${className}`}>
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <WidgetIcon className="h-6 w-6 text-blue-600" />
            <span>Calendar Home Screen Widget</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Information */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900 px-4 py-2 rounded-full">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {widgetSupport.platform === 'android' ? 'Android' : 
                 widgetSupport.platform === 'ios' ? 'iOS' : 'Web'}
              </span>
            </div>
          </div>

          {/* Available Actions */}
          <div className="space-y-4">
            {widgetSupport.supportsWidget && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Home Screen Widget
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add a calendar widget directly to your home screen for quick access to appointments.
                </p>
                <Button
                  onClick={handleAddWidget}
                  disabled={isAddingWidget}
                  className="w-full"
                  variant="outline"
                >
                  {isAddingWidget ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Adding Widget...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Home Screen
                    </>
                  )}
                </Button>
              </div>
            )}

            {widgetSupport.supportsShortcut && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Shortcut className="h-5 w-5 mr-2" />
                  Calendar Shortcut
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Create a home screen shortcut for quick calendar access.
                </p>
                <Button
                  onClick={handleCreateShortcut}
                  disabled={isCreatingShortcut}
                  className="w-full"
                  variant="outline"
                >
                  {isCreatingShortcut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating Shortcut...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Shortcut
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Instructions Button */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Need Help?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get step-by-step instructions for adding the widget to your home screen.
              </p>
              <Button
                onClick={handleShowInstructions}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                Show Instructions
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{successMessage}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Platform-Specific Notes */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Platform Notes:</h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {widgetSupport.platform === 'android' && (
                <>
                  <p>• Widget will show upcoming appointments</p>
                  <p>• Long press home screen to access widgets</p>
                  <p>• Works with Android 8.0 and above</p>
                </>
              )}
              {widgetSupport.platform === 'ios' && (
                <>
                  <p>• Shortcut will be added to Today View</p>
                  <p>• Swipe right from home screen to access</p>
                  <p>• Works with iOS 14.0 and above</p>
                </>
              )}
              {widgetSupport.platform === 'web' && (
                <>
                  <p>• Home screen widgets require native app</p>
                  <p>• Consider using PWA "Add to Home Screen" feature</p>
                  <p>• Bookmarks provide quick access</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetRequest;
