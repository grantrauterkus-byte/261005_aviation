import { useState } from 'react'
import type { ScenarioSummary } from '../lib/data.ts'

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error'

interface Props {
  name: string
  id: string | null
  save: SaveState
  onRename: (name: string) => void
  onNew: () => void
  onCopy: () => void
  scenarios: ScenarioSummary[]
  onOpen: (id: string) => void
}

export function ScenarioBar({ name, id, save, onRename, onNew, onCopy, scenarios, onOpen }: Props) {
  const [copied, setCopied] = useState(false)
  const link = id ? `${window.location.origin}/s/${id}` : null

  const status = save === 'error' ? 'Not saved · retries on next change' : id ? (save === 'saved' ? 'Saved · private' : 'Saving…') : 'Demo · saves on first change'

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', link)
    }
  }

  return (
    <section className="scenario-bar" aria-label="Scenario">
      <div className="scenario-inner">
        <label className="scenario-name">
          <span className="label">Scenario</span>
          <input value={name} maxLength={200} onChange={(e) => onRename(e.target.value)} />
        </label>
        {scenarios.length > 0 && (
          <label className="my-scenarios">
            <span className="label">My scenarios</span>
            <select value={id ?? ''} onChange={(e) => e.target.value && onOpen(e.target.value)}>
              {!id && <option value="">Choose a saved scenario</option>}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className={`save-status ${save}`} role="status">
          {status}
        </p>
        <div className="scenario-actions">
          <button type="button" onClick={copyLink} disabled={!link} title={link ? 'Link for your other devices' : 'Saves on first change'}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={onCopy}>
            Copy scenario
          </button>
          <button type="button" onClick={onNew}>
            New scenario
          </button>
        </div>
      </div>
    </section>
  )
}
