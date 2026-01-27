// app/doctores/page.tsx
import { redirect } from 'next/navigation';

export default function DoctoresRedirect() {
  redirect('/auth/doctores');
}
