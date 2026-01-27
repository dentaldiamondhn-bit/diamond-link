'use client';

import { useEffect, useRef } from 'react';
import { useTutorial } from '../contexts/TutorialContext';

export function TutorialModal() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTutorial } = useTutorial();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && steps[currentStep]?.target) {
      const targetElement = document.querySelector(steps[currentStep].target!);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.classList.add('tutorial-highlight');
        return () => {
          targetElement.classList.remove('tutorial-highlight');
        };
      }
    }
  }, [isActive, currentStep, steps]);

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const getModalPosition = () => {
    if (!step.target || step.position === 'center') {
      return 'fixed inset-0 flex items-center justify-center';
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      return 'fixed inset-0 flex items-center justify-center';
    }

    const rect = targetElement.getBoundingClientRect();
    const positions: Record<string, string> = {
      top: `fixed left-1/2 transform -translate-x-1/2`,
      bottom: `fixed left-1/2 transform -translate-x-1/2`,
      left: `fixed top-1/2 transform -translate-y-1/2`,
      right: `fixed top-1/2 transform -translate-y-1/2`
    };

    return positions[step.position!] || positions.center;
  };

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={skipTutorial}
      />

      {/* Tutorial Modal */}
      <div className={`${getModalPosition()} z-50 max-w-md mx-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                <span className="text-teal-600 dark:text-teal-400 font-semibold text-sm">
                  {currentStep + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {step.title}
              </h3>
            </div>
            <button
              onClick={skipTutorial}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Paso {currentStep + 1} de {steps.length}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Anterior
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={skipTutorial}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                {isLastStep ? 'Completar' : 'Siguiente'}
                {!isLastStep && <i className="fas fa-arrow-right ml-2"></i>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for highlighting */}
      <style jsx>{`
        .tutorial-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.5);
          border-radius: 8px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(20, 184, 166, 0.3);
          }
          100% {
            box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.5);
          }
        }
      `}</style>
    </>
  );
}
