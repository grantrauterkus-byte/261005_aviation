import { describe, expect, it } from 'vitest'
import { parseIdentity, temporaryPassword } from '../../supabase/functions/_shared/identity.ts'

describe('signing in with an email, phone number or name', () => {
  it('uses an email as it is, in lower case', () => {
    expect(parseIdentity('  Grant.Rauterkus@Gmail.com ')).toEqual({ kind: 'Email', signInAs: 'grant.rauterkus@gmail.com', authEmail: 'grant.rauterkus@gmail.com' })
  })

  it('treats the same phone number typed different ways as one login, adding the US country code to 10 digits', () => {
    const a = parseIdentity('(212) 555-0100')
    expect(a).toEqual({ kind: 'Phone', signInAs: '+12125550100', authEmail: 'phone-12125550100@people.invalid' })
    expect(parseIdentity('212.555.0100')).toEqual(a)
    expect(parseIdentity('+1 212 555 0100')).toEqual(a)
    expect(parseIdentity('+44 20 7946 0958')?.signInAs).toBe('+442079460958')
  })

  it('treats a name the same whatever the capitals or spacing', () => {
    const a = parseIdentity('Pat  Lee')
    expect(a).toEqual({ kind: 'Name', signInAs: 'pat lee', authEmail: 'name-pat-lee@people.invalid' })
    expect(parseIdentity(' pat lee ')).toEqual(a)
    expect(parseIdentity('José Núñez')?.authEmail).toBe('name-jose-nunez@people.invalid')
  })

  it('rejects things that cannot be a login', () => {
    expect(parseIdentity('')).toBeNull()
    expect(parseIdentity('x')).toBeNull()
    expect(parseIdentity('12345')).toBeNull()
    expect(parseIdentity('not an email@')).toBeNull()
  })

  it('makes readable temporary passwords that differ each time', () => {
    const a = temporaryPassword()
    expect(a).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/)
    expect(a).not.toMatch(/[01OoIil]/)
    expect(temporaryPassword()).not.toBe(a)
  })
})
