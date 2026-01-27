// app/calendario/page.tsx
import { redirect } from 'next/navigation';

export default function CalendarioRedirect() {
  redirect('/auth/calendario');
}
