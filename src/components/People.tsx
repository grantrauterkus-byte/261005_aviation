import { useEffect, useState } from 'react'
import { parseIdentity } from '../../supabase/functions/_shared/identity.ts'
import { listPeople, managePeople, type Me, type Person } from '../lib/auth.ts'

const KIND_LABEL = { Email: 'Email', Phone: 'Phone number', Name: 'Name' }

/** Admins add people here. Each new person gets a temporary password to pass on; they choose their own when they first sign in. */
export function People({ me }: { me: Me }) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signInAs, setSignInAs] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<{ signInAs: string; password: string; reset: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const reload = () =>
    listPeople()
      .then(setPeople)
      .catch((e) => setError(String(e?.message ?? e)))
  useEffect(() => {
    reload()
  }, [])

  const preview = signInAs.trim() ? parseIdentity(signInAs) : null

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await managePeople({ action: 'add', signInAs, displayName, isAdmin })
    setBusy(false)
    if (r.error || !r.temporaryPassword) return setError(r.error ?? 'Something went wrong.')
    setIssued({ signInAs: r.signInAs!, password: r.temporaryPassword, reset: false })
    setCopied(false)
    setSignInAs('')
    setDisplayName('')
    setIsAdmin(false)
    reload()
  }

  const reset = async (p: Person) => {
    if (!window.confirm(`Give ${p.display_name} a new temporary password? Their current password will stop working.`)) return
    setError(null)
    const r = await managePeople({ action: 'reset', id: p.id })
    if (r.error || !r.temporaryPassword) return setError(r.error ?? 'Something went wrong.')
    setIssued({ signInAs: r.signInAs!, password: r.temporaryPassword, reset: true })
    setCopied(false)
    reload()
  }

  const remove = async (p: Person) => {
    if (!window.confirm(`Remove ${p.display_name}? They will no longer be able to sign in, and their saved scenarios will be deleted.`)) return
    setError(null)
    const r = await managePeople({ action: 'remove', id: p.id })
    if (r.error) return setError(r.error)
    reload()
  }

  const copy = async () => {
    if (!issued) return
    const text = `Jet Ownership Finder: ${window.location.origin}\nSign in as: ${issued.signInAs}\nTemporary password: ${issued.password}\nYou'll choose your own password when you first sign in.`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      window.prompt('Copy this', text)
    }
  }

  return (
    <div className="people">
      <h1>People</h1>
      <p className="muted">
        Only the people listed here can sign in. Add someone by their email, phone number or name, then send them the temporary password yourself. They choose
        their own password the first time they sign in.
      </p>

      {issued && (
        <div className="issued" role="status">
          <p>
            <strong>{issued.reset ? 'New temporary password' : 'Added'}.</strong> Send these to the person. The password is shown only once.
          </p>
          <dl>
            <dt>Sign in as</dt>
            <dd>{issued.signInAs}</dd>
            <dt>Temporary password</dt>
            <dd className="password">{issued.password}</dd>
          </dl>
          <div className="issued-actions">
            <button type="button" onClick={copy}>
              {copied ? 'Copied' : 'Copy sign-in details'}
            </button>
            <button type="button" className="link" onClick={() => setIssued(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <form className="panel add-person" onSubmit={add}>
        <h2>Add a person</h2>
        <div className="add-grid">
          <label className="field">
            <span className="label">Signs in with: email, phone number or name</span>
            <input value={signInAs} onChange={(e) => setSignInAs(e.target.value)} placeholder="For example: pat@example.com, 212 555 0100 or Pat Lee" required />
            {preview && (
              <span className="hint">
                {KIND_LABEL[preview.kind]}: {preview.signInAs}
              </span>
            )}
            {signInAs.trim() && !preview && <span className="error-text">Type an email address, a phone number (at least 8 digits) or a name.</span>}
          </label>
          <label className="field">
            <span className="label">Name to show</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Pat Lee" maxLength={100} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} /> Can add and remove people
        </label>
        <button type="submit" className="primary" disabled={busy || !preview}>
          {busy ? 'Adding…' : 'Add person'}
        </button>
      </form>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="table-wrap">
        <table className="lib-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Signs in as</th>
              <th>Can add people</th>
              <th>Password</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people?.map((p) => (
              <tr key={p.id}>
                <td className="item">
                  {p.display_name}
                  {p.id === me.id && <span className="muted"> (you)</span>}
                </td>
                <td>
                  {p.sign_in_as} <span className="muted">({KIND_LABEL[p.kind]})</span>
                </td>
                <td>{p.is_admin ? 'Yes' : 'No'}</td>
                <td>{p.must_change_password ? 'Temporary, not yet changed' : 'Their own'}</td>
                <td className="nowrap">{new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td className="nowrap">
                  <button type="button" className="link small" onClick={() => reset(p)}>
                    New temporary password
                  </button>
                  {p.id !== me.id && (
                    <>
                      {' · '}
                      <button type="button" className="link small danger" onClick={() => remove(p)}>
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!people && !error && <p className="loading">Loading…</p>}
      </div>
    </div>
  )
}
