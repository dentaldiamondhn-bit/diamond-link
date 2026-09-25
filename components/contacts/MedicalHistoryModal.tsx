'use client';

import { useState } from 'react';
import { X, HeartPulse } from 'lucide-react';
import type { LocalContact, MedicalHistory } from '@/lib/contacts/db';
import { updateLocalContact, updateMedicalHistory } from '@/lib/contacts/syncEngine';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/button';

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface MedicalHistoryModalProps {
  open: boolean;
  contact: LocalContact;
  medical?: MedicalHistory;
  onClose: () => void;
}

export function MedicalHistoryModal({ open, contact, medical, onClose }: MedicalHistoryModalProps) {
  const [allergies, setAllergies] = useState(medical?.allergies.join(', ') ?? '');
  const [chronicConditions, setChronicConditions] = useState(medical?.chronicConditions.join(', ') ?? '');
  const [currentMedications, setCurrentMedications] = useState(medical?.currentMedications.join(', ') ?? '');
  const [odontogramNotes, setOdontogramNotes] = useState(medical?.odontogramNotes ?? '');
  const [lastDentalVisit, setLastDentalVisit] = useState(medical?.lastDentalVisit ? medical.lastDentalVisit.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateMedicalHistory(contact.id, {
        allergies: splitList(allergies),
        chronicConditions: splitList(chronicConditions),
        currentMedications: splitList(currentMedications),
        odontogramNotes: odontogramNotes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-h-[92vh] flex flex-col overflow-hidden">
        <ModalHeader>
          <ModalTitle>
            <span className="inline-flex items-center gap-2">
              <HeartPulse size={18} className="text-rose-500" /> Editar antecedentes
            </span>
          </ModalTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody className="flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Los campos de texto aceptan varios valores separados por coma. Los cambios se guardan localmente y se
            sincronizan con la nube.
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Alergias</label>
            <Textarea
              rows={2}
              placeholder="Penicilina, Anestesia con epinefrina, Látex"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Condiciones crónicas
            </label>
            <Textarea
              rows={2}
              placeholder="Diabetes tipo II, Hipertensión"
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Medicamentos actuales
            </label>
            <Textarea
              rows={2}
              placeholder="Metformina 500mg, Losartán 50mg"
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Última consulta odontológica
              </label>
              <Input type="date" value={lastDentalVisit} onChange={(e) => setLastDentalVisit(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Notas de odontograma (resumen)
            </label>
            <Textarea
              rows={3}
              placeholder="Resumen clínico breve del plan/odontograma..."
              value={odontogramNotes}
              onChange={(e) => setOdontogramNotes(e.target.value)}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar antecedentes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}