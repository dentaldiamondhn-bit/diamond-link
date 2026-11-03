'use client';

import React from 'react';
import { CheckCircle2, Clock3, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getPaymentStatusPresentation,
  type PaymentStatusTone,
} from '@/lib/treatments/completedTreatmentMetrics';
import type { PaymentStatus } from '@/lib/treatments/completedTreatmentSort';

const TONE_STYLES: Record<PaymentStatusTone, string> = {
  pagado:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300',
  parcialmente_pagado:
    'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300',
  pendiente:
    'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300',
};

const TONE_ICONS: Record<PaymentStatusTone, LucideIcon> = {
  pagado: CheckCircle2,
  parcialmente_pagado: Wallet,
  pendiente: Clock3,
};

const ON_GRADIENT_STYLES = 'bg-white/20 text-white ring-white/30';

export default function StatusBadge({
  status,
  variant = 'default',
  className,
}: {
  status: PaymentStatus;
  variant?: 'default' | 'onGradient';
  className?: string;
}) {
  const { label, tone } = getPaymentStatusPresentation(status);
  const Icon = TONE_ICONS[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        variant === 'onGradient' ? ON_GRADIENT_STYLES : TONE_STYLES[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
