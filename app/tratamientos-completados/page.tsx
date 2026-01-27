// app/tratamientos-completados/page.tsx
import { redirect } from 'next/navigation';

export default function TratamientosCompletadosRedirect() {
  redirect('/auth/tratamientos-completados');
}
