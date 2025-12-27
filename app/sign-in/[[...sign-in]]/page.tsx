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
        <h1 className="text-4xl font-bold mb-6">Sistema de Gestión Dental</h1>
        <h2 className="text-2xl mb-4">Bienvenido de Vuelta</h2>
        <p className="mb-8 max-w-md">
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
                headerTitle: 'text-2xl font-bold text-gray-900',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton: 'border border-gray-200 hover:bg-gray-50',
                formFieldLabel: 'text-gray-700 font-medium',
                formFieldInput: 'rounded-lg border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                formButtonPrimary: 'bg-primary hover:bg-primary-light text-white font-medium py-2 px-4 rounded-lg transition-colors',
                footerActionLink: 'text-primary hover:text-primary-light font-medium',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500',
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
          />
        </motion.div>
      </div>
    </div>
  );
}