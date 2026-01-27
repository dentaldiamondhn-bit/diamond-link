// app/consentimientos/page.tsx
import { redirect } from 'next/navigation';

export default function ConsentimientosRedirect() {
  redirect('/auth/consentimientos');
}
