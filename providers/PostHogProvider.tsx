'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import React from 'react';

function PostHogInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    import('posthog-js').then((posthog) => {
      try {
        const url = searchParams?.toString()
          ? `${pathname}?${searchParams.toString()}`
          : pathname;
        posthog.default.capture('$pageview', { $current_url: url });
      } catch {}
    });
  }, [pathname, searchParams]);

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
