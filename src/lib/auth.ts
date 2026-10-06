import { parseIdentity } from '../../supabase/functions/_shared/identity.ts'
import { supabase } from './supabase.ts'

export interface Me {
  id: string
  sign_in_as: string
  kind: 'Email' | 'Phone' | 'Name'
  display_name: string
  is_admin: boolean
  must_change_password: boolean
}

export interface Person extends Me {
  created_at: string
}

export const MIN_PASSWORD_LENGTH = 10

export async function signIn(signInAs: string, password: string): Promise<string | null> {
  const identity = parseIdentity(signInAs)
  if (!identity) return 'Type the email, phone number or name you were given.'
  const { error } = await supabase.auth.signInWithPassword({ email: identity.authEmail, password })
  if (error) return error.message === 'Invalid login credentials' ? 'That sign-in or password is not right.' : error.message
  return null
}

export async function signOut() {
  await supabase.auth.signOut()
}

/** The signed-in person's row in people, or null if they have not been added. */
export async function fetchMe(userId: string): Promise<Me | null> {
  const { data, error } = await supabase
    .from('people')
    .select('id,sign_in_as,kind,display_name,is_admin,must_change_password')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Me | null
}

export async function changePassword(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return error.message
  const { error: markError } = await supabase.rpc('mark_password_changed')
  return markError ? markError.message : null
}

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('id,sign_in_as,kind,display_name,is_admin,must_change_password,created_at')
    .order('created_at')
  if (error) throw error
  return data as Person[]
}

type PeopleRequest = { action: 'add'; signInAs: string; displayName: string; isAdmin: boolean } | { action: 'reset'; id: string } | { action: 'remove'; id: string }

export interface PeopleReply {
  id?: string
  signInAs?: string
  temporaryPassword?: string
  error?: string
}

/** Calls the "people" edge function, which checks that the caller is an admin. */
export async function managePeople(request: PeopleRequest): Promise<PeopleReply> {
  const { data, error } = await supabase.functions.invoke('people', { body: request })
  if (error) {
    // The function replies with { error } and a non-success status; read the message from the response.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json()
        if (body?.error) return { error: body.error }
      } catch {
        /* fall through */
      }
    }
    return { error: error.message }
  }
  return data as PeopleReply
}
