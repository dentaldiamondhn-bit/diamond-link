// app/sign-in/[[...sign-in]]/page.tsx
'use client';

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import './signin-styles.css';

export default function Page() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="logo-wrapper">
            <Image 
              src="/Logo.svg" 
              alt="Dental Clinic Logo" 
              width={200} 
              height={200}
              className="login-logo"
              priority
            />
            <div className="logo-glow"></div>
          </div>
        </motion.div>
        
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
          {isLoaded && (
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
                afterSignInUrl="/dashboard"
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}