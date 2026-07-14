'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import GlobalSearch from './GlobalSearch';
import { TutorialButton } from './TutorialButton';
import AnimatedReport from './AnimatedReport';
import AnimatedUser from './AnimatedUser';
import AnimatedTratamientosCompletados from './AnimatedTratamientosCompletados';
import { getDoctorById, getAvailableDoctorsSync } from '../config/doctors';
import { Doctor } from '../config/doctors';

const doctorNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
  { href: '/patient-form', label: 'Nueva Historia Clínica', icon: 'fas fa-file-medical' },
  { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-users' },
  { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
  { href: '/tratamientos-completados', label: 'Tratamientos Completados', icon: <AnimatedTratamientosCompletados /> },
  { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
  { href: '/patient-follow-up', label: 'Seguimiento', icon: 'fas fa-clipboard-check' },
  { href: '/reports', label: 'Reportes', icon: <AnimatedReport /> },
  { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
];

interface DoctorSidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export default function DoctorSidebar({ sidebarOpen, setSidebarOpen }: DoctorSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [supabaseDoctors, setSupabaseDoctors] = useState<Doctor[]>([]);

  // Load Supabase doctors on component mount
  useEffect(() => {
    const loadSupabaseDoctors = async () => {
      try {
        const { SupabaseDoctorService } = await import('../services/supabaseDoctorService');
        const doctors = await SupabaseDoctorService.getDoctors();
        setSupabaseDoctors(doctors);
      } catch (error) {
        console.error('DoctorSidebar - Error loading Supabase doctors:', error);
      }
    };
    
    loadSupabaseDoctors();
  }, []);

  // Get current doctor's specialty
  const getCurrentDoctorSpecialty = () => {
    // Try to get specialty from user metadata first
    if (user?.publicMetadata?.specialty) {
      return user.publicMetadata.specialty;
    }
    
    // Priority 1: Try to find doctor by user ID in Supabase data (most reliable)
    if (user?.id && supabaseDoctors.length > 0) {
      const doctor = supabaseDoctors.find((d: any) => d.user_id === user.id);
      
      if (doctor?.specialty) {
        return doctor.specialty;
      }
    }
    
    // Priority 2: Try to find doctor by user ID in local defaults (fallback)
    if (user?.id) {
      const doctors = getAvailableDoctorsSync();
      
      const doctor = doctors.find((d: any) => d.user_id === user.id);
      
      if (doctor?.specialty) {
        return doctor.specialty;
      }
    }
    
    // Priority 3: Try to find doctor by name in Supabase data
    if (user?.firstName && user?.lastName && supabaseDoctors.length > 0) {
      const fullName = `${user.firstName} ${user.lastName}`;
      const doctor = supabaseDoctors.find((d: any) => d.name === fullName);
      
      if (doctor?.specialty) {
        return doctor.specialty;
      }
    }
    
    // Priority 4: Try to find doctor by name in local defaults (last resort)
    if (user?.firstName && user?.lastName) {
      const doctors = getAvailableDoctorsSync();
      const fullName = `${user.firstName} ${user.lastName}`;
      const doctor = doctors.find((d: any) => d.name === fullName);
      
      if (doctor?.specialty) {
        return doctor.specialty;
      }
    }
    
    return null;
  };

  const currentSpecialty = getCurrentDoctorSpecialty();
  const isOdontopediatria = currentSpecialty === 'Odontopediatría';
  const isOdontologiaGeneral = currentSpecialty === 'Odontología General';
  const isOrtodoncia = currentSpecialty === 'Ortodoncia';
  const isEndodoncia = currentSpecialty === 'Endodoncia';
  const isPeriodoncia = currentSpecialty === 'Periodoncia';
  
  const forceOdontopediatria = isOdontopediatria;
  const forceOdontologiaGeneral = isOdontologiaGeneral;
  const forceOrtodoncia = isOrtodoncia;
  const forceEndodoncia = isEndodoncia;
  const forcePeriodoncia = isPeriodoncia;

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a menu item
    if (sidebarOpen && setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Dynamic sidebar classes based on specialty
  const getSpecialtyStyle = () => {
    if (forceOdontopediatria) {
      return {
        background: 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)', // Pink to Blue
        borderClass: 'border-white/20',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        buttonHover: 'hover:bg-white/10',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        roleText: 'Odontopediatra'
      };
    }
    
    if (forceOdontologiaGeneral) {
      return {
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', // Purple Haze
        borderClass: 'border-white/20',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        buttonHover: 'hover:bg-white/10',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        roleText: 'Doctor General'
      };
    }
    
    if (forceOrtodoncia) {
      return {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald Green
        borderClass: 'border-white/20',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        buttonHover: 'hover:bg-white/10',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        roleText: 'Ortodoncista'
      };
    }
    
    if (forceEndodoncia) {
      return {
        background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)', // Brown Gradient
        borderClass: 'border-white/20',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        buttonHover: 'hover:bg-white/10',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        roleText: 'Endodoncista'
      };
    }
    
    if (forcePeriodoncia) {
      return {
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Orange Gradient
        borderClass: 'border-white/20',
        textClass: 'text-white/80',
        subTextClass: 'text-white/70',
        activeBg: 'bg-white/20',
        hoverBg: 'hover:bg-white/10',
        buttonHover: 'hover:bg-white/10',
        badgeClass: 'bg-white/20 text-white border border-white/30',
        roleText: 'Periodoncista'
      };
    }
    
    // Default blue theme
    return {
      background: '',
      borderClass: 'border-blue-700',
      textClass: 'text-blue-200',
      subTextClass: 'text-blue-200',
      activeBg: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-800',
      buttonHover: 'hover:bg-blue-800',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
      roleText: 'Doctor'
    };
  };

  const specialtyStyle = getSpecialtyStyle();
  const hasCustomGradient = forceOdontopediatria || forceOdontologiaGeneral || forceOrtodoncia || forceEndodoncia || forcePeriodoncia;
  
  const sidebarClasses = hasCustomGradient 
    ? "w-64 text-white flex flex-col h-screen overflow-y-auto"
    : "w-64 bg-blue-900 text-white flex flex-col h-screen overflow-y-auto";
  
  const sidebarStyle = hasCustomGradient 
    ? { background: specialtyStyle.background }
    : {};

  const headerClasses = hasCustomGradient
    ? `p-6 border-b ${specialtyStyle.borderClass}`
    : "p-6 border-b border-blue-700";

  const navItemClasses = (isActive: boolean) => {
    const baseClasses = "flex items-center px-4 py-3 rounded-lg transition-all duration-200";
    if (hasCustomGradient) {
      return isActive 
        ? `${baseClasses} ${specialtyStyle.activeBg} text-white shadow-lg backdrop-blur-sm`
        : `${baseClasses} ${specialtyStyle.textClass} ${specialtyStyle.hoverBg} hover:text-white`;
    }
    return isActive 
      ? `${baseClasses} bg-blue-600 text-white shadow-lg`
      : `${baseClasses} text-blue-200 hover:bg-blue-800 hover:text-white`;
  };

  const userSectionClasses = hasCustomGradient
    ? `p-4 border-t ${specialtyStyle.borderClass}`
    : "p-4 border-t border-blue-700";

  const userButtonClasses = hasCustomGradient
    ? { 
        elements: {
          avatarBox: "w-8 h-8",
          userButton: `${specialtyStyle.buttonHover} rounded-lg transition-colors`
        }
      }
    : {
        elements: {
          avatarBox: "w-8 h-8",
          userButton: "hover:bg-blue-800 rounded-lg transition-colors"
        }
      };

  return (
    <div className={sidebarClasses} style={sidebarStyle}>
      {/* Logo Section */}
      <div className={headerClasses}>
        <div className="flex items-center space-x-3">
          <img src="/Logo.svg" alt="Diamond Link" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Diamond Link</h1>
            <p className={`text-xs ${specialtyStyle.subTextClass}`}>
              {hasCustomGradient ? (
                currentSpecialty || 'Acceso Clínico'
              ) : (
                'Acceso Clínico'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {doctorNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          // Add GlobalSearch after dashboard item
          if (item.href === '/dashboard') {
            return (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={navItemClasses(isActive)}
                >
                  {typeof item.icon === 'string' ? (
                    <i className={`${item.icon} w-5 mr-3`}></i>
                  ) : (
                    <div className="w-5 mr-3">{item.icon}</div>
                  )}
                  <span className="font-medium">{item.label}</span>
                </Link>
                {/* Global Search Component */}
                <div className="px-4 py-2">
                  <GlobalSearch />
                </div>
              </React.Fragment>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={navItemClasses(isActive)}
            >
              {typeof item.icon === 'string' ? (
                <i className={`${item.icon} w-5 mr-3`}></i>
              ) : (
                <div className="w-5 mr-3">{item.icon}</div>
              )}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={userSectionClasses}>
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-sm font-medium text-white">
                {user?.firstName || 'Usuario'} {user?.lastName || ''}
              </p>
              {/* Doctor Role Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${specialtyStyle.badgeClass}`}>
                <i className="fas fa-user-md mr-1"></i>
                {specialtyStyle.roleText}
              </span>
            </div>
            <p className={`text-xs ${specialtyStyle.subTextClass}`}>
              {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
            </p>
            {/* Tutorial Button */}
            <div className="mt-2">
              <TutorialButton variant="menu" />
            </div>
          </div>
          <div className="relative">
            <UserButton 
              appearance={userButtonClasses}
            />
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
