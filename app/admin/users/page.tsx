// app/admin/users/page.tsx
import { redirect } from 'next/navigation';

export default function AdminUsersRedirect() {
  redirect('/auth/admin/users');
}
