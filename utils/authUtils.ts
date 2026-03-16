import { signOut } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export async function signOutAndRedirect() {
  // Set flag to trigger reload on sign-in page
  await signOut();
  redirect('/sign-in');
}

// Client-side sign-out handler
export function handleSignOut() {
  // Set flag to indicate user signed out
  sessionStorage.setItem('clerk-signed-out', 'true');
  
  // Use window.location for immediate redirect
  window.location.href = '/sign-in';
}
