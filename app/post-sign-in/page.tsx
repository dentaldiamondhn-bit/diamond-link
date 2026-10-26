import { redirect } from 'next/navigation';
import { getCalendarSession } from '@/lib/calendarAuth';

/**
 * Role-aware sign-in landing. The <SignIn /> component uses this as its
 * fallbackRedirectUrl when a user signs in without an explicit redirect_url
 * (e.g. visiting the site root or /sign-in directly). Tech support gets its
 * own control panel; every other role lands on the clinic dashboard.
 */
export default async function PostSignInPage() {
  const session = await getCalendarSession();

  if (!session) {
    redirect('/sign-in');
  }

  redirect(session.role === 'tech_support' ? '/tech-support/dashboard' : '/dashboard');
}
