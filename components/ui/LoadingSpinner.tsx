'use client';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-teal-200 rounded-full animate-spin border-t-teal-600"></div>
      </div>
    </div>
  );
}
