'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';
import { useAdminOverride } from '@/contexts/AdminOverrideContext';

const AdminOverrideTimer = dynamic(() => import('@/components/AdminOverrideTimer'), { ssr: false });

/**
 * Mounts the admin-override countdown bubble only while an override is
 * actually active. The bubble is the only consumer of framer-motion in the
 * app shell, so keeping it unmounted means the library is never fetched for
 * the users who are not running an override.
 */
function AdminOverrideTimerGateBase() {
  const { overrides, recentVersionId } = useAdminOverride();
  if (!recentVersionId || !overrides[recentVersionId]) return null;
  return <AdminOverrideTimer />;
}

export default memo(AdminOverrideTimerGateBase);
