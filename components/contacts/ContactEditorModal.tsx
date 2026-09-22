'use client';

import { useState } from 'react';
import { Plus, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailType, LocalContact, LocalLabel, PhoneType } from '@/lib/contacts/db';
import { fullName, newLocalId } from '@/lib/contacts/db';
import { createLocalContact, updateLocalContact } from '@/lib/contacts/syncEngine';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { ContactAvatar } from './ContactAvatar';

interface DraftPhone {
  id: string;
  type: PhoneType;
  phone_number: string;
  is_primary: boolean;
}
interface DraftEmail {
  id: string;
  type: EmailType;
  email: string;
  is_primary: boolean;
}

interface DraftContact {
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  notes: string;
  address: string;
  dob: string;
  gender: string;
  emergency_contact: string;
  insurance_provider: string;
  policy_number: string;
  is_favorite: boolean;
  is_archived: boolean;
  label_ids: string[];
  phones: DraftPhone[];
  emails: DraftEmail[];
}

function emptyDraft(): DraftContact {
  return {
    first_name: '',
    last_name: '',
    company: '',
    job_title: '',
    notes: '',
    address: '',
    dob: '',
    gender: '',
    emergency_contact: '',
    insurance_provider: '',
    policy_number: '',
    is_favorite: false,
    is_archived: false,
    label_ids: [],
    phones: [],
    emails: [],
  };
}

function draftFromContact(c: LocalContact): DraftContact {
  return {
    first_name: c.first_name ?? '',
    last_name: c.last_name ?? '',
    company: c.company ?? '',
    job_title: c.job_title ?? '',
    notes: c.notes ?? '',
    address: c.address ?? '',
    dob: c.dob ?? '',
    gender: c.gender ?? '',
    emergency_contact: c.emergency_contact ?? '',
    insurance_provider: c.insurance_provider ?? '',
    policy_number: c.policy_number ?? '',
    is_favorite: c.is_favorite,
    is_archived: c.is_archived,
    label_ids: [...c.label_ids],
    phones: c.phones.map((p) => ({ id: p.id, type: p.type, phone_number: p.phone_number, is_primary: p.is_primary ?? false })),
    emails: c.emails.map((e) => ({ id: e.id, type: e.type, email: e.email, is_primary: e.is_primary ?? false })),
  };
}

interface ContactEditorModalProps {
  open: boolean;
  editing: LocalContact | null;
  userId?: string;
  labels: LocalLabel[];
  onClose: () => void;
}

export function ContactEditorModal({ open, editing, userId, labels, onClose }: ContactEditorModalProps) {
  const [draft, setDraft] = useState<DraftContact>(() =>
    editing ? draftFromContact(editing) : emptyDraft(),
  );

  if (!open) return null;

  const set = <K extends keyof DraftContact>(key: K, value: DraftContact[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleLabel = (id: string) =>
    setDraft((d) => ({
      ...d,
      label_ids: d.label_ids.includes(id) ? d.label_ids.filter((l) => l !== id) : [...d.label_ids, id],
    }));

  const addPhone = () =>
    set('phones', [...draft.phones, { id: newLocalId(), type: 'mobile', phone_number: '', is_primary: draft.phones.length === 0 }]);
  const addEmail = () =>
    set('emails', [...draft.emails, { id: newLocalId(), type: 'work', email: '', is_primary: draft.emails.length === 0 }]);

  const updatePhone = (id: string, patch: Partial<DraftPhone>) =>
    set('phones', draft.phones.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateEmail = (id: string, patch: Partial<DraftEmail>) =>
    set('emails', draft.emails.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removePhone = (id: string) => set('phones', draft.phones.filter((p) => p.id !== id));
  const removeEmail = (id: string) => set('emails', draft.emails.filter((e) => e.id !== id));

  const sectionTitle = (label: string) => (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
  );

  const save = async () => {
    if (!userId) return;
    const payload = {
      first_name: draft.first_name || null,
      last_name: draft.last_name || null,
      company: draft.company || null,
      job_title: draft.job_title || null,
      notes: draft.notes || null,
      address: draft.address || null,
      dob: draft.dob || null,
      gender: draft.gender || null,
      emergency_contact: draft.emergency_contact || null,
      insurance_provider: draft.insurance_provider || null,
      policy_number: draft.policy_number || null,
      is_favorite: draft.is_favorite,
      is_archived: draft.is_archived,
      label_ids: draft.label_ids,
      phones: draft.phones.map((p) => ({ id: p.id, type: p.type, phone_number: p.phone_number, is_primary: p.is_primary })),
      emails: draft.emails.map((e) => ({ id: e.id, type: e.type, email: e.email, is_primary: e.is_primary })),
    };
    if (editing) {
      await updateLocalContact(editing.id, payload);
    } else {
      await createLocalContact(userId, payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-h-[92vh] flex flex-col overflow-hidden">
        <ModalHeader>
          <ModalTitle>{editing ? 'Editar contacto' : 'Nuevo contacto'}</ModalTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody className="flex-1 overflow-y-auto space-y-5">
          <div className="flex items-center gap-4">
            <ContactAvatar name={fullName(draft)} size="lg" />
            <div className="grid grid-cols-2 gap-3 flex-1">
              <Input placeholder="Nombre" value={draft.first_name} onChange={(e) => set('first_name', e.target.value)} />
              <Input placeholder="Apellido" value={draft.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Empresa" value={draft.company} onChange={(e) => set('company', e.target.value)} />
            <Input placeholder="Cargo" value={draft.job_title} onChange={(e) => set('job_title', e.target.value)} />
          </div>
          <Input placeholder="Dirección" value={draft.address} onChange={(e) => set('address', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Fecha de nacimiento</label>
              <Input type="date" value={draft.dob} onChange={(e) => set('dob', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Género</label>
              <Select value={draft.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              {sectionTitle('Teléfonos')}
              <Button type="button" size="sm" variant="outline" onClick={addPhone}>
                <Plus size={14} className="mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {draft.phones.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Select value={p.type} onChange={(e) => updatePhone(p.id, { type: e.target.value as PhoneType })} className="w-32 shrink-0">
                    <option value="mobile">Celular</option>
                    <option value="work">Trabajo</option>
                    <option value="home">Casa</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="fax">Fax</option>
                    <option value="other">Otro</option>
                  </Select>
                  <Input
                    placeholder="+504 0000-0000"
                    value={p.phone_number}
                    onChange={(e) => updatePhone(p.id, { phone_number: e.target.value })}
                  />
                  <button type="button" onClick={() => removePhone(p.id)} className="text-slate-400 hover:text-rose-500 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {draft.phones.length === 0 && <p className="text-sm text-slate-400">Sin números de teléfono.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              {sectionTitle('Correos electrónicos')}
              <Button type="button" size="sm" variant="outline" onClick={addEmail}>
                <Plus size={14} className="mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {draft.emails.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <Select value={e.type} onChange={(ev) => updateEmail(e.id, { type: ev.target.value as EmailType })} className="w-32 shrink-0">
                    <option value="work">Trabajo</option>
                    <option value="personal">Personal</option>
                    <option value="other">Otro</option>
                  </Select>
                  <Input
                    placeholder="correo@ejemplo.com"
                    type="email"
                    value={e.email}
                    onChange={(ev) => updateEmail(e.id, { email: ev.target.value })}
                  />
                  <button type="button" onClick={() => removeEmail(e.id)} className="text-slate-400 hover:text-rose-500 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {draft.emails.length === 0 && <p className="text-sm text-slate-400">Sin correos electrónicos.</p>}
            </div>
          </div>

          {labels.length > 0 && (
            <div>
              {sectionTitle('Etiquetas')}
              <div className="mt-2 flex flex-wrap gap-2">
                {labels.map((label) => {
                  const active = draft.label_ids.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'text-white'
                          : 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                      )}
                      style={active ? { backgroundColor: label.color } : undefined}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#fff' : label.color }} />
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            {sectionTitle('Información clínica (optativa)')}
            <div className="mt-2 grid grid-cols-1 gap-3">
              <Input placeholder="Contacto de emergencia" value={draft.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Aseguradora" value={draft.insurance_provider} onChange={(e) => set('insurance_provider', e.target.value)} />
                <Input placeholder="N° de póliza" value={draft.policy_number} onChange={(e) => set('policy_number', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Notas</label>
            <Textarea placeholder="Notas internas..." value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer select-none">
            <input type="checkbox" checked={draft.is_favorite} onChange={(e) => set('is_favorite', e.target.checked)} className="accent-amber-500" />
            <Star size={15} className="text-amber-500" /> Marcar como favorito
          </label>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Guardar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}