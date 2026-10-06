import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { changePassword, fetchMe, MIN_PASSWORD_LENGTH, signIn, signOut, type Me } from '../lib/auth.ts'
import { supabase, supabaseConfigured } from '../lib/supabase.ts'

/** Shows the sign-in screen until an invited person is signed in with their own password. */
export function AuthGate({ children }: { children: (me: Me) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [me, setMe] = useState<Me | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setMe(undefined)
      return
    }
    setMe(undefined)
    fetchMe(userId)
      .then(setMe)
      .catch(() => setMe(null))
  }, [userId])

  if (!supabaseConfigured) return <Centered title="Jet Ownership Finder">Database not connected</Centered>
  if (session === undefined || (session && me === undefined)) return <Centered title="Jet Ownership Finder">Loading…</Centered>
  if (!session) return <SignIn />
  if (!me)
    return (
      <Centered title="No access yet">
        <p>No access for this sign-in</p>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </Centered>
    )
  if (me.must_change_password) return <ChangePassword me={me} onDone={() => setMe({ ...me, must_change_password: false })} />
  return <>{children(me)}</>
}

function Centered({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  )
}

function SignIn() {
  const [who, setWho] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Centered title="Jet Ownership Finder">

      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(await signIn(who, password))
          setBusy(false)
        }}
      >
        <label className="field">
          <span className="label">Email, phone number or name</span>
          <input autoComplete="username" value={who} onChange={(e) => setWho(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="hint">Invitation only · lost password: ask your admin</p>
    </Centered>
  )
}

function ChangePassword({ me, onDone }: { me: Me; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Centered title={`Welcome, ${me.display_name}`}>
      <p className="muted">Temporary password · choose your own</p>
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (password.length < MIN_PASSWORD_LENGTH) return setError(`At least ${MIN_PASSWORD_LENGTH} characters`)
          if (password !== again) return setError('Passwords differ')
          setBusy(true)
          const err = await changePassword(password)
          setBusy(false)
          if (err) return setError(err)
          onDone()
        }}
      >
        <input type="text" autoComplete="username" value={me.sign_in_as} readOnly hidden />
        <label className="field">
          <span className="label">New password (at least {MIN_PASSWORD_LENGTH} characters)</span>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">New password again</span>
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save password and continue'}
        </button>
      </form>
      <button type="button" className="link small" onClick={signOut}>
        Sign out
      </button>
    </Centered>
  )
}
