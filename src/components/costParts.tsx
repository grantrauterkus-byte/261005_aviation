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

export interface NetScale {
  max: number // dollars at the right end of the axis
  ticks: number[]
}

/** One x axis for every card: from $0 to a round number of millions above the largest 5-year total. */
export function makeNetScale(results: JetResult[]): NetScale {
  const top = Math.max(1e6, ...results.map((r) => r.fiveYearTotal.typical))
  const step = top > 16e6 ? 4e6 : top > 8e6 ? 2e6 : 1e6
  const max = Math.ceil(top / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= max + 1; v += step) ticks.push(v)
  return { max, ticks }
}

const millions = (n: number) => `$${(n / 1e6).toFixed(2)} million`

/** The 5-year total as one plain bar from zero, with its value at the end and a labeled axis below. */
export function NetBar({ r, scale }: { r: JetResult; scale: NetScale }) {
  const total = Math.max(0, r.fiveYearTotal.typical)
  const pct = (v: number) => `${(100 * v) / scale.max}%`
  return (
    <span className="net">
      <span className="net-plot">
        <span className="net-bar" style={{ width: pct(total) }} />
        <span className="net-value">{millions(total)}</span>
      </span>
      <span className="net-axis" aria-hidden="true">
        {scale.ticks.map((t) => (
          <span key={t} className="net-tick" style={{ left: pct(t) }}>
            {t / 1e6}
          </span>
        ))}
      </span>
      <span className="net-unit">5-year total, $ million</span>
    </span>
  )
}
