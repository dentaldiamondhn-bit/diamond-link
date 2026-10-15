/** One suggestion shown under the patient form's Teléfono field. */
export interface ContactPhoneMatch {
  id: string
  first_name: string | null
  last_name: string | null
  company: string | null
  job_title: string | null
  phone_number: string
  patient_id: string | null
  patient_name: string | null
}
