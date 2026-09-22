import type { LocalContact, LocalContactEmail, LocalContactPhone } from './db'
import { fullName } from './db'

export interface ParsedContact {
  first_name?: string
  last_name?: string
  company?: string
  job_title?: string
  notes?: string
  phones: { type: string; phone_number: string; is_primary?: boolean }[]
  emails: { type: string; email: string; is_primary?: boolean }[]
}

export function contactToVCard(c: LocalContact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  lines.push(`FN:${fullName(c)}`)
  lines.push(`N:${c.last_name ?? ''};${c.first_name ?? ''};;;`)
  for (const p of c.phones) lines.push(`TEL;TYPE=${p.type.toUpperCase()}:${p.phone_number}`)
  for (const e of c.emails) lines.push(`EMAIL;TYPE=${e.type.toUpperCase()}:${e.email}`)
  if (c.company) lines.push(`ORG:${c.company}`)
  if (c.job_title) lines.push(`TITLE:${c.job_title}`)
  if (c.address) lines.push(`ADR:;;${c.address.replaceAll('\n', ' ')}`)
  if (c.dob) lines.push(`BDAY:${c.dob}`)
  if (c.notes) lines.push(`NOTE:${c.notes.replaceAll('\n', ' ')}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadTextFile(name: string, content: string, mime = 'text/vcard'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function buildMultiVcf(contacts: LocalContact[]): string {
  return contacts.map(contactToVCard).join('\r\n')
}

export function exportContact(c: LocalContact): void {
  downloadTextFile(`${fullName(c).replace(/\s+/g, '_') || 'contacto'}.vcf`, contactToVCard(c))
}

export function exportContacts(contacts: LocalContact[]): void {
  if (contacts.length === 1) {
    exportContact(contacts[0])
    return
  }
  downloadTextFile(`contactos_${new Date().toISOString().slice(0, 10)}.vcf`, buildMultiVcf(contacts))
}

function decodeQuotedPrintable(value: string): string | undefined {
  if (!value.includes('=')) return value
  try {
    let decoded = value.replace(/=\r?\n/g, '')
    decoded = decoded.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return decodeURIComponent(decoded)
  } catch {
    return value
  }
}

function cleanField(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (value.includes('ENCODING=QUOTED-PRINTABLE') || value.includes('QUOTED-PRINTABLE')) {
    const middle = value.split(':').slice(1).join(':')
    return decodeQuotedPrintable(middle)?.trim()
  }
  const colon = value.indexOf(':')
  return value.slice(colon + 1).trim()
}

function parseCard(lines: string[]): ParsedContact {
  const result: ParsedContact = { phones: [], emails: [] }
  for (const raw of lines) {
    const line = raw.trim()
    const lower = line.toLowerCase()
    if (line.startsWith('FN')) {
      const v = cleanField(line)
      if (v) {
        const parts = v.trim().split(/\s+/)
        result.first_name = parts[0]
        result.last_name = parts.slice(1).join(' ')
      }
    } else if (lower.startsWith('n:')) {
      const v = cleanField(line)
      if (v) {
        const [last, first] = v.split(';')
        if (!result.first_name) result.first_name = first?.trim() || undefined
        if (!result.last_name) result.last_name = last?.trim() || undefined
      }
    } else if (lower.startsWith('tel')) {
      const v = cleanField(line)
      if (v) {
        const type = line.match(/TYPE=([^:;\s]+)/i)?.[1]?.toLowerCase()
        result.phones.push({ type: type ?? 'mobile', phone_number: v })
      }
    } else if (lower.startsWith('email')) {
      const v = cleanField(line)
      if (v) {
        const type = line.match(/TYPE=([^:;\s]+)/i)?.[1]?.toLowerCase()
        result.emails.push({ type: type ?? 'work', email: v })
      }
    } else if (lower.startsWith('org')) {
      result.company = cleanField(line)
    } else if (lower.startsWith('title')) {
      result.job_title = cleanField(line)
    } else if (lower.startsWith('note')) {
      result.notes = cleanField(line)
    }
  }
  return result
}

export function parseVcfText(text: string): ParsedContact[] {
  const cards: ParsedContact[] = []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split('BEGIN:VCARD')
  for (const block of blocks) {
    if (!block.includes('END:VCARD')) continue
    const lines = block.split('\n').filter((l) => l.trim())
    cards.push(parseCard(lines))
  }
  return cards
}

export function whitelistPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

export function openPrintView(c: LocalContact): void {
  const win = window.open('', '_blank', 'width=640,height=800')
  if (!win) return
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const rows: LocalContactPhone[] = c.phones
  const mails: LocalContactEmail[] = c.emails
  const meta: Array<[string, string]> = (
    [
      ['Dirección', c.address ?? ''],
      ['Fecha de nacimiento', c.dob ?? ''],
      ['Género', c.gender ?? ''],
      ['Contacto de emergencia', c.emergency_contact ?? ''],
      ['Aseguradora', c.insurance_provider ?? ''],
      ['N° de póliza', c.policy_number ?? ''],
    ] as Array<[string, string]>
  ).filter(([, v]) => v)

  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(fullName(c))}</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#18181b;max-width:520px;margin:40px auto;padding:0 20px}
    h1{font-size:26px;margin-bottom:4px} .sub{color:#71717a;margin-bottom:24px}
    section{margin-bottom:24px} h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#a1a1aa;margin-bottom:8px;border-bottom:1px solid #e4e4e7;padding-bottom:6px}
    ul{list-style:none;padding:0;margin:0} li{padding:5px 0;color:#3f3f46} li b{color:#18181b;display:inline-block;min-width:80px}
  </style></head><body>
  <h1>${esc(fullName(c))}</h1>
  <div class="sub">${esc([c.job_title, c.company].filter(Boolean).join(' · ') || 'Contacto')}</div>
  ${rows.length ? `<section><h2>Teléfonos</h2><ul>${rows.map((p) => `<li>${esc(p.phone_number)}</li>`).join('')}</ul></section>` : ''}
  ${mails.length ? `<section><h2>Correos</h2><ul>${mails.map((e) => `<li>${esc(e.email)}</li>`).join('')}</ul></section>` : ''}
  ${c.notes ? `<section><h2>Notas</h2><p>${esc(c.notes)}</p></section>` : ''}
  ${meta.length ? `<section><h2>Información</h2><ul>${meta.map(([k, v]) => `<li><b>${esc(k)}</b>${esc(v)}</li>`).join('')}</ul></section>` : ''}
  <script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
  </body></html>`)
  win.document.close()
}