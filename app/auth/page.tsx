// Simple redirect page to avoid client reference manifest issues
import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  redirect('/auth/dashboard')
}
