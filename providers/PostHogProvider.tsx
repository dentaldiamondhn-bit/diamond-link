'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useMemo } from 'react';
import React from 'react';

function PostHogInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = useMemo(
    () => (searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname),
    [pathname, searchParams],
  );

  useEffect(() => {
    const ph = (window as any).posthog;
    if (!ph?.capture) return;
    try {
      ph.capture('$pageview', { $current_url: url });
    } catch {}
  }, [url]);

  return null;
}

class PostHogErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.children;
    return this.props.children;
  }
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogErrorBoundary>
      <Suspense fallback={null}>
        <PostHogInit />
        {children}
      </Suspense>
    </PostHogErrorBoundary>
  );
}
