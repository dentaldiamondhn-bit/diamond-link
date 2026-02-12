// app/sign-in/[[...sign-in]]/page.tsx
'use client';

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Image from 'next/image';
import './signin-styles.css';

export default function Page() {
  return (
    <div className="login-container">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="logo-container">
          <Image 
            src="/Logo.svg" 
            alt="Dental Clinic Logo" 
            width={200} 
            height={200}
            className="login-logo"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">Sistema de Gestión Dental</h1>
        <h2 className="text-xl sm:text-2xl mb-3 sm:mb-4">Bienvenido de Vuelta</h2>
        <p className="text-sm sm:text-base mb-6 sm:mb-8 max-w-md">
          Inicie sesión para acceder al sistema de gestión dental y administrar sus pacientes, citas y más.
        </p>
      </div>
      
      {/* Right Side - Sign In Form */}
      <div className="login-right">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="login-box"
        >
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none w-full',
                headerTitle: 'text-xl sm:text-2xl font-bold text-gray-900',
                headerSubtitle: 'text-gray-600 text-sm sm:text-base',
                socialButtonsBlockButton: 'border border-gray-200 hover:bg-gray-50 text-sm sm:text-base',
                formFieldLabel: 'text-gray-700 font-medium text-sm sm:text-base',
                formFieldInput: 'rounded-lg border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base sm:text-base',
                formButtonPrimary: 'bg-primary hover:bg-primary-light text-white font-medium py-3 sm:py-2 px-4 rounded-lg transition-colors text-sm sm:text-base',
                footerActionLink: 'text-primary hover:text-primary-light font-medium text-sm sm:text-base',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500 text-sm sm:text-base',
                form: 'space-y-4 sm:space-y-3',
                formField: 'mb-4 sm:mb-3',
                footer: 'mt-6 sm:mt-4',
                footerAction: 'text-sm sm:text-base',
              },
            }}
            routing="path"
            path="/sign-in"
            afterSignInUrl="/dashboard"
          />
        </motion.div>
      </div>
    </div>
  );
}