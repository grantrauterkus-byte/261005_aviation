/**
 * Turns what a person types to sign in (an email, a phone number or a name) into the login used by Supabase Auth.
 * Shared by the app (src/) and the "people" edge function, so both always agree.
 *
 * Supabase password sign-in needs an email address, so phone numbers and names get a stand-in address on the
 * reserved ".invalid" domain, which can never receive mail. Nothing is ever sent to these addresses.
 */

export type IdentityKind = 'Email' | 'Phone' | 'Name'

export interface Identity {
  kind: IdentityKind
  /** Shown to people and stored as "signs in as": the email, the phone number with country code, or the name. */
  signInAs: string
  /** The address Supabase Auth uses for this person. */
  authEmail: string
}

const STAND_IN_DOMAIN = 'people.invalid'

export function parseIdentity(input: string): Identity | null {
  const raw = input.trim().replace(/\s+/g, ' ')
  if (!raw) return null

  if (raw.includes('@')) {
    const email = raw.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
    return { kind: 'Email', signInAs: email, authEmail: email }
  }

  if (/^[+(\d][\d\s().-]*$/.test(raw)) {
    let digits = raw.replace(/\D/g, '')
    if (!raw.startsWith('+') && digits.length === 10) digits = `1${digits}` // a US number without the country code
    if (digits.length < 8 || digits.length > 15) return null
    return { kind: 'Phone', signInAs: `+${digits}`, authEmail: `phone-${digits}@${STAND_IN_DOMAIN}` }
  }

  const name = raw.toLowerCase()
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  if (slug.length < 2 || slug.length > 60) return null
  return { kind: 'Name', signInAs: name, authEmail: `name-${slug}@${STAND_IN_DOMAIN}` }
}

/** A temporary password that is easy to read out or type: three groups of four, without look-alike characters. */
export function temporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`
}
