// app/patient-preview/[id]/page.tsx
import { redirect } from 'next/navigation';

export default function PatientPreviewIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/auth/patient-preview/${params.id}`);
}
