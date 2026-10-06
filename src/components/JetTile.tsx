import type { JetResult } from '../engine/index.ts'
import { COLUMN, failingColumns, toneFor, type ColumnKey } from './columns.ts'
import { Chip } from './Chip.tsx'
import { CertaintyDots, RangeBar, type ConfidenceOf, type Scale } from './Certainty.tsx'

const TILE_CHIPS: ColumnKey[] = ['nonstop', 'seats', 'bags', 'cabinHeight', 'standUp', 'speed']

interface Props {
  rank: number | null
  result: JetResult
  position: Partial<Record<ColumnKey, number>>
  scale: Scale
  confidenceOf: ConfidenceOf
  onOpen: () => void
}

/** One short row per plane, after the tow CRM's tiles: class stripe, name, three numbers, labeled chips. Click opens the full view. */
export function JetTile({ rank, result: r, position, scale, confidenceOf, onOpen }: Props) {
  const failing = failingColumns(r)
  // A failing value already shows as a red chip with its need, so its plain chip is left out.
  const chips = TILE_CHIPS.filter((k) => !failing.has(k))
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
        <RangeBar range={r.fiveYearTotal} scale={scale} />
        <span className="chips">
          {r.reasons.map((x) => (
            <Chip key={`${x.key}-${x.label}`} label={x.label} value={x.value} tone="fail" certainty={confidenceOf(x.assumptionId)} />
          ))}
          {chips.map((k) => {
            const c = COLUMN[k]
            const tone = k === 'nonstop' ? (r.tripsNonstop === r.tripsTotal ? 'good' : 'low') : toneFor(c, position[k], false, r)
            return <Chip key={k} label={c.label} value={c.chip(r)} tone={tone} certainty={confidenceOf(c.source(r))} />
          })}
          {t.fuelStopsPerYear > 0 && <Chip label="Fuel stops a year" value={String(t.fuelStopsPerYear)} tone="low" />}
          {t.charterLimited && <Chip label="Charter capped" value={`${t.charterHours} hours`} tone="low" />}
        </span>
      </span>
    </button>
  )
}
