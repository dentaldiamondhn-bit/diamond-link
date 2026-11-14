'use client';

import React from 'react';

// Grade icons ported verbatim from the reference site's furcation selector
// (js/script.js:580-584 `furcationSVGs`): ring for grade 1, ring + filled
// left half for grade 2, solid disc for grade 3. 15x15 viewBox, black.
const GRADE_PATHS: Record<1 | 2 | 3, React.ReactNode> = {
  1: (
    <path d="M7.5,2A5.5,5.5,0,1,1,2,7.5a5.51,5.51,0,0,1,5.5-5.5m0-2A7.5,7.5,0,1,0,15,7.5,7.5,7.5,0,0,0,7.5,0Z" />
  ),
  2: (
    <>
      <path d="M7.5,2A5.5,5.5,0,1,1,2,7.5,5.51,5.51,0,0,1,7.5,2m0-2A7.5,7.5,0,1,0,15,7.5,7.5,7.5,0,0,0,7.5,0Z" />
      <path d="M7.5,15a7.5,7.5,0,1,1,0-15" />
    </>
  ),
  3: (
    <>
      <circle cx="7.5" cy="7.5" r="6.5" />
      <path d="M7.5,2A5.5,5.5,0,1,1,2,7.5,5.51,5.51,0,0,1,7.5,2m0-2A7.5,7.5,0,1,0,15,7.5,7.5,7.5,0,0,0,7.5,0Z" />
    </>
  ),
};

export function FurcationGlyph({ grade }: { grade: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {grade >= 1 && grade <= 3 ? GRADE_PATHS[grade as 1 | 2 | 3] : null}
    </svg>
  );
}
