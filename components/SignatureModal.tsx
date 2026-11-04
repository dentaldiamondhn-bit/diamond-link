'use client';

import React from 'react';
import { CheckCircle2, Save, Signature as SignatureIcon, X } from 'lucide-react';
import SignaturePadComponent from './SignaturePad';
import GlassModal from './tratamientos-completados/GlassModal';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title: string;
  subtitle?: string;
  value?: string | null;
  isHistorical?: boolean; // Add historical record prop
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  subtitle,
  value,
  isHistorical = false
}) => {
  const [signatureData, setSignatureData] = React.useState<string | null>(value || null);

  const handleSave = () => {
    if (signatureData) {
      onSave(signatureData);
      onClose();
    }
  };

  return (
    <GlassModal
      open={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={<SignatureIcon className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </button>

          {isHistorical ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-md shadow-emerald-950/40 transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Entendido
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!signatureData}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-md shadow-emerald-950/40 transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar Firma
            </button>
          )}
        </>
      }
    >
      {isHistorical ? (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-400" aria-hidden="true" />
          <p className="font-medium text-emerald-300">Firma No Requerida</p>
          <p className="mt-1 text-sm text-emerald-400/80">
            Registro histórico transcribido de documento físico
          </p>
        </div>
      ) : (
        <SignaturePadComponent
          variant="modal"
          onChange={setSignatureData}
          value={signatureData}
        />
      )}
    </GlassModal>
  );
};

export default SignatureModal;
