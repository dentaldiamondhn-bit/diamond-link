'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary caught error:', error, errorInfo);
    
    // Try to get device info for debugging
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    };
    
    console.error('📱 Mobile Debug Info:', deviceInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              🚨 Something went wrong
            </h1>
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 mb-2">
                An unexpected error occurred. Please try reloading the page.
              </p>
              <details className="text-sm text-red-600">
                <summary>Error details</summary>
                <pre className="mt-2 p-2 bg-red-50 rounded overflow-auto text-xs">
                  {this.state.error?.stack}
                </pre>
              </details>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
