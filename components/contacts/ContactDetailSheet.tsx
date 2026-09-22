'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Pencil,
  Star,
  Printer,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  User,
  Siren,
  Shield,
  FileBadge,
  Lock,
  Stethoscope,
  FolderHeart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalContact, LocalLabel } from '@/lib/contacts/db';
import { fullName } from '@/lib/contacts/db';
import { openPrintView } from '@/lib/contacts/vcard';
import { ContactAvatar } from './ContactAvatar';

type SheetTab = 'info' | 'medical' | 'ehr';

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  placeholder?: string;
}

function InfoRow({ icon, label, value, placeholder = 'Sin datos' }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-medium">{label}</p>
        {value ? (
          <p className="text-sm text-zinc-800 dark:text-zinc-200 break-words">{value}</p>
        ) : (
          <p className="text-sm text-zinc-300 dark:text-zinc-600 italic">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active = false,
  disabled,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10'
          : disabled
            ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800',
      )}
      title={disabled ? 'Disponible próximamente' : undefined}
    >
      {icon}
      {label}
      {disabled && <Lock size={12} />}
    </button>
  );
}

interface ContactDetailSheetProps {
  contact: LocalContact | null;
  labels: LocalLabel[];
  onClose: () => void;
  onEdit: (c: LocalContact) => void;
  onToggleFavorite: (c: LocalContact) => void;
  onDelete: (c: LocalContact) => void;
  onRestore: (c: LocalContact) => void;
}

export function ContactDetailSheet({
  contact,
  labels,
  onClose,
  onEdit,
  onToggleFavorite,
  onDelete,
  onRestore,
}: ContactDetailSheetProps) {
  const [tab, setTab] = useState<SheetTab>('info');

  const open = !!contact;
  if (!contact) return null;

  const name = fullName(contact);
  const label = (id: string) => labels.find((l) => l.id === id);
  const isTrash = contact.deleted === 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 flex flex-col items-center px-6 pt-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start w-full">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 text-sm"
                >
                  <X size={18} />
                </button>
              </div>
              <ContactAvatar name={name || 'C'} size="lg" className="mt-2" />
              <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-white text-center">
                {name || 'Sin nombre'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {[contact.job_title, contact.company].filter(Boolean).join(' · ') || 'Contacto'}
              </p>
              {contact.label_ids.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap justify-center mt-3">
                  {contact.label_ids.map((id) => {
                    const l = label(id);
                    if (!l) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Quick actions */}
              <div className="flex items-center gap-1.5 mt-4">
                {isTrash ? (
                  <>
                    <button
                      onClick={() => onRestore(contact)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                    >
                      <RotateCcw size={15} /> Restaurar
                    </button>
                    <button
                      onClick={() => onDelete(contact)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 size={15} /> Eliminar definitivamente
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onEdit(contact)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Pencil size={15} /> Editar
                    </button>
                    <button
                      onClick={() => onToggleFavorite(contact)}
                      title={contact.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        contact.is_favorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                      )}
                    >
                      <Star size={16} className={contact.is_favorite ? 'fill-amber-400' : ''} />
                    </button>
                    <button
                      onClick={() => openPrintView(contact)}
                      title="Imprimir"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(contact)}
                      title="Mover a papelera"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex items-center gap-1 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <TabButton active={tab === 'info'} icon={<User size={15} />} label="Información" onClick={() => setTab('info')} />
              <TabButton disabled icon={<FolderHeart size={15} />} label="Historial Médico" />
              <TabButton disabled icon={<Stethoscope size={15} />} label="Expediente EHR" />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {contact.phones.length > 0 && (
                <section className="mb-5">
                  <h3 className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-semibold mb-1">
                    Teléfonos
                  </h3>
                  {contact.phones.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm text-zinc-800 dark:text-zinc-200">
                      <Phone size={14} className="text-zinc-400 shrink-0" />
                      <span className="font-medium">{p.phone_number}</span>
                      <span className="text-xs text-zinc-400 uppercase">{p.type}</span>
                    </div>
                  ))}
                </section>
              )}
              {contact.emails.length > 0 && (
                <section className="mb-5">
                  <h3 className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-semibold mb-1">
                    Correos
                  </h3>
                  {contact.emails.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-1.5 text-sm text-zinc-800 dark:text-zinc-200">
                      <Mail size={14} className="text-zinc-400 shrink-0" />
                      <span>{e.email}</span>
                    </div>
                  ))}
                </section>
              )}

              <section className="mb-5">
                <h3 className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-semibold mb-1">
                  Información personal
                </h3>
                <InfoRow icon={<MapPin size={15} />} label="Dirección" value={contact.address} />
                <InfoRow icon={<CalendarDays size={15} />} label="Fecha de nacimiento" value={contact.dob} />
                <InfoRow icon={<User size={15} />} label="Género" value={contact.gender} />
                <InfoRow icon={<Stethoscope size={15} />} label="Notas" value={contact.notes} />
              </section>

              <section className="mb-2">
                <h3 className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 font-semibold mb-1">
                  Información clínica
                </h3>
                <InfoRow icon={<Siren size={15} />} label="Contacto de emergencia" value={contact.emergency_contact} placeholder="Disponible próximamente" />
                <InfoRow icon={<Shield size={15} />} label="Aseguradora" value={contact.insurance_provider} placeholder="Disponible próximamente" />
                <InfoRow icon={<FileBadge size={15} />} label="N° de póliza" value={contact.policy_number} placeholder="Disponible próximamente" />
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}