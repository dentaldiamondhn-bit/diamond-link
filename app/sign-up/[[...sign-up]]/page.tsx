// app/sign-up/page.tsx
'use client';

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-card p-8 hover:shadow-card-hover transition-shadow duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join us today to get started</p>
          </div>
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none w-full",
                headerTitle: "text-2xl font-bold text-gray-900",
                headerSubtitle: "text-gray-600",
                socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50",
                formFieldLabel: "text-gray-700 font-medium",
                formFieldInput: "rounded-lg border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                footerActionLink: "text-primary-600 hover:text-primary-800 font-medium",
                footerActionText: "text-gray-600",
                formButtonPrimary: "bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors",
                dividerText: "text-gray-400",
              },
            }}
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
          />
        </div>
      </motion.div>
    </div>
  );
}