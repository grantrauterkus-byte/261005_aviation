/**
 * One-time script: adds a person who can sign in, with a temporary password they must change on first sign-in.
 * Used to add the first admin; after that, admins add people from the app's "People" screen.
 *
 * Run from the repo root:  npm run add-person -- [--admin] "<email, phone number or name>" "<name to show>"
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * With --admin, scenarios saved before sign-in existed (which have no owner) are given to this person.
 */
import { createClient } from '@supabase/supabase-js'
import { parseIdentity, temporaryPassword } from '../supabase/functions/_shared/identity.ts'

const args = process.argv.slice(2)
const isAdmin = args.includes('--admin')
const [signInAs, displayName] = args.filter((a) => a !== '--admin')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}
const identity = parseIdentity(signInAs ?? '')
if (!identity) {
  console.error('Usage: npm run add-person -- [--admin] "<email, phone number or name>" "<name to show>"')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const password = temporaryPassword()
const { data: created, error } = await db.auth.admin.createUser({
  email: identity.authEmail,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName ?? signInAs },
})
if (error || !created.user) {
  console.error(`Could not add ${identity.signInAs}: ${error?.message}`)
  process.exit(1)
}
const { error: insertError } = await db.from('people').insert({
  id: created.user.id,
  sign_in_as: identity.signInAs,
  kind: identity.kind,
  display_name: (displayName ?? signInAs).slice(0, 100),
  is_admin: isAdmin,
  must_change_password: true,
})
if (insertError) {
  await db.auth.admin.deleteUser(created.user.id)
  console.error(`Could not add ${identity.signInAs}: ${insertError.message}`)
  process.exit(1)
}
if (isAdmin) {
  const { data: claimed } = await db.from('scenarios').update({ owner_id: created.user.id }).is('owner_id', null).select('id')
  console.log(`Gave ${claimed?.length ?? 0} earlier scenarios to this person.`)
}
console.log(`Added ${identity.signInAs}${isAdmin ? ' as an admin' : ''}.`)
console.log(`Temporary password: ${password}`)
