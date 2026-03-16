// app/sign-in/[[...sign-in]]/page.tsx
'use client';

import { SignIn, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import './signin-styles.css';

export default function Page() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  
  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
    
    // Force reload if page was loaded after sign-out to prevent blank state
    // Check URL parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const hasSignedOut = urlParams.get('signed_out') === 'true' || 
                       sessionStorage.getItem('clerk-signed-out') === 'true';
    
    if (hasSignedOut) {
      sessionStorage.removeItem('clerk-signed-out');
      // Clean URL and reload
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      window.location.reload();
    }
  }, []);
  
  // Determine redirect URL based on user role
  const getRedirectUrl = () => {
    if (!userLoaded || !user) {
      return '/dashboard'; // Default fallback
    }
    
    const userRole = user.publicMetadata?.role as string;
    
    switch (userRole) {
      case 'tech_support':
        return '/tech-support/dashboard';
      case 'admin':
        return '/dashboard';
      case 'doctor':
        return '/dashboard';
      case 'staff':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Redirect if user is already signed in
  useEffect(() => {
    if (isMounted && userLoaded && user) {
      router.push(getRedirectUrl());
    }
    if (isMounted && userLoaded) {
      setIsLoaded(true);
    }
  }, [isMounted, userLoaded, user, router]);

  return (
    <div className="login-container">
      {/* Animated Background Elements */}
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
      
      {/* Left Side - Branding */}
      <div className="login-left">
        <motion.div 
          className="logo-container"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/Logo.svg"
            alt="Diamond Link Dental"
            width={120}
            height={120}
            className="logo"
            priority
          />
        </motion.div>
        <div className="logo-glow"></div>
        
        {/* Desktop-only text content */}
        <motion.div 
          className="hidden lg:block content-wrapper"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="badge">
            <span className="badge-text">Sistema Moderno</span>
          </div>
          <h1 className="text-4xl font-bold mb-6">
            Sistema de Gestión Dental
          </h1>
          <h2 className="text-2xl mb-4 text-gradient">
            Bienvenido de Vuelta
          </h2>
          <p className="mb-8 max-w-md text-description">
            Inicie sesión para acceder al sistema de gestión dental y administrar sus pacientes, citas y más con tecnología de vanguardia.
          </p>
          
          <div className="features">
            <div className="feature-item">
              <div className="feature-icon">🦷</div>
              <span>Gestión Integral</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <span>Citas Inteligentes</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <span>Reportes Avanzados</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Right Side - Sign In Form */}
      <div className="login-right">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="login-box"
        >
          {!isMounted ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : user ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">Redirecting...</div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <SignIn
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none w-full bg-transparent',
                    headerTitle: 'text-xl sm:text-2xl font-bold text-gray-900 hidden',
                    headerSubtitle: 'text-gray-600 text-sm sm:text-base hidden',
                    socialButtonsBlockButton: 'border border-gray-200 hover:bg-gray-50 rounded transition-all duration-200 hover:shadow-md py-1 text-xs',
                    formFieldLabel: 'text-gray-700 font-medium text-xs mb-0.5',
                    formFieldInput: 'rounded border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs transition-all duration-200 h-8',
                    formButtonPrimary: 'bg-primary hover:bg-primary-light text-white font-medium py-1 px-2 rounded transition-all duration-200 text-xs hover:shadow-lg transform hover:-translate-y-0.5',
                    footerActionLink: 'text-primary hover:text-primary-light font-medium text-xs transition-colors',
                    dividerLine: 'bg-gray-200',
                    dividerText: 'text-gray-500 text-xs',
                    form: 'space-y-1.5',
                    formField: 'mb-1.5',
                    footer: 'mt-2',
                    footerAction: 'text-xs',
                    socialButtonsBlock: 'space-y-1',
                    identityPreviewText: 'text-gray-700 font-medium text-xs',
                    formButtonSecondary: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded transition-all duration-200 py-1 text-xs',
                  },
                }}
                routing="path"
                path="/sign-in"
                afterSignInUrl={getRedirectUrl()}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}