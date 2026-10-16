import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerServiceClient } from '@/lib/supabase/server'
import type { ContactPhoneMatch } from '@/lib/contacts/contactSearch'

export const dynamic = 'force-dynamic'

interface PhoneRow {
  phone_number: string
  contact_id: string
  contacts: {
    id: string
    first_name: string | null
    last_name: string | null
    company: string | null
    job_title: string | null
    patient_id: string | null
  } | null
}

const digits = (s: string): string => s.replace(/\D/g, '')
const localPart = (s: string): string => digits(s).slice(-8)

/**
 * A stored phone is compared as digits so country codes and separators cannot
 * defeat the match. A full number must agree on its last 8 digits (the local
 * part); a shorter query is still being typed, so a substring hit is enough.
 */
function isMatch(stored: string, q: string): boolean {
  const storedDigits = digits(stored)
  if (!storedDigits) return false
  if (q.length >= 8) return storedDigits.slice(-8) === q.slice(-8)
  return storedDigits.includes(q)
}

/** Exact local-part hits outrank partial ones; ties break on the contact name. */
function contactName(row: PhoneRow): string {
  const c = row.contacts
  return `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim()
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const q = digits(request.nextUrl.searchParams.get('q') ?? '')
    if (q.length < 4) return NextResponse.json([])

    const supabase = createServerServiceClient()
    const select = 'phone_number,contact_id,contacts(id,first_name,last_name,company,job_title,patient_id)'

    const prefilter = await supabase.from('contact_phones').select(select).ilike('phone_number', `%${q}%`).limit(500)

    let rows: PhoneRow[]
    if (prefilter.error) {
      console.error('contacts/search prefilter failed:', prefilter.error.message)
      rows = []
    } else {
      rows = (prefilter.data ?? []) as unknown as PhoneRow[]
    }

    // The prefilter is a plain LIKE, so a stored number carrying separators
    // can slip past it even though its digits do match. Fall back to scanning
    // every row (the table is small) and decide on normalized digits instead.
    if (rows.length === 0) {
      const scan = await supabase.from('contact_phones').select(select).limit(5000)
      if (scan.error) {
        console.error('contacts/search scan failed:', scan.error.message)
        return NextResponse.json({ error: 'Error buscando contactos' }, { status: 500 })
      }
      rows = (scan.data ?? []) as unknown as PhoneRow[]
    }

    const matched = rows.filter((row) => row.contacts && isMatch(row.phone_number, q))

    // Keep one row per contact, preferring the phone that matches exactly.
    const byContact = new Map<string, { row: PhoneRow; exact: boolean }>()
    for (const row of matched) {
      const exact = q.length >= 8 && localPart(row.phone_number) === localPart(q)
      const current = byContact.get(row.contact_id)
      if (!current || (exact && !current.exact)) byContact.set(row.contact_id, { row, exact })
    }

    const results = [...byContact.values()].sort((a, b) => {
      if (a.exact !== b.exact) return a.exact ? -1 : 1
      return contactName(a.row).localeCompare(contactName(b.row))
    })

    // Names for contacts that already belong to a patient, so the form can warn
    // before that link is replaced.
    const patientIds = [
      ...new Set(results.map((r) => r.row.contacts!.patient_id).filter((v): v is string => Boolean(v))),
    ]
    const patientNames = new Map<string, string>()
    if (patientIds.length) {
      const patients = await supabase.from('patients').select('paciente_id,nombre_completo').in('paciente_id', patientIds)
      if (patients.error) {
        console.error('contacts/search patient lookup failed:', patients.error.message)
      } else {
        for (const p of patients.data ?? []) patientNames.set(p.paciente_id, p.nombre_completo ?? '')
      }
    }

    const payload: ContactPhoneMatch[] = results.slice(0, 8).map(({ row }) => {
      const contact = row.contacts!
      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        company: contact.company,
        job_title: contact.job_title,
        phone_number: row.phone_number,
        patient_id: contact.patient_id,
        patient_name: contact.patient_id ? patientNames.get(contact.patient_id) ?? null : null,
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Unexpected error searching contacts:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
