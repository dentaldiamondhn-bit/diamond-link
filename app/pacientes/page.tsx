// app/pacientes/page.tsx
import { redirect } from 'next/navigation';

export default function PacientesRedirect() {
  redirect('/auth/pacientes');
}
