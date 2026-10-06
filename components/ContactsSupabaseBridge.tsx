'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { registerContactsSupabaseTokenGetter } from '@/lib/supabase';

/**
 * Registers the Clerk session token with the CONTACTS-ONLY Supabase client.
 *
 * Supabase third-party auth trusts Clerk-signed session tokens (verified via
 * Clerk's JWKS at the issuer registered in the dashboard) and reads the `sub`
 * claim for the contacts RLS policies. That flow uses the default SESSION token,
 * not a custom JWT template, so we call `getToken()` with no argument.
 *
 * Deliberately scoped to `contactsSupabase`: this app also reads tables whose
 * policies only admit `anon`, so a global token would blank them (see 7a30d4d).
 */
export default function ContactsSupabaseBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      registerContactsSupabaseTokenGetter(null);
      return;
    }
    registerContactsSupabaseTokenGetter(() => getToken());
    return () => registerContactsSupabaseTokenGetter(null);
  }, [getToken, isSignedIn]);

  return null;
}