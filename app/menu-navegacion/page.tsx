// app/menu-navegacion/page.tsx
import { redirect } from 'next/navigation';

export default function MenuNavegacionRedirect() {
  redirect('/auth/menu-navegacion');
}
