'use client';

import Dashboard from '@/components/calendar-new/Dashboard';

// Phase 0 placeholder: the RBC shell lands in Phase 1 (CALENDARIO_OVERHAUL_PLAN).
// Until then the flagged path renders the existing calendar under its own chunk.
export default function CalendarShell({ userId }: { userId: string }) {
  return <Dashboard userId={userId} />;
}