'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { Search, Plus, Stethoscope } from 'lucide-react';
import type {
  ContactFilter,
  ContactSort,
  ContactSortKey,
  LocalContact,
} from '@/lib/contacts/db';
import { db, getLabels, queryContacts, sortContacts } from '@/lib/contacts/db';
import {
  createLocalLabel,
  initContactsSync,
  permanentlyDeleteLocalContact,
  restoreLocalContact,
  softDeleteLocalContact,
  toggleFavoriteLocal,
  updateLocalContact,
} from '@/lib/contacts/syncEngine';
import { exportContacts } from '@/lib/contacts/vcard';
import { ContactSidebar } from '@/components/contacts/ContactSidebar';
import { ContactTable } from '@/components/contacts/ContactTable';
import { ContactDetailSheet } from '@/components/contacts/ContactDetailSheet';
import { ContactEditorModal } from '@/components/contacts/ContactEditorModal';
import { ImportExportModal } from '@/components/contacts/ImportExportModal';
import { Button } from '@/components/ui/button';

type EditorState = { open: boolean; editing: LocalContact | null };

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** Hydration-safe snapshot of navigator.onLine (always "online" for SSR HTML). */
function getOnlineSnapshot(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

const ONLINE_SSR_SNAPSHOT = true;

export default function ContactosPage() {
  const { user } = useUser();
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<ContactSort>({ key: 'name', dir: 'asc' });
  const [sheetContact, setSheetContact] = useState<LocalContact | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false, editing: null });
  const [importExportOpen, setImportExportOpen] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => ONLINE_SSR_SNAPSHOT);
  const syncRef = useRef<{ syncNow: () => Promise<number> } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const userId = user?.id;

  const contacts = useLiveQuery(() => queryContacts(filter, search), [filter, search]);
  const pendingCount = useLiveQuery(() => db.contacts.where('synced').equals(0).count(), []);
  const labels = useLiveQuery(() => (userId ? getLabels(userId) : Promise.resolve([])), [userId]);

  const activeBase = useLiveQuery(
    () => db.contacts.where('deleted').equals(0).toArray(),
    [],
  );
  const trashCount = useLiveQuery(() => db.contacts.where('deleted').equals(1).count(), []);

  useEffect(() => {
    if (!userId) return;
    const sync = initContactsSync(userId);
    syncRef.current = sync;
    return () => sync.unsubscribe();
  }, [userId]);

  // Keyboard shortcuts: "/" => search, "c" => create, Escape => close overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (e.key === 'Escape') {
        setSheetContact(null);
        setEditor((s) => (s.open ? { ...s, open: false } : s));
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'c') {
        if (!editor.open) {
          setEditor({ open: true, editing: null });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor.open]);

  const counts = useMemo(
    () => ({
      all: activeBase?.filter((c) => !c.is_archived).length ?? 0,
      favorites: activeBase?.filter((c) => !c.is_archived && c.is_favorite).length ?? 0,
      archived: activeBase?.filter((c) => c.is_archived).length ?? 0,
      trash: trashCount ?? 0,
    }),
    [activeBase, trashCount],
  );

const labelList = useMemo(() => labels ?? [], [labels]);
  const labelMap = useMemo(() => new Map(labelList.map((l) => [l.id, l])), [labelList]);
  const contactList = useMemo(() => contacts ?? [], [contacts]);

  // Prune selection to ids that still exist in the current result set.
  const prunedSelection = useMemo(() => {
    const ids = new Set(contactList.map((c) => c.id));
    return new Set([...selection].filter((id) => ids.has(id)));
  }, [selection, contactList]);

  const sorted = useMemo(() => sortContacts(contactList, sort), [contactList, sort]);
  const isTrash = filter === 'trash';

  const selectFilter = (next: ContactFilter) => {
    setFilter(next);
    setSelection(new Set());
  };

  const toggleSort = (key: ContactSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // ---- Bulk actions -------------------------------------------------------
  const selectedContacts = useMemo(
    () => contactList.filter((c) => prunedSelection.has(c.id)),
    [contactList, prunedSelection],
  );

  const toggleSelectAll = () => {
    if (contactList.length === 0) return;
    const next = prunedSelection.size === contactList.length ? new Set<string>() : new Set(contactList.map((c) => c.id));
    setSelection(next);
  };

  const toggleSelect = (id: string) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportSelected = () => exportContacts(selectedContacts);

  const mergeSelected = async () => {
    if (selectedContacts.length < 2) return;
    const [keep, ...rest] = selectedContacts;
    const seenPhones = new Set(keep.phones.map((p) => p.phone_number.replace(/\D/g, '')));
    const seenEmails = new Set(keep.emails.map((e) => e.email.toLowerCase()));
    for (const c of rest) {
      for (const p of c.phones) {
        if (!seenPhones.has(p.phone_number.replace(/\D/g, ''))) keep.phones.push(p);
      }
      for (const e of c.emails) {
        if (!seenEmails.has(e.email.toLowerCase())) keep.emails.push(e);
      }
      for (const id of c.label_ids) {
        if (!keep.label_ids.includes(id)) keep.label_ids.push(id);
      }
    }
    await updateLocalContact(keep.id, {
      phones: keep.phones,
      emails: keep.emails,
      label_ids: keep.label_ids,
      first_name: keep.first_name ?? '',
      last_name: keep.last_name ?? '',
      company: keep.company ?? '',
      job_title: keep.job_title ?? '',
      notes: keep.notes ?? '',
    });
    for (const c of rest) await softDeleteLocalContact(c.id);
    setSelection(new Set());
  };

  const archiveSelected = async () => {
    for (const c of selectedContacts) await updateLocalContact(c.id, { is_archived: true });
    setSelection(new Set());
  };

  const trashSelected = async () => {
    for (const c of selectedContacts) await softDeleteLocalContact(c.id);
    setSelection(new Set());
    setSheetContact((prev) => (prev && prunedSelection.has(prev.id) ? null : prev));
  };

  const restoreSelected = async () => {
    for (const c of selectedContacts) await restoreLocalContact(c.id);
    setSelection(new Set());
  };

  const purgeSelected = async () => {
    for (const c of selectedContacts) await permanentlyDeleteLocalContact(c.id);
    setSelection(new Set());
    setSheetContact(null);
  };

  // ---- Single-contact actions ----------------------------------------------
  const openEditor = (c: LocalContact | null) => setEditor({ open: true, editing: c });
  const closeEditor = () => setEditor({ open: false, editing: null });

  const handleDelete = async (c: LocalContact) => {
    if (c.deleted === 1) await permanentlyDeleteLocalContact(c.id);
    else await softDeleteLocalContact(c.id);
    setSheetContact((prev) => (prev?.id === c.id ? null : prev));
  };

  const handleRestore = async (c: LocalContact) => {
    await restoreLocalContact(c.id);
    setSheetContact(null);
  };

  const handleToggleFavorite = async (c: LocalContact) => {
    await toggleFavoriteLocal(c.id);
    setSheetContact((prev) => (prev && prev.id === c.id ? { ...prev, is_favorite: !prev.is_favorite } : prev));
  };

  const handleAddLabel = async (name: string) => {
    if (!userId) return;
    await createLocalLabel(userId, name);
  };

  const handleResync = () => void syncRef.current?.syncNow();

  const loading = contacts === undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      <ContactSidebar
        labels={labelList}
        activeFilter={filter}
        counts={counts}
        pendingCount={pendingCount ?? 0}
        isOnline={isOnline}
        onCreate={() => openEditor(null)}
        onSelect={selectFilter}
        onAddLabel={handleAddLabel}
        onImportExport={() => setImportExportOpen(true)}
        onResync={handleResync}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header / search */}
        <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar contactos...  (  /  )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <Button onClick={() => openEditor(null)} variant="default" className="md:hidden rounded-full p-3 h-auto w-auto">
            <Plus size={18} />
          </Button>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <kbd className="rounded border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5">/</kbd> buscar
            <span className="mx-1">·</span>
            <kbd className="rounded border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5">c</kbd> crear
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex-1 overflow-auto">
            <ContactTable
              contacts={[]}
              selection={prunedSelection}
              sort={sort}
              isTrash={isTrash}
              loading
              labelMap={labelMap}
              onToggleSort={toggleSort}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelect={toggleSelect}
              onOpen={setSheetContact}
              onQuickEdit={() => undefined}
              onDelete={() => undefined}
              onRestore={() => undefined}
              onToggleFavorite={() => undefined}
              onExportSelected={() => undefined}
              onMergeSelected={() => undefined}
              onArchiveSelected={() => undefined}
              onDeleteSelected={() => undefined}
              onRestoreSelected={() => undefined}
              onPurgeSelected={() => undefined}
            />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            isTrash={isTrash}
            isLabel={typeof filter === 'object'}
            onCreate={() => openEditor(null)}
            searchTerm={search}
          />
        ) : (
          <div className="flex-1 overflow-auto">
            <ContactTable
              contacts={sorted}
              selection={prunedSelection}
              sort={sort}
              isTrash={isTrash}
              loading={false}
              labelMap={labelMap}
              onToggleSort={toggleSort}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelect={toggleSelect}
              onOpen={setSheetContact}
              onQuickEdit={(c) => openEditor(c)}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onToggleFavorite={handleToggleFavorite}
              onExportSelected={exportSelected}
              onMergeSelected={mergeSelected}
              onArchiveSelected={archiveSelected}
              onDeleteSelected={trashSelected}
              onRestoreSelected={restoreSelected}
              onPurgeSelected={purgeSelected}
            />
          </div>
        )}
      </main>

      <ContactDetailSheet
        contact={sheetContact}
        labels={labelList}
        onClose={() => setSheetContact(null)}
        onEdit={openEditor}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
        onRestore={handleRestore}
      />

      <ContactEditorModal
        key={`${editor.editing?.id ?? 'new'}-${editor.open}`}
        open={editor.open}
        editing={editor.editing}
        userId={userId}
        labels={labelList}
        onClose={closeEditor}
      />

      <ImportExportModal
        open={importExportOpen}
        userId={userId}
        allContacts={(activeBase ?? []).filter((c) => !c.is_archived)}
        onClose={() => setImportExportOpen(false)}
      />
    </div>
  );
}

function EmptyState({
  isTrash,
  isLabel,
  onCreate,
  searchTerm,
}: {
  isTrash: boolean;
  isLabel: boolean;
  onCreate: () => void;
  searchTerm: string;
}) {
  const title = searchTerm
    ? 'Sin resultados'
    : isTrash
      ? 'La papelera está vacía'
      : isLabel
        ? 'Sin contactos con esta etiqueta'
        : 'Aún no tienes contactos';
  const subtitle = searchTerm
    ? `No se encontraron coincidencias para “${searchTerm}”.`
    : isTrash
      ? 'Los contactos eliminados aparecerán aquí por un tiempo.'
      : isLabel
        ? 'Agrega pacientes a esta etiqueta desde el editor de contacto.'
        : 'Crea tu primer contacto para sincronizarlo entre todos los dispositivos de la clínica.';

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/5 flex items-center justify-center">
          <Stethoscope size={40} className="text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
        </div>
        <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500/90 flex items-center justify-center shadow">
          <Plus size={15} className="text-white" />
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      {!isTrash && !searchTerm && (
        <Button onClick={onCreate} variant="outline" className="mt-5">
          <Plus size={16} className="mr-1" /> Crear primer contacto
        </Button>
      )}
    </div>
  );
}