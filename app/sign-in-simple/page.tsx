'use client';

import { SignIn } from "@clerk/nextjs";
import './signin-styles.css';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg"
            }
          }}
          routing="path"
          path="/sign-in"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
}
