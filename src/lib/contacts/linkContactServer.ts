import { createServerServiceClient } from '@/lib/supabase/server'
import { meaningfulMedicalTags, splitField } from './medicalTags'

/**
 * Server-side counterpart of `patientLink.linkContactToPatient`.
 *
 * The patient form picks a contact from the Teléfono field and, once the
 * patient (EHR) exists, links that contact to it. This runs inside a server
 * action using the service-role client: the `contacts` tables are gated by
 * Clerk-based RLS (`auth.jwt()->>'sub' = user_id`) that the patient-form flow
 * never authenticates against, so the anon/anon-shaped clients see 0 rows.
 *
 * Contract — never destroy data a contact already holds:
 *  - `patient_id` is set unconditionally (re-linking is an explicit, confirmed
 *    user action in the form);
 *  - address / dob / job_title / notes / emergency_contact and the medical
 *    history are **fill-blanks-only**: an existing non-empty value always wins.
 *    (This is stricter than the client `linkContactToPatient`, which replaces
 *    the medical lists outright — the form's option promises "filling blanks
 *    only", and destroying an existing contact's history would be unrecoverable.)
 *  - phones/emails are appended when the contact does not already have them.
 *
 * Returns true when the contact row was linked.
 */
export async function linkContactToPatient(contactId: string, pacienteId: string): Promise<boolean> {
  if (!contactId || !pacienteId) return false

  const supabase = createServerServiceClient()

  const [{ data: patient, error: patientError }, { data: contact, error: contactError }] = await Promise.all([
    supabase.from('patients').select('*').eq('paciente_id', pacienteId).maybeSingle(),
    supabase
      .from('contacts')
      .select('id, user_id, patient_id, address, dob, job_title, notes, emergency_contact')
      .eq('id', contactId)
      .maybeSingle(),
  ])

  if (patientError || !patient) {
    console.error('linkContactToPatient: could not read patient', pacienteId, patientError?.message)
    return false
  }
  if (contactError || !contact) {
    console.error('linkContactToPatient: could not read contact', contactId, contactError?.message)
    return false
  }

  const [{ data: phones }, { data: emails }, { data: medical }] = await Promise.all([
    supabase.from('contact_phones').select('id, phone_number').eq('contact_id', contactId),
    supabase.from('contact_emails').select('id, email').eq('contact_id', contactId),
    supabase.from('patient_medical_history').select('*').eq('contact_id', contactId).maybeSingle(),
  ])

  const patch: Record<string, unknown> = {
    patient_id: pacienteId,
    updated_at: new Date().toISOString(),
  }

  if (!contact.address && patient.direccion) patch.address = patient.direccion
  if (!contact.dob && patient.fecha_nacimiento) {
    const dobRaw = patient.fecha_nacimiento
    patch.dob = dobRaw instanceof Date ? dobRaw.toISOString().slice(0, 10) : String(dobRaw).slice(0, 10)
  }
  if (!contact.job_title && patient.trabajo) patch.job_title = patient.trabajo
  if (!contact.notes && patient.observaciones_generales) patch.notes = patient.observaciones_generales
  if (!contact.emergency_contact) {
    const emergency = [patient.contacto_emergencia, emergencyPhoneToDisplay(patient)]
      .filter(Boolean)
      .join(' — ')
    if (emergency) patch.emergency_contact = emergency
  }

  const { error: contactError2 } = await supabase.from('contacts').update(patch).eq('id', contactId)
  if (contactError2) {
    console.error('linkContactToPatient: contact update failed', contactId, contactError2.message)
    return false
  }

  const existingPhones = phones ?? []
  const displayPhone = phoneToDisplay(patient.telefono, patient.codigopais)
  const phoneLocal = localPart(patient.telefono)
  if (displayPhone && phoneLocal && !existingPhones.some((p) => localPart(p.phone_number) === phoneLocal)) {
    const { error } = await supabase.from('contact_phones').insert({
      contact_id: contactId,
      type: 'mobile',
      phone_number: displayPhone,
      is_primary: existingPhones.length === 0,
      user_id: contact.user_id ?? null,
    })
    if (error) console.error('linkContactToPatient: phone insert failed', contactId, error.message)
  }

  const patientEmail = (patient.email ?? '').trim()
  const existingEmails = emails ?? []
  if (patientEmail && !existingEmails.some((e) => e.email.trim().toLowerCase() === patientEmail.toLowerCase())) {
    const { error } = await supabase.from('contact_emails').insert({
      contact_id: contactId,
      type: 'work',
      email: patientEmail,
      is_primary: existingEmails.length === 0,
      user_id: contact.user_id ?? null,
    })
    if (error) console.error('linkContactToPatient: email insert failed', contactId, error.message)
  }

  const blood = (patient.tipo_sangre ?? '').trim().toUpperCase()
  const historyRow: Record<string, unknown> = {
    contact_id: contactId,
    allergies: medical?.allergies?.length ? medical.allergies : meaningfulMedicalTags(splitField(patient.alergias)),
    chronic_conditions: medical?.chronic_conditions?.length
      ? medical.chronic_conditions
      : meaningfulMedicalTags(splitField(patient.enfermedades)),
    current_medications: medical?.current_medications?.length
      ? medical.current_medications
      : meaningfulMedicalTags(splitField(patient.medicamentos)),
    odontogram_notes: (patient.observaciones_medicas ?? '').trim() || medical?.odontogram_notes || null,
    last_dental_visit: (patient.visitas_dentista ?? '').trim() || medical?.last_dental_visit || null,
    blood_type: (BLOOD_TYPES.has(blood) ? blood : null) || medical?.blood_type || null,
    user_id: contact.user_id ?? medical?.user_id ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error: historyError } = await supabase
    .from('patient_medical_history')
    .upsert(historyRow, { onConflict: 'contact_id' })
  if (historyError) console.error('linkContactToPatient: medical history upsert failed', contactId, historyError.message)

  return true
}

const digits = (s?: string | null): string => (s ?? '').replace(/\D/g, '')
const localPart = (s?: string | null): string => digits(s).slice(-8)

const BLOOD_TYPES = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])

function phoneToDisplay(raw?: string | null, countryCode?: string | null): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  if (value.startsWith('+') || /^\d{1,3}\s/.test(value)) return value
  const code = (countryCode ?? '').trim()
  return code ? `+${code} ${value}` : value
}

function emergencyPhoneToDisplay(patient: Record<string, unknown>): string {
  const raw = String(patient.contacto_telefono ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('+') || /^\d{1,3}\s/.test(raw)) return raw
  const code = String(patient.codigopaisemergencia ?? '').trim()
  return code ? `+${code} ${raw}` : raw
}
