// "people" edge function: lets an admin add people, reset their temporary password, or remove them.
// Runs on Supabase with the service role key it is given automatically; the key never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseIdentity, temporaryPassword } from '../_shared/identity.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // Who is calling, and are they an admin?
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller?.user) return reply(401, { error: 'Signed out · sign in again' })
  const { data: me } = await admin.from('people').select('id,is_admin').eq('id', caller.user.id).maybeSingle()
  if (!me?.is_admin) return reply(403, { error: 'Admins only' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Unreadable request' })
  }

  if (body.action === 'add') {
    const identity = parseIdentity(String(body.signInAs ?? ''))
    if (!identity) return reply(400, { error: 'Email, phone (8+ digits) or name (2+ letters)' })
    const displayName = String(body.displayName ?? '').trim() || String(body.signInAs ?? '').trim()
    const { data: taken } = await admin.from('people').select('id').eq('sign_in_as', identity.signInAs).maybeSingle()
    if (taken) return reply(409, { error: `Already added · ${identity.signInAs}` })

    const password = temporaryPassword()
    const { data: created, error } = await admin.auth.admin.createUser({
      email: identity.authEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (error || !created?.user) return reply(400, { error: `Not added · ${error?.message ?? 'unknown error'}` })

    const { error: insertError } = await admin.from('people').insert({
      id: created.user.id,
      sign_in_as: identity.signInAs,
      kind: identity.kind,
      display_name: displayName.slice(0, 100),
      is_admin: body.isAdmin === true,
      must_change_password: true,
      added_by: me.id,
    })
    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return reply(400, { error: `Not added · ${insertError.message}` })
    }
    return reply(200, { id: created.user.id, signInAs: identity.signInAs, kind: identity.kind, temporaryPassword: password })
  }

  if (body.action === 'reset') {
    const id = String(body.id ?? '')
    const { data: person } = await admin.from('people').select('id,sign_in_as').eq('id', id).maybeSingle()
    if (!person) return reply(404, { error: 'Person not found' })
    const password = temporaryPassword()
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return reply(400, { error: `Not reset · ${error.message}` })
    await admin.from('people').update({ must_change_password: true }).eq('id', id)
    return reply(200, { id, signInAs: person.sign_in_as, temporaryPassword: password })
  }

  if (body.action === 'remove') {
    const id = String(body.id ?? '')
    if (id === me.id) return reply(400, { error: 'Cannot remove yourself' })
    const { data: person } = await admin.from('people').select('id').eq('id', id).maybeSingle()
    if (!person) return reply(404, { error: 'Person not found' })
    // Removing the sign-in also removes their row in people and their scenarios.
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return reply(400, { error: `Not removed · ${error.message}` })
    return reply(200, { id })
  }

  return reply(400, { error: 'Unknown action' })
})
