'use client';

import { useTutorial } from '../contexts/TutorialContext';

interface TutorialButtonProps {
  className?: string;
  variant?: 'button' | 'menu';
}

export function TutorialButton({ className = '', variant = 'button' }: TutorialButtonProps) {
  const { startTutorial } = useTutorial();

  if (variant === 'menu') {
    return (
      <button
        onClick={startTutorial}
        className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      >
        <i className="fas fa-graduation-cap mr-3"></i>
        Ver Tutorial
      </button>
    );
  }

  return (
    <button
      onClick={startTutorial}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors ${className}`}
    >
      <i className="fas fa-question-circle mr-2"></i>
      Tutorial
    </button>
  );
}
