'use client';

import React from 'react';
import { Box } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ThreeDModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThreeDModal({ open, onOpenChange }: ThreeDModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Visor 3D del diente
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Representación tridimensional del diente seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center dark:border-gray-600 dark:bg-gray-900">
          <Box className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Visor 3D disponible en una fase posterior
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
