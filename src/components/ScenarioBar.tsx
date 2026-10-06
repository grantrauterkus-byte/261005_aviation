import { useState } from 'react'

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error'

interface Props {
  name: string
  id: string | null
  save: SaveState
  onRename: (name: string) => void
  onNew: () => void
  onCopy: () => void
}

export function ScenarioBar({ name, id, save, onRename, onNew, onCopy }: Props) {
  const [copied, setCopied] = useState(false)
  const link = id ? `${window.location.origin}/s/${id}` : null

  const status =
    save === 'saving'
      ? 'Saving…'
      : save === 'error'
        ? 'Could not save. Changes will be retried with your next edit.'
        : id
          ? save === 'saved'
            ? 'Saved. Anyone with the link can open and change it.'
            : 'Saving…'
          : 'Demo scenario. Your first change saves it under its own link.'

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
        <p className={`save-status ${save}`} role="status">
          {status}
        </p>
        <div className="scenario-actions">
          <button type="button" onClick={copyLink} disabled={!link} title={link ?? 'Make a change first to save this scenario'}>
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
