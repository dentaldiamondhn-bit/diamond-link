// app/reports/page.tsx
import { redirect } from 'next/navigation';

export default function ReportsRedirect() {
  redirect('/auth/reports');
}
