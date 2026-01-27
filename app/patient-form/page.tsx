// app/patient-form/page.tsx
import { redirect } from 'next/navigation';

export default function PatientFormRedirect() {
  redirect('/auth/patient-form');
}
