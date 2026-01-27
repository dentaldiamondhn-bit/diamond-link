// app/tratamientos-completados/[id]/page.tsx
import { redirect } from 'next/navigation';

export default function TratamientoCompletadoIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/auth/tratamientos-completados/${params.id}`);
}
