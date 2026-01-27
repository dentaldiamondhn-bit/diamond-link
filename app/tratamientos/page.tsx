// app/tratamientos/page.tsx
import { redirect } from 'next/navigation';

export default function TratamientosRedirect() {
  redirect('/auth/tratamientos');
}
