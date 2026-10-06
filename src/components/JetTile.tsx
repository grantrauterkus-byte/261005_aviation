import type { JetResult } from '../engine/index.ts'
import { COLUMN, failingColumns, toneFor, type ColumnKey } from './columns.ts'
import { Chip } from './Chip.tsx'
import { CertaintyDots, type ConfidenceOf } from './Certainty.tsx'
import { CostBar } from './costParts.tsx'

/** The same six columns, in the same place, on every tile. */
const TILE_COLUMNS: ColumnKey[] = ['nonstop', 'range', 'seats', 'bags', 'cabinHeight', 'speed']
const SHORT_VALUE: Partial<Record<ColumnKey, (r: JetResult) => string>> = {
  range: (r) => `${r.specs.rangeNm.toLocaleString('en-US')} nautical miles`,
}

interface Props {
  rank: number | null
  result: JetResult
  position: Partial<Record<ColumnKey, number>>
  confidenceOf: ConfidenceOf
  costScale: number
  onOpen: () => void
}

/** One row per plane: class stripe, name, three figures, a cost bar to scale, and six fixed columns. Click opens the full view. */
export function JetTile({ rank, result: r, position, confidenceOf, costScale, onOpen }: Props) {
  const failing = failingColumns(r)
  // Seats and bag space show their need in the column itself, for example "7 · need 8".
  const reasonFor = (k: ColumnKey) => r.reasons.find((x) => (x.key === 'seats' && k === 'seats') || (x.key === 'bags' && k === 'bags'))
  // Reasons that have no column of their own (runway, must-haves) show as red chips below the columns.
  const otherReasons = r.reasons.filter((x) => !['seats', 'bags', 'fuelStops'].includes(x.key))
  const t = r.typical
  return (
    <button type="button" className={`tile ${r.fits ? '' : 'greyed'}`} onClick={onOpen}>
      <span className={`tile-band ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`} aria-hidden="true" />
      <span className="tile-main">
        <span className="tile-row">
          <span className="tile-top">
            {rank != null && <span className="rank">{rank}</span>}
            <span className="tile-name">{r.jet.name}</span>
            <span className={`class-tag ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`}>{r.jet.class}</span>
            <span className="tile-sub">{r.jet.most_sold_build_years}</span>
          </span>
          <span className="tile-figures">
            <span className="fig">
              <span className="fig-k">5-year total</span>
              <span className="fig-v big">{COLUMN.total.chip(r)}</span>
            </span>
            <span className="fig">
              <span className="fig-k">Per hour</span>
              <span className="fig-v">{COLUMN.perHour.chip(r)}</span>
            </span>
            <span className="fig">
              <span className="fig-k">Price</span>
              <span className="fig-v">
                {COLUMN.price.chip(r)}
                <CertaintyDots level={confidenceOf(COLUMN.price.source(r))} />
              </span>
            </span>
          </span>
        </span>

        <CostBar r={r} max={costScale} />

        <span className="tile-cols">
          {TILE_COLUMNS.map((k) => {
            const c = COLUMN[k]
            const reason = reasonFor(k)
            const tone = failing.has(k) ? 'fail' : k === 'nonstop' ? (r.tripsNonstop === r.tripsTotal ? 'good' : 'low') : toneFor(c, position[k], false, r)
            return (
              <span key={k} className={`tile-col tone-${tone}`}>
                <span className="tile-col-k">{c.label}</span>
                <span className="tile-col-v">
                  {reason ? reason.value : (SHORT_VALUE[k]?.(r) ?? c.chip(r))}
                  <CertaintyDots level={confidenceOf(c.source(r))} />
                </span>
              </span>
            )
          })}
        </span>

        {(otherReasons.length > 0 || t.charterLimited) && (
          <span className="chips">
            {otherReasons.map((x) => (
              <Chip key={`${x.key}-${x.label}`} label={x.label} value={x.value} tone="fail" certainty={confidenceOf(x.assumptionId)} />
            ))}
            {t.charterLimited && <Chip label="Charter capped" value={`${t.charterHours} hours`} tone="low" />}
          </span>
        )}
      </span>
    </button>
  )
}
