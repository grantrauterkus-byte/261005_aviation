import { useState } from 'react'
import type { Changes, JetResult } from '../engine/index.ts'
import { money, moneyRange, num } from '../lib/format.ts'
import { SCORECARD } from './scorecard.ts'

interface Props {
  rank: number
  result: JetResult
  changes: Changes
  setChange: (id: string, value: string | null) => void
  openLibrary: (o: { focus?: string; jet?: string }) => void
}

const PARTS = [
  { key: 'valueLost', label: 'Value lost', className: 'seg-value' },
  { key: 'pilotsAndOther', label: 'Pilots and other yearly costs', className: 'seg-pilots' },
  { key: 'fuel', label: 'Fuel', className: 'seg-fuel' },
  { key: 'maintenance', label: 'Maintenance', className: 'seg-maint' },
] as const

function Breakdown({ result, openLibrary }: { result: JetResult; openLibrary: Props['openLibrary'] }) {
  const b = result.breakdown
  const costs = b.valueLost + b.pilotsAndOther + b.fuel + b.maintenance
  const pct = (n: number) => `${(100 * Math.max(0, n)) / Math.max(1, costs)}%`
  const d = result.biggestDriver
  return (
    <div className="drivers">
      <h4>What drives this cost</h4>
      <div className="bar" role="img" aria-label={`5-year costs: ${PARTS.map((p) => `${p.label} ${money(b[p.key])}`).join(', ')}`}>
        {PARTS.map((p) => (
          <span key={p.key} className={`seg ${p.className}`} style={{ width: pct(b[p.key]) }} title={`${p.label}: ${money(b[p.key])}`} />
        ))}
      </div>
      {b.charterIncome > 0 && (
        <div className="bar income-bar" aria-hidden="true">
          <span className="seg seg-income" style={{ width: pct(b.charterIncome) }} title={`Charter income: −${money(b.charterIncome)}`} />
        </div>
      )}
      <ul className="legend">
        {PARTS.map((p) => (
          <li key={p.key}>
            <span className={`swatch ${p.className}`} />
            {p.label} <strong>{money(b[p.key])}</strong>
          </li>
        ))}
        {b.charterIncome > 0 && (
          <li>
            <span className="swatch seg-income" />
            Charter income <strong>−{money(b.charterIncome)}</strong>
          </li>
        )}
      </ul>
      {d && (
        <p className="driver-line">
          <button type="button" className="link" onClick={() => openLibrary({ focus: d.assumptionId })}>
            {d.item}
          </button>{' '}
          moves this jet's 5-year total the most: {moneyRange(d.totalAtLow, d.totalAtHigh)} between its low and high values.
        </p>
      )}
    </div>
  )
}

function PriceEditor({ result, changes, setChange }: Pick<Props, 'result' | 'changes' | 'setChange'>) {
  const id = result.sourceIds.purchase_price
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const changed = changes[id] !== undefined
  if (!open) {
    return (
      <span className="price-actions">
        <button
          type="button"
          className="link small"
          onClick={() => {
            setText(String(result.specs.purchasePrice))
            setOpen(true)
          }}
        >
          Edit price
        </button>
        {changed && (
          <button type="button" className="link small" onClick={() => setChange(id, null)}>
            Revert
          </button>
        )}
      </span>
    )
  }
  const commit = () => {
    const n = Number(text.replace(/[$,\s]/g, ''))
    if (Number.isFinite(n) && n > 0) setChange(id, String(Math.round(n)))
    setOpen(false)
  }
  return (
    <span className="price-edit">
      <label className="sr-only" htmlFor={`price-${result.jet.id}`}>
        Purchase price for {result.jet.name}, in dollars
      </label>
      <input
        id={`price-${result.jet.id}`}
        inputMode="numeric"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      <button type="button" className="small" onClick={commit}>
        Use
      </button>
      <button type="button" className="link small" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </span>
  )
}

export function JetCard({ rank, result, changes, setChange, openLibrary }: Props) {
  const t = result.typical
  const changedHere = result.usedAssumptions.filter((id) => changes[id] !== undefined).length
  return (
    <article className="card">
      <header className="card-head">
        <div className="card-title">
          <span className="rank">{rank}</span>
          <h3>{result.jet.name}</h3>
          <span className="class-tag">{result.jet.class}</span>
        </div>
        <p className="based-on">Based on {result.jet.most_sold_build_years} aircraft, the most commonly sold build years.</p>
      </header>

      <dl className="scorecard">
        {SCORECARD.map((row) => {
          const source = row.source(result)
          const detail = row.detail?.(result)
          const open = () => (source ? openLibrary({ focus: source }) : openLibrary({ jet: result.jet.id }))
          const changed = source ? changes[source] !== undefined : false
          return (
            <div key={row.key} className={`score-row row-${row.key}`}>
              <dt>{row.label}</dt>
              <dd>
                <button
                  type="button"
                  className={`value ${changed ? 'changed' : ''}`}
                  onClick={open}
                  title={source ? 'Open this value in the Assumptions Library' : 'Open the values behind this number in the Assumptions Library'}
                >
                  {row.value(result)}
                </button>
                {row.key === 'price' && <PriceEditor result={result} changes={changes} setChange={setChange} />}
                {detail && <span className="detail">{detail}</span>}
              </dd>
            </div>
          )
        })}
      </dl>

      {t.charterLimited && (
        <p className="notice small">
          Limited to {num(t.charterHours)} charter hours by availability. You asked for {num(t.charterHoursRequested)}.
        </p>
      )}
      <Breakdown result={result} openLibrary={openLibrary} />
      <p className="card-foot">
        <span>
          {num(t.ownerHours, 1)} hours with you onboard, {num(t.emptyHours, 1)} empty, {num(t.charterHours)} chartered out a year. {t.pilots} pilots.
        </span>
        {changedHere > 0 && <span className="changed-note"> Uses {changedHere} value{changedHere > 1 ? 's' : ''} you changed.</span>}
      </p>
    </article>
  )
}

export function NotFittingCard({ result, openLibrary }: { result: JetResult; openLibrary: Props['openLibrary'] }) {
  return (
    <article className="card greyed">
      <header className="card-head">
        <div className="card-title">
          <h3>{result.jet.name}</h3>
          <span className="class-tag">{result.jet.class}</span>
        </div>
      </header>
      <ul className="reasons">
        {result.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <button type="button" className="link small" onClick={() => openLibrary({ jet: result.jet.id })}>
        See this jet's values in the Assumptions Library
      </button>
    </article>
  )
}
