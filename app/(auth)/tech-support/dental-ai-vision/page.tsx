'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TechSupportDentalAIVision() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dental-ai-vision');
  }, [router]);

  return null;
}
