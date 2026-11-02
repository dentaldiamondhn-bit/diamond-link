'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface RoleTutorial {
  [key: string]: TutorialStep[];
}

const tutorials: RoleTutorial = {
  admin: [
    {
      id: 'admin-welcome',
      title: '¡Bienvenido Administrador! 👑',
      content: 'Como administrador, tienes control total sobre el sistema Diamond Link. Esta guía te ayudará a conocer las funciones principales.',
      position: 'center'
    },
    {
      id: 'admin-sidebar',
      title: 'Panel de Administración',
      content: 'Desde el sidebar izquierdo, puedes acceder a todas las herramientas administrativas: gestión de usuarios, reportes, configuración y más.',
      target: '.flex-shrink-0',
      position: 'right'
    },
    {
      id: 'admin-users',
      title: 'Gestión de Usuarios',
      content: 'Administra todos los usuarios del sistema, asigna roles y permisos. Puedes crear doctores, staff y otros administradores.',
      target: 'a[href="/tech-support/users"]',
      position: 'right'
    },
    {
      id: 'admin-complete',
      title: '¡Configuración Completa! 🎉',
      content: 'Ahora estás listo para administrar Diamond Link. Recuerda que puedes acceder a esta guía nuevamente desde tu perfil.',
      position: 'center'
    }
  ],
  doctor: [
    {
      id: 'doctor-welcome',
      title: '¡Bienvenido Doctor! 👨‍⚕️',
      content: 'Bienvenido a Diamond Link. Esta guía te ayudará a utilizar las herramientas disponibles para gestionar tus pacientes y tratamientos.',
      position: 'center'
    },
    {
      id: 'doctor-patients',
      title: 'Gestión de Pacientes',
      content: 'Busca, crea y edita fichas de pacientes. Accede al historial médico completo y antecedentes de cada paciente.',
      target: 'a[href="/pacientes"]',
      position: 'right'
    },
    {
      id: 'doctor-complete',
      title: '¡Listo para Practicar! 🦷',
      content: 'Ahora estás preparado para gestionar tus pacientes y tratamientos de manera eficiente.',
      position: 'center'
    }
  ],
  staff: [
    {
      id: 'staff-welcome',
      title: '¡Bienvenido al Staff! 👥',
      content: 'Bienvenido a Diamond Link. Como personal de apoyo, ayudarás en la gestión diaria de pacientes y tratamientos.',
      position: 'center'
    },
    {
      id: 'staff-patients',
      title: 'Registro de Pacientes',
      content: 'Ayuda en el registro de nuevos pacientes, actualización de datos y gestión de información básica.',
      target: 'a[href="/pacientes"]',
      position: 'right'
    },
    {
      id: 'staff-complete',
      title: '¡Listo para Ayudar! 📋',
      content: 'Ahora estás preparado para apoyar en la gestión diaria de la clínica dental.',
      position: 'center'
    }
  ]
};

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { userRole } = useRoleBasedAccess();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);

  const startTutorial = useCallback(() => {
    if (userRole && tutorials[userRole]) {
      setSteps(tutorials[userRole]);
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [userRole]);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    if (user && userRole) {
      localStorage.setItem(`tutorial_seen_${user.id}_${userRole}`, 'true');
    }
  }, [user, userRole]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  }, [currentStep, steps, completeTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  useEffect(() => {
    if (user && userRole) {
      const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${user.id}_${userRole}`);
      if (!hasSeenTutorial) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        startTutorial();
      }
    }
  }, [user, userRole, startTutorial]);

  // A stable context value keeps consumers from re-rendering when the provider
  // re-renders for an unrelated reason (e.g. a route change in the layout).
  const value = useMemo<TutorialContextType>(() => ({
    isActive,
    currentStep,
    steps,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial
  }), [isActive, currentStep, steps, startTutorial, nextStep, prevStep, skipTutorial, completeTutorial]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
