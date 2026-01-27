// app/tratamientos-completados/[id]/view/page.tsx
import { redirect } from 'next/navigation';

export default function TratamientoCompletadoViewRedirect({ params }: { params: { id: string } }) {
  redirect(`/auth/tratamientos-completados/${params.id}/view`);
}
