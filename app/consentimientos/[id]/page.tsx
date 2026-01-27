// app/consentimientos/[id]/page.tsx
import { redirect } from 'next/navigation';

export default function ConsentimientoIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/auth/consentimientos/${params.id}`);
}
