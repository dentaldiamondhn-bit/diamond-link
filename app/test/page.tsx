'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { DarkModeToggle } from '../../components/DarkModeToggle';

export default function TestPage() {
  const { user } = useUser();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <p className="mb-2">User Status:</p>
          {user ? (
            <div>
              <p>Signed in as: {user.fullName}</p>
              <UserButton />
            </div>
          ) : (
            <p>Not signed in</p>
          )}
        </div>

        <div>
          <p className="mb-2">Dark Mode Toggle:</p>
          <DarkModeToggle />
        </div>

        <div>
          <p className="mb-2">Theme Test:</p>
          <div className="bg-white dark:bg-gray-800 p-4 rounded border">
            <p className="text-gray-900 dark:text-white">This should change color in dark mode</p>
          </div>
        </div>
      </div>
    </div>
  );
}
