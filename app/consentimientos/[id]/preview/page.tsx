// app/consentimientos/[id]/preview/page.tsx
import { redirect } from 'next/navigation';

export default function ConsentimientoPreviewRedirect({ params }: { params: { id: string } }) {
  redirect(`/auth/consentimientos/${params.id}/preview`);
}
