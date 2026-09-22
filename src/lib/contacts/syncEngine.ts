import { supabase } from '../supabase'
import {
  db,
  newLocalId,
  LABEL_COLORS,
  DEFAULT_LABEL_NAMES,
  type LocalContact,
  type LocalContactEmail,
  type LocalContactPhone,
  type LocalLabel,
  type PhoneType,
  type EmailType,
} from './db'

interface RemotePhoneRow {
  id: string
  type: PhoneType | string
  phone_number: string
  is_primary?: boolean
}

interface RemoteEmailRow {
  id: string
  type: EmailType | string
  email: string
  is_primary?: boolean
}

interface RemoteContactRow {
  id: string
  user_id: string
  patient_id?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  job_title?: string | null
  notes?: string | null
  avatar_url?: string | null
  address?: string | null
  dob?: string | null
  gender?: string | null
  emergency_contact?: string | null
  insurance_provider?: string | null
  policy_number?: string | null
  is_favorite?: boolean
  is_archived?: boolean
  version?: number
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  contact_phones?: RemotePhoneRow[] | null
  contact_emails?: RemoteEmailRow[] | null
}

interface RemoteLabelRow {
  id: string
  user_id: string
  name: string
  color: string
}

interface RemoteJunctionRow {
  contact_id: string
  label_id: string
}

function toLocalContact(row: RemoteContactRow, userId: string): LocalContact {
  const deletedAt = row.deleted_at ?? null
  return {
    id: row.id,
    user_id: row.user_id || userId,
    patient_id: row.patient_id ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    company: row.company ?? null,
    job_title: row.job_title ?? null,
    notes: row.notes ?? null,
    avatar_url: row.avatar_url ?? null,
    address: row.address ?? null,
    dob: row.dob ?? null,
    gender: row.gender ?? null,
    emergency_contact: row.emergency_contact ?? null,
    insurance_provider: row.insurance_provider ?? null,
    policy_number: row.policy_number ?? null,
    is_favorite: !!row.is_favorite,
    is_archived: !!row.is_archived,
    version: row.version ?? 1,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    deleted_at: deletedAt,
    phones: (row.contact_phones ?? []).map((p) => ({
      id: p.id,
      type: (['mobile', 'work', 'home', 'whatsapp', 'fax', 'other'] as string[]).includes(p.type)
        ? (p.type as PhoneType)
        : 'other',
      phone_number: p.phone_number,
      is_primary: !!p.is_primary,
    })),
    emails: (row.contact_emails ?? []).map((e) => ({
      id: e.id,
      type: (['work', 'personal', 'other'] as string[]).includes(e.type)
        ? (e.type as EmailType)
        : 'other',
      email: e.email,
      is_primary: !!e.is_primary,
    })),
    label_ids: [],
    synced: 1,
    deleted: deletedAt ? 1 : 0,
  }
}

// ---------------------------------------------------------------------------
// PUSH: local IndexedDB -> Supabase
// ---------------------------------------------------------------------------

async function pushLabels(userId: string): Promise<number> {
  const all = await db.labels.where('user_id').equals(userId).toArray()
  const unsynced = all.filter((l) => l.synced === 0)
  let pushed = 0
  for (const label of unsynced) {
    try {
      await supabase.from('contact_labels').upsert(
        { id: label.id, user_id: userId, name: label.name, color: label.color },
        { onConflict: 'id' },
      )
      await db.labels.update(label.id, { synced: 1 })
      pushed += 1
    } catch (err) {
      console.error(`[sync] push de etiqueta fallida (${label.name}):`, err)
    }
  }
  return pushed
}

async function pushContactJunctions(contactId: string, labelIds: string[]): Promise<void> {
  await supabase.from('contact_label_junction').delete().eq('contact_id', contactId)
  if (labelIds.length > 0) {
    await supabase.from('contact_label_junction').insert(
      labelIds.map((label_id) => ({ contact_id: contactId, label_id })),
    )
  }
}

export async function pushLocalChanges(userId: string): Promise<number> {
  const unsynced = await db.contacts.where('synced').equals(0).toArray()
  let pushed = 0

  for (const contact of unsynced) {
    const now = new Date().toISOString()
    try {
      if (contact.deleted === 1) {
        await supabase
          .from('contacts')
          .update({ deleted_at: now, updated_at: now, version: (contact.version ?? 1) + 1 })
          .eq('id', contact.id)
      } else {
        const { id, phones, emails, label_ids, ...rest } = contact
        const { synced: _synced, deleted: _deleted, deleted_at: _deletedAt, ...payload } = rest
        await supabase.from('contacts').upsert(
          {
            id,
            user_id: userId,
            ...payload,
            deleted_at: null,
            updated_at: now,
            version: (contact.version ?? 1) + 1,
          },
          { onConflict: 'id' },
        )

        await supabase.from('contact_phones').delete().eq('contact_id', id)
        if (phones.length > 0) {
          await supabase.from('contact_phones').insert(
            phones.map((p) => ({
              id: p.id,
              contact_id: id,
              type: p.type,
              phone_number: p.phone_number,
              is_primary: !!p.is_primary,
            })),
          )
        }

        await supabase.from('contact_emails').delete().eq('contact_id', id)
        if (emails.length > 0) {
          await supabase.from('contact_emails').insert(
            emails.map((e) => ({
              id: e.id,
              contact_id: id,
              type: e.type,
              email: e.email,
              is_primary: !!e.is_primary,
            })),
          )
        }

        await pushContactJunctions(id, label_ids)
      }

      await db.contacts.update(contact.id, {
        synced: 1,
        deleted_at: contact.deleted === 1 ? contact.deleted_at ?? now : null,
        version: (contact.version ?? 1) + 1,
      })
      pushed += 1
    } catch (err) {
      console.error(`[sync] push fallida para ${contact.id}:`, err)
    }
  }

  const labelsPushed = await pushLabels(userId)
  return pushed + labelsPushed
}

// ---------------------------------------------------------------------------
// PULL: Supabase -> local IndexedDB (last-write-wins, local pending wins)
// ---------------------------------------------------------------------------

export async function pullRemoteContacts(userId: string): Promise<number> {
  const [contactsRes, labelsRes, junctionsRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('*, contact_phones(*), contact_emails(*)')
      .eq('user_id', userId)
      .limit(2000),
    supabase.from('contact_labels').select('*').eq('user_id', userId),
    supabase.from('contact_label_junction').select('contact_id, label_id'),
  ])

  if (contactsRes.error) throw new Error(contactsRes.error.message)

  const rows = (Array.isArray(contactsRes.data) ? contactsRes.data : []) as RemoteContactRow[]
  const labelRows = (Array.isArray(labelsRes.data) ? labelsRes.data : []) as RemoteLabelRow[]
  const junctionRows = (Array.isArray(junctionsRes.data) ? junctionsRes.data : []) as RemoteJunctionRow[]
  const remoteIds = new Set(rows.map((r) => r.id))

  // Reconcile labels
  const junctionByContact = new Map<string, string[]>()
  for (const j of junctionRows) {
    const list = junctionByContact.get(j.contact_id) ?? []
    list.push(j.label_id)
    junctionByContact.set(j.contact_id, list)
  }
  const remoteLabelIds = new Set(labelRows.map((l) => l.id))
  let reconciled = 0

  for (const label of labelRows) {
    await db.labels.put({
      id: label.id,
      user_id: label.user_id || userId,
      name: label.name,
      color: label.color,
      synced: 1,
    })
    reconciled += 1
  }
  const localLabels = await db.labels.where('user_id').equals(userId).toArray()
  for (const local of localLabels) {
    if (local.synced === 1 && !remoteLabelIds.has(local.id)) {
      await db.labels.delete(local.id)
    }
  }

  // Reconcile contacts
  for (const row of rows) {
    const existing = await db.contacts.get(row.id)
    const remoteTs = new Date(row.updated_at ?? 0).getTime()
    const localTs = existing ? new Date(existing.updated_at ?? 0).getTime() : 0

    // Local unsynced edit that is newer wins and will be pushed on next sync.
    if (existing && existing.synced === 0 && localTs > remoteTs) continue

    const local = toLocalContact(row, userId)
    local.label_ids = junctionByContact.get(row.id) ?? []
    await db.contacts.put(local)
    reconciled += 1
  }

  // Tombstone any synced local rows that no longer exist remotely.
  const localRows = await db.contacts.where('user_id').equals(userId).toArray()
  for (const local of localRows) {
    if (local.synced === 1 && !remoteIds.has(local.id) && local.deleted === 0) {
      await db.contacts.update(local.id, { deleted: 1, deleted_at: new Date().toISOString() })
    }
  }

  return reconciled
}

// ---------------------------------------------------------------------------
// REALTIME subscription (Supabase websockets -> local)
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleRealtimePull(userId: string, onChange: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    pullRemoteContacts(userId)
      .catch((err) => console.error('[sync] pull en tiempo real fallida:', err))
      .finally(onChange)
  }, 600)
}

export function subscribeToRealtimeSync(
  userId: string,
  onChange: () => void,
): { channel: ReturnType<typeof supabase.channel>; unsubscribe: () => void } {
  const handleChange = () => scheduleRealtimePull(userId, onChange)

  const channel = supabase
    .channel('contacts_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` },
      handleChange,
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_phones' }, handleChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_emails' }, handleChange)
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      supabase.removeChannel(channel)
    },
  }
}

export interface ContactsSyncHandle {
  unsubscribe: () => void
  syncNow: () => Promise<number>
}

export async function seedDefaultLabels(userId: string): Promise<void> {
  const count = await db.labels.where('user_id').equals(userId).count()
  if (count > 0) return
  const nowIds = DEFAULT_LABEL_NAMES.map((name, i) => ({
    id: newLocalId(),
    user_id: userId,
    name,
    color: LABEL_COLORS[i % LABEL_COLORS.length],
    synced: 0 as const,
  }))
  await db.labels.bulkAdd(nowIds)
}

export function initContactsSync(userId: string, onChange?: () => void): ContactsSyncHandle {
  let disposed = false
  const notify = () => {
    if (!disposed) onChange?.()
  }

  const { unsubscribe } = subscribeToRealtimeSync(userId, notify)

  void seedDefaultLabels(userId).then(() =>
    pullRemoteContacts(userId)
      .catch((err) => console.error('[sync] pull inicial fallida:', err))
      .finally(notify),
  )

  const handleOnline = () => {
    void pushLocalChanges(userId)
      .then(() => pullRemoteContacts(userId))
      .catch((err) => console.error('[sync] sincronización online fallida:', err))
      .finally(notify)
  }
  window.addEventListener('online', handleOnline)
  window.addEventListener('focus', handleOnline)

  return {
    unsubscribe: () => {
      disposed = true
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleOnline)
    },
    syncNow: () => pushLocalChanges(userId).then((n) => pullRemoteContacts(userId).then(() => n)),
  }
}

// ---------------------------------------------------------------------------
// Local-first write helpers (write to IndexedDB first, then push)
// ---------------------------------------------------------------------------

export interface NewContactInput {
  first_name?: string
  last_name?: string
  company?: string
  job_title?: string
  notes?: string
  address?: string
  dob?: string
  gender?: string
  emergency_contact?: string
  insurance_provider?: string
  policy_number?: string
  is_favorite?: boolean
  is_archived?: boolean
  label_ids?: string[]
  phones: { id?: string; type: PhoneType; phone_number: string; is_primary?: boolean }[]
  emails: { id?: string; type: EmailType; email: string; is_primary?: boolean }[]
}

export async function createLocalContact(userId: string, input: NewContactInput): Promise<LocalContact> {
  const id = newLocalId()
  const now = new Date().toISOString()
  const contact: LocalContact = {
    id,
    user_id: userId,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    company: input.company ?? null,
    job_title: input.job_title ?? null,
    notes: input.notes ?? null,
    address: input.address ?? null,
    dob: input.dob ?? null,
    gender: input.gender ?? null,
    emergency_contact: input.emergency_contact ?? null,
    insurance_provider: input.insurance_provider ?? null,
    policy_number: input.policy_number ?? null,
    is_favorite: !!input.is_favorite,
    is_archived: !!input.is_archived,
    version: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    phones: input.phones.map((p) => ({
      id: p.id ?? newLocalId(),
      type: p.type,
      phone_number: p.phone_number,
      is_primary: p.is_primary ?? false,
    })),
    emails: input.emails.map((e) => ({
      id: e.id ?? newLocalId(),
      type: e.type,
      email: e.email,
      is_primary: e.is_primary ?? false,
    })),
    label_ids: input.label_ids ?? [],
    synced: 0,
    deleted: 0,
  }

  await db.contacts.add(contact)
  void pushLocalChanges(userId)
  return contact
}

export interface UpdateContactPatch {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  job_title?: string | null
  notes?: string | null
  address?: string | null
  dob?: string | null
  gender?: string | null
  emergency_contact?: string | null
  insurance_provider?: string | null
  policy_number?: string | null
  is_favorite?: boolean
  is_archived?: boolean
  label_ids?: string[]
  phones?: LocalContactPhone[]
  emails?: LocalContactEmail[]
}

export async function updateLocalContact(id: string, patch: UpdateContactPatch): Promise<void> {
  const existing = await db.contacts.get(id)
  if (!existing) return

  const { label_ids, ...rest } = patch
  await db.contacts.update(id, {
    ...rest,
    ...(label_ids !== undefined ? { label_ids } : {}),
    version: (existing.version ?? 1) + 1,
    updated_at: new Date().toISOString(),
    synced: 0,
  })
  void pushLocalChanges(existing.user_id)
}

export async function toggleFavoriteLocal(id: string): Promise<void> {
  const existing = await db.contacts.get(id)
  if (!existing) return
  await db.contacts.update(id, {
    is_favorite: !existing.is_favorite,
    version: (existing.version ?? 1) + 1,
    updated_at: new Date().toISOString(),
    synced: 0,
  })
  void pushLocalChanges(existing.user_id)
}

export async function softDeleteLocalContact(id: string): Promise<void> {
  const existing = await db.contacts.get(id)
  if (!existing) return
  await db.contacts.update(id, {
    deleted: 1,
    deleted_at: new Date().toISOString(),
    version: (existing.version ?? 1) + 1,
    updated_at: new Date().toISOString(),
    synced: 0,
  })
  void pushLocalChanges(existing.user_id)
}

export async function restoreLocalContact(id: string): Promise<void> {
  const existing = await db.contacts.get(id)
  if (!existing) return
  await db.contacts.update(id, {
    deleted: 0,
    deleted_at: null,
    version: (existing.version ?? 1) + 1,
    updated_at: new Date().toISOString(),
    synced: 0,
  })
  void pushLocalChanges(existing.user_id)
}

export async function permanentlyDeleteLocalContact(id: string): Promise<void> {
  const existing = await db.contacts.get(id)
  if (!existing) return
  await db.contacts.delete(id)
  try {
    await supabase.from('contacts').delete().eq('id', id)
  } catch (err) {
    console.error(`[sync] borrado definitivo fallida para ${id}:`, err)
  }
}

export async function createLocalLabel(userId: string, name: string, color?: string): Promise<LocalLabel> {
  const id = newLocalId()
  const label: LocalLabel = {
    id,
    user_id: userId,
    name,
    color: color ?? LABEL_COLORS[newLocalId().charCodeAt(0) % LABEL_COLORS.length],
    synced: 0,
  }
  await db.labels.add(label)
  void pushLocalChanges(userId)
  return label
}

export async function countPendingSync(): Promise<number> {
  return db.contacts.where('synced').equals(0).count()
}