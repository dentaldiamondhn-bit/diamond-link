// app/consentimientos/new/page.tsx
import { redirect } from 'next/navigation';

export default function NewConsentimientoRedirect() {
  redirect('/auth/consentimientos/new');
}
