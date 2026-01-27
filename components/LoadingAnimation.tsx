'use client';

interface LoadingAnimationProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  progress?: number;
  customMessages?: string[];
}

export default function LoadingAnimation({ 
  message = "Cargando...", 
  subMessage = "Por favor espera un momento",
  showProgress = true,
  progress = 60,
  customMessages
}: LoadingAnimationProps) {
  const defaultMessages = [
    "• Cargando información del paciente...",
    "• Preparando datos disponibles...",
    "• Cargando promociones activas...",
    "• Procesando solicitud..."
  ];

  const messages = customMessages || defaultMessages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Modern Dental Loading Animation */}
        <div className="relative mb-8">
          {/* Tooth Icon with Pulse Animation */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-teal-200 dark:bg-teal-800 rounded-full animate-ping opacity-20"></div>
            <div className="relative">
              <i className="fas fa-tooth text-6xl text-teal-600 dark:text-teal-400 animate-bounce"></i>
            </div>
          </div>
          
          {/* Orbiting Dental Tools */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-32 h-32">
              <i className="fas fa-toothbrush text-2xl text-blue-500 absolute top-0 left-1/2 transform -translate-x-1/2 animate-spin" style={{ animationDuration: '3s' }}></i>
              <i className="fas fa-user-md text-2xl text-purple-500 absolute bottom-0 left-0 transform rotate-45 animate-spin" style={{ animationDuration: '4s' }}></i>
              <i className="fas fa-stethoscope text-2xl text-pink-500 absolute top-0 right-0 transform -rotate-45 animate-spin" style={{ animationDuration: '5s' }}></i>
              <i className="fas fa-notes-medical text-2xl text-green-500 absolute bottom-0 right-0 transform rotate-90 animate-spin" style={{ animationDuration: '3.5s' }}></i>
            </div>
          </div>
        </div>
        
        {/* Loading Text with Typing Effect */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {message}
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {subMessage}
            </p>
          </div>
          
          {/* Progress Bar */}
          {showProgress && (
            <div className="w-64 mx-auto">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-pulse" style={{ width: `${progress}%`, animation: 'shimmer 2s infinite' }}></div>
              </div>
            </div>
          )}
          
          {/* Loading Messages */}
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            {messages.map((msg, index) => (
              <p key={index} className="animate-pulse" style={{ animationDelay: `${index * 500}ms` }}>
                {msg}
              </p>
            ))}
          </div>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
