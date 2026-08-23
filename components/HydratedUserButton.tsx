'use client';

import { useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import type { UserButtonProps } from '@clerk/shared/types';

type HydratedUserButtonProps = Partial<UserButtonProps> & {
  showOnlineDot?: boolean;
  placeholderClassName?: string;
  afterSignOutUrl?: string;
};

export default function HydratedUserButton({
  showOnlineDot = false,
  placeholderClassName = 'w-8 h-8',
  ...userButtonProps
}: HydratedUserButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`${placeholderClassName} rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse`}
      />
    );
  }

  return (
    <>
      <UserButton {...(userButtonProps as React.ComponentProps<typeof UserButton>)} />
      {showOnlineDot && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full shadow-sm" style={{ borderColor: 'white', borderWidth: '2px', borderStyle: 'solid' }}></div>
      )}
    </>
  );
}
