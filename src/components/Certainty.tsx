import type { AssumptionRow, Changes, JetResult, Range } from '../engine/index.ts'
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

export interface Scale {
  min: number
  max: number
  ticks: number[]
}

/** A dollar scale shared by every tile, in whole millions. */
export function makeScale(results: JetResult[]): Scale {
  const lows = results.map((r) => Math.min(r.fiveYearTotal.low, r.fiveYearTotal.typical))
  const highs = results.map((r) => Math.max(r.fiveYearTotal.high, r.fiveYearTotal.typical))
  const min = Math.floor(Math.min(...lows) / 1e6) * 1e6
  const max = Math.ceil(Math.max(...highs) / 1e6) * 1e6
  const span = Math.max(1e6, max - min)
  const step = span > 16e6 ? 4e6 : span > 8e6 ? 2e6 : 1e6
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v)
  return { min, max: min + span, ticks }
}

const at = (s: Scale, v: number) => `${((v - s.min) / (s.max - s.min)) * 100}%`

/** The 5-year total's low-to-high range on the shared scale, with a tick at the typical value. */
export function RangeBar({ range, scale }: { range: Range; scale: Scale }) {
  const lo = Math.min(range.low, range.high)
  const hi = Math.max(range.low, range.high)
  return (
    <span className="range-track" aria-hidden="true">
      {scale.ticks.map((t) => (
        <span key={t} className="range-grid" style={{ left: at(scale, t) }} />
      ))}
      <span className="range-span" style={{ left: at(scale, lo), width: `calc(${at(scale, hi)} - ${at(scale, lo)})` }} />
      <span className="range-typical" style={{ left: at(scale, range.typical) }} />
    </span>
  )
}

/** Scale labels shown once above the tiles, lined up with every tile's range bar. */
export function RangeAxis({ scale }: { scale: Scale }) {
  return (
    <div className="range-axis">
      <span className="range-axis-label">5-year total, low to high · $ million</span>
      <span className="range-axis-track">
        {scale.ticks.map((t) => (
          <span key={t} className="range-axis-tick" style={{ left: at(scale, t) }}>
            {t / 1e6}
          </span>
        ))}
      </span>
    </div>
  )
}

/** Key for the certainty marks, the matrix hatch and the range bar. */
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
