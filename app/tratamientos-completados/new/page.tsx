// app/tratamientos-completados/new/page.tsx
import { redirect } from 'next/navigation';

export default function NewTratamientoCompletadoRedirect() {
  redirect('/auth/tratamientos-completados/new');
}
