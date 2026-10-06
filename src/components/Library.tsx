import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssumptionRow, Changes, Jet, Results } from '../engine/index.ts'
import { rawValue } from '../lib/format.ts'

interface Props {
  rows: AssumptionRow[]
  jets: Jet[]
  changes: Changes
  setChange: (id: string, value: string | null) => void
  resetAll: () => void
  results: Results | null
}

const APPLIES = ['Plane-specific', 'Class-wide', 'Same for all']
const TYPES = ['Measured', 'Published', 'Our assumption']
const CONFIDENCE = ['High', 'Medium', 'Low']

function isYesNo(r: AssumptionRow) {
  return r.unit === 'yes/no'
}

function validate(r: AssumptionRow, text: string): string | null {
  const t = text.trim()
  if (isYesNo(r)) return /^(yes|no)$/i.test(t) ? null : 'Type Yes or No'
  const n = Number(t.replace(/[$,\s%]/g, ''))
  if (!Number.isFinite(n)) return 'Type a number'
  if (n < 0) return 'Must be 0 or more'
  return null
}

function clean(r: AssumptionRow, text: string) {
  const t = text.trim()
  if (isYesNo(r)) return t.toLowerCase() === 'yes' ? 'Yes' : 'No'
  return String(Number(t.replace(/[$,\s%]/g, '')))
}

function YourValue({ row, change, setChange }: { row: AssumptionRow; change: string | undefined; setChange: Props['setChange'] }) {
  const [text, setText] = useState(change ?? '')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setText(change ?? ''), [change])
  const commit = () => {
    if (text.trim() === '') {
      setError(null)
      if (change !== undefined) setChange(row.id, null)
      return
    }
    const e = validate(row, text)
    setError(e)
    if (e) return
    const v = clean(row, text)
    if (v === row.value) {
      setChange(row.id, null)
      setText('')
    } else setChange(row.id, v)
  }
  return (
    <div className="your-value">
      <input
        aria-label={`Your value for ${row.item}, ${row.jet}`}
        value={text}
        placeholder={isYesNo(row) ? 'Yes or No' : 'Type a value'}
        inputMode={isYesNo(row) ? 'text' : 'decimal'}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        className={error ? 'invalid' : ''}
      />
      {error && <span className="error-text">{error}</span>}
      {change !== undefined && (
        <button type="button" className="link small" onClick={() => setChange(row.id, null)}>
          Revert
        </button>
      )}
    </div>
  )
}

export function Library({ rows, jets, changes, setChange, resetAll, results }: Props) {
  const [params, setParams] = useSearchParams()
  const focus = params.get('focus')
  const usedByJet = params.get('jet')
  const [search, setSearch] = useState('')
  const [jet, setJet] = useState('')
  const [applies, setApplies] = useState('')
  const [type, setType] = useState('')
  const [confidence, setConfidence] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const focusRef = useRef<HTMLTableRowElement>(null)

  const usedBy = useMemo(() => {
    if (!usedByJet || !results) return null
    const r = [...results.fitting, ...results.notFitting].find((x) => x.jet.id === usedByJet)
    return r ? { name: r.jet.name, ids: new Set(r.usedAssumptions) } : null
  }, [usedByJet, results])

  useEffect(() => {
    if (focus && focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'center' })
      focusRef.current.querySelector('input')?.focus({ preventScroll: true })
    }
  }, [focus])

  const changedCount = Object.keys(changes).length
  const q = search.trim().toLowerCase()
  const visible = rows.filter((r) => {
    if (focus) return r.id === focus
    if (usedBy && !usedBy.ids.has(r.id)) return false
    if (jet && r.jet !== jet) return false
    if (applies && r.applies_to !== applies) return false
    if (type && r.type !== type) return false
    if (confidence && r.confidence !== confidence) return false
    if (onlyChanged && changes[r.id] === undefined) return false
    if (q && !`${r.item} ${r.jet} ${r.notes ?? ''} ${r.source_name ?? ''} ${r.unit}`.toLowerCase().includes(q)) return false
    return true
  })

  const clearParams = () => setParams({}, { replace: true })
  const jetOptions = ['All jets', 'Midsize', 'Super-midsize', ...jets.map((j) => j.name)]

  return (
    <div className="library">
      <div className="library-head">
        <div>
          <h1>Assumptions Library</h1>
          <p className="muted">Your value · replaces value, low and high</p>
        </div>
        <button type="button" onClick={resetAll} disabled={changedCount === 0}>
          Reset all{changedCount ? ` (${changedCount})` : ''}
        </button>
      </div>

      {(focus || usedBy) && (
        <p className="notice filter-note">
          {focus ? '1 value' : `${usedBy!.name} · ${usedBy!.ids.size} values`}{' '}
          <button type="button" className="link" onClick={clearParams}>
            Show all
          </button>
        </p>
      )}

      {!focus && (
        <div className="filters">
          <label className="field grow">
            <span className="label">Search</span>
            <input type="search" value={search} placeholder="For example: fuel, insurance, Challenger" onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Jet</span>
            <select value={jet} onChange={(e) => setJet(e.target.value)}>
              <option value="">Any</option>
              {jetOptions.map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Applies to</span>
            <select value={applies} onChange={(e) => setApplies(e.target.value)}>
              <option value="">Any</option>
              {APPLIES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any</option>
              {TYPES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Confidence</span>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="">Any</option>
              {CONFIDENCE.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> Only items I changed
          </label>
        </div>
      )}

      <p className="muted count">
        {visible.length} of {rows.length} values
      </p>

      <div className="table-wrap">
        <table className="lib-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Jet</th>
              <th>Applies to</th>
              <th className="num">Value</th>
              <th className="num">Low</th>
              <th className="num">High</th>
              <th>Unit</th>
              <th>Type</th>
              <th>Source</th>
              <th>Source date</th>
              <th>Confidence</th>
              <th>Notes</th>
              <th>Your value</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const changed = changes[r.id] !== undefined
              return (
                <tr key={r.id} ref={r.id === focus ? focusRef : undefined} className={`${changed ? 'changed' : ''} ${r.id === focus ? 'focused' : ''}`}>
                  <td className="item">
                    {r.item}
                    {changed && <span className="pill changed-pill">Changed</span>}
                  </td>
                  <td>{r.jet}</td>
                  <td>
                    <span className={`tag applies-${r.applies_to.replace(/\s+/g, '-').toLowerCase()}`}>{r.applies_to}</span>
                  </td>
                  <td className="num">{rawValue(r.value)}</td>
                  <td className="num">{rawValue(r.low)}</td>
                  <td className="num">{rawValue(r.high)}</td>
                  <td>{r.unit}</td>
                  <td>{r.type}</td>
                  <td className="source">
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                        {r.source_name ?? r.source_url}
                      </a>
                    ) : (
                      (r.source_name ?? 'Not found')
                    )}
                  </td>
                  <td className="nowrap">{r.source_date}</td>
                  <td>
                    <span className={`conf conf-${r.confidence.toLowerCase()}`}>{r.confidence}</span>
                  </td>
                  <td className="notes">
                    {r.notes && r.notes.length > 160 ? (
                      <details>
                        <summary>{r.notes.slice(0, 140)}…</summary>
                        {r.notes}
                      </details>
                    ) : (
                      r.notes
                    )}
                  </td>
                  <td>
                    <YourValue row={r} change={changes[r.id]} setChange={setChange} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
