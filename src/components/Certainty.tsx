import type { AssumptionRow, Changes, JetResult } from '../engine/index.ts'
import { confidenceShare } from './columns.ts'

export type Level = 'High' | 'Medium' | 'Low'

/** Confidence of the Library row behind a value; null for calculated values and values the user changed. */
export type ConfidenceOf = (assumptionId: string | null) => Level | null

export function makeConfidenceOf(rows: AssumptionRow[], changes: Changes): ConfidenceOf {
  const byId = new Map(rows.map((r) => [r.id, r.confidence]))
  return (id) => (id == null || changes[id] !== undefined ? null : (byId.get(id) ?? null))
}

const FILLED: Record<Level, number> = { High: 3, Medium: 2, Low: 1 }

/** Three dots: all filled for High, two for Medium, one for Low. */
export function CertaintyDots({ level }: { level: Level | null }) {
  if (!level) return null
  const n = FILLED[level]
  return (
    <span className={`certainty c-${level.toLowerCase()}`} role="img" aria-label={`Confidence ${level}`} title={`Confidence ${level}`}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  )
}

/** Share of a plane's values rated High, Medium and Low, as one stacked bar with the three numbers. */
export function ConfidenceBar({ r }: { r: JetResult }) {
  const s = confidenceShare(r)
  return (
    <span className="conf-bar" role="img" aria-label={`Confidence High ${s.high}%, Medium ${s.medium}%, Low ${s.low}%`} title={`High ${s.high}% · Medium ${s.medium}% · Low ${s.low}%`}>
      <span className="conf-track">
        <span className="seg-high" style={{ width: `${s.high}%` }} />
        <span className="seg-medium" style={{ width: `${s.medium}%` }} />
        <span className="seg-low" style={{ width: `${s.low}%` }} />
      </span>
      <span className="conf-nums">
        {s.high} · {s.medium} · {s.low}
      </span>
    </span>
  )
}

/** Key for the certainty marks and the matrix hatch. */
export function CertaintyKey() {
  return (
    <div className="tone-key certainty-key" aria-label="Confidence key">
      <span>
        <CertaintyDots level="High" /> High
      </span>
      <span>
        <CertaintyDots level="Medium" /> Medium
      </span>
      <span>
        <CertaintyDots level="Low" /> Low
      </span>
      <span>
        <i className="hatch-swatch" /> Low-confidence cell
      </span>
    </div>
  )
}
