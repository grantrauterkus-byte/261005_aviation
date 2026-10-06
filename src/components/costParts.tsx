import type { JetResult } from '../engine/index.ts'

/** The cost parts in the order and colors every bar uses. */
export const PARTS = [
  { key: 'valueLost', label: 'Value lost', cls: 'seg-value' },
  { key: 'crew', label: 'Crew', cls: 'seg-crew' },
  { key: 'fixed', label: 'Fixed costs', cls: 'seg-fixed' },
  { key: 'fuel', label: 'Fuel', cls: 'seg-fuel' },
  { key: 'maintenance', label: 'Maintenance', cls: 'seg-maint' },
  { key: 'tripFees', label: 'Trip fees', cls: 'seg-trip' },
] as const

export const grossCost = (r: JetResult) => PARTS.reduce((s, p) => s + Math.max(0, r.breakdown[p.key]), 0)

/**
 * One bar per plane on a shared dollar scale: its length is the plane's 5-year costs split into parts.
 * Charter income is laid over the end of the bar as a hatched section, so the solid part is the 5-year total.
 */
export function CostBar({ r, max }: { r: JetResult; max: number }) {
  const b = r.breakdown
  const pct = (n: number) => `${(100 * Math.max(0, n)) / Math.max(1, max)}%`
  const income = Math.min(b.charterIncome, grossCost(r))
  return (
    <span className="cost-bar" role="img" aria-label={`5-year costs: ${PARTS.map((p) => `${p.label} ${Math.round(b[p.key] / 1e5) / 10} million`).join(', ')}${income > 0 ? `, charter income minus ${Math.round(income / 1e5) / 10} million` : ''}`}>
      <span className="cost-bar-fill" style={{ width: pct(grossCost(r)) }}>
        {PARTS.map((p) => (
          <span key={p.key} className={`seg ${p.cls}`} style={{ flexGrow: Math.max(0, b[p.key]) }} />
        ))}
        {income > 0 && <span className="cost-bar-income" style={{ width: `${(100 * income) / grossCost(r)}%` }} />}
      </span>
    </span>
  )
}

/** Color key for the cost bars, shown once above the tiles. */
export function CostKey({ withIncome }: { withIncome: boolean }) {
  return (
    <div className="cost-key" aria-label="Cost bar key">
      <span className="cost-key-title">5-year costs, to scale</span>
      {PARTS.map((p) => (
        <span key={p.key}>
          <i className={p.cls} /> {p.label}
        </span>
      ))}
      {withIncome && (
        <span>
          <i className="cost-key-income" /> Charter income
        </span>
      )}
    </div>
  )
}
