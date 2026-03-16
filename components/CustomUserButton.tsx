'use client';

import { UserButton } from '@clerk/nextjs';

interface CustomUserButtonProps {
  appearance?: any;
}

export function CustomUserButton({ appearance }: CustomUserButtonProps) {
  const handleSignOut = () => {
    // Set sessionStorage flag
    sessionStorage.setItem('clerk-signed-out', 'true');
    
    // Navigate to sign-in with parameter
    window.location.href = '/sign-in?signed_out=true';
  };

  return (
    <UserButton 
      appearance={appearance}
      afterSignOutUrl="/sign-in?signed_out=true"
    />
  );
}
