// app/account/page.tsx
import { redirect } from 'next/navigation';

export default function AccountRedirect() {
  redirect('/auth/account');
}