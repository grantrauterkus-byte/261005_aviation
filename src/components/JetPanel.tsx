import { useEffect, useState } from 'react'
import type { Airport, AssumptionRow, Changes, JetResult } from '../engine/index.ts'
import { money, moneyRange, num, rawValue } from '../lib/format.ts'
import { Chip } from './Chip.tsx'
import { COLUMNS, failingColumns, toneFor, type ColumnKey } from './columns.ts'
import { CertaintyDots, ConfidenceBar, type ConfidenceOf } from './Certainty.tsx'
import { PARTS } from './costParts.tsx'

interface Props {
  result: JetResult
  position: Partial<Record<ColumnKey, number>>
  confidenceOf: ConfidenceOf
  rows: AssumptionRow[]
  changes: Changes
  airports: Map<string, Airport>
  setChange: (id: string, value: string | null) => void
  openLibrary: (o: { focus?: string; jet?: string }) => void
  onClose: () => void
}

const SPEC_GROUPS: { title: string; keys: ColumnKey[] }[] = [
  { title: 'Trips', keys: ['nonstop', 'stops', 'range'] },
  { title: 'Cabin', keys: ['seats', 'cabinHeight', 'cabinWidth', 'cabinLength', 'bags', 'standUp', 'flatFloor', 'lavatory'] },
  { title: 'Performance', keys: ['speed', 'takeoff'] },
]

function PriceEdit({ r, changes, setChange }: Pick<Props, 'changes' | 'setChange'> & { r: JetResult }) {
  const id = r.sourceIds.purchase_price
  const [text, setText] = useState<string | null>(null)
  if (text == null) {
    return (
      <span className="price-actions">
        <button type="button" className="link small" onClick={() => setText(String(r.specs.purchasePrice))}>
          Edit
        </button>
        {changes[id] !== undefined && (
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
    setText(null)
  }
  return (
    <span className="price-edit">
      <input aria-label={`Purchase price for ${r.jet.name}, dollars`} inputMode="numeric" value={text} autoFocus onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setText(null)
      }} />
      <button type="button" className="small" onClick={commit}>
        Use
      </button>
    </span>
  )
}

/** The expanded plane: every value, the cost parts, the flying, and the source of each number. */
export function JetPanel({ result: r, position, confidenceOf, rows, changes, airports, setChange, openLibrary, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const t = r.typical
  const b = r.breakdown
  const costs = PARTS.reduce((s, p) => s + b[p.key], 0)
  const failing = failingColumns(r)
  const used = new Set(r.usedAssumptions)
  const sources = rows.filter((row) => used.has(row.id))
  const code = (ident: string) => airports.get(ident)?.code ?? ident

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer right" role="dialog" aria-label={r.jet.name} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <span className={`tile-band ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`} aria-hidden="true" />
          <div>
            {r.jet.manufacturer && <span className="maker">{r.jet.manufacturer}</span>}
            <h2>{r.jet.name}</h2>
            <div className="drawer-sub">
              <span className={`class-tag ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`}>{r.jet.class}</span>
              <span>Build years {r.jet.most_sold_build_years}</span>
              {!r.fits && <span className="no-fit">Does not fit</span>}
            </div>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <div className="stats">
            <div className="stat">
              <span className="fig-k">5-year total</span>
              <span className="fig-v big">{money(r.fiveYearTotal.typical)}</span>
              <span className="fig-r">{moneyRange(r.fiveYearTotal.low, r.fiveYearTotal.high)}</span>
            </div>
            <div className="stat">
              <span className="fig-k">Yearly out of pocket</span>
              <span className="fig-v">{money(r.yearlyOutOfPocket.typical)}</span>
              <span className="fig-r">{moneyRange(r.yearlyOutOfPocket.low, r.yearlyOutOfPocket.high)}</span>
            </div>
            <div className="stat">
              <span className="fig-k">Per hour you fly</span>
              <span className="fig-v">{r.costPerHour.typical == null ? '–' : money(r.costPerHour.typical)}</span>
              <span className="fig-r">{moneyRange(r.costPerHour.low, r.costPerHour.high)}</span>
            </div>
            <div className="stat">
              <span className="fig-k">Purchase price</span>
              <span className="nowrap">
                <button type="button" className={`fig-v value ${changes[r.sourceIds.purchase_price] !== undefined ? 'changed' : ''}`} onClick={() => openLibrary({ focus: r.sourceIds.purchase_price })}>
                  {money(r.specs.purchasePrice)}
                </button>
                <CertaintyDots level={confidenceOf(r.sourceIds.purchase_price)} />
              </span>
              <PriceEdit r={r} changes={changes} setChange={setChange} />
            </div>
          </div>

          <div className="chips">
            {r.reasons.map((x) => (
              <Chip key={`${x.key}-${x.label}`} label={x.label} value={x.value} tone="fail" onClick={x.assumptionId ? () => openLibrary({ focus: x.assumptionId! }) : undefined} />
            ))}
            {r.biggestDriver && (
              <Chip label="Biggest swing" value={`${r.biggestDriver.item.replace(/ \(.*\)$/, '')} · ${money(r.biggestDriver.difference)}`} tone="low" onClick={() => openLibrary({ focus: r.biggestDriver!.assumptionId })} />
            )}
            {t.charterLimited && <Chip label="Charter capped" value={`${t.charterHours} of ${t.charterHoursRequested} hours`} tone="low" />}
          </div>
          <div className="panel-conf">
            <span className="fig-k">Values rated High · Medium · Low, %</span>
            <ConfidenceBar r={r} />
          </div>

          <section className="drawer-section">
            <h3>Cost parts · 5 years</h3>
            <div className="bar" aria-hidden="true">
              {PARTS.map((p) => (
                <span key={p.key} className={`seg ${p.cls}`} style={{ width: `${(100 * Math.max(0, b[p.key])) / Math.max(1, costs)}%` }} />
              ))}
            </div>
            <table className="kv">
              <tbody>
                {PARTS.map((p) => (
                  <tr key={p.key}>
                    <th>
                      <span className={`swatch ${p.cls}`} />
                      {p.label}
                    </th>
                    <td>{money(b[p.key])}</td>
                    <td className="muted">{Math.round((100 * b[p.key]) / Math.max(1, costs))}%</td>
                  </tr>
                ))}
                {b.charterIncome > 0 && (
                  <tr>
                    <th>
                      <span className="swatch seg-income" />
                      Charter income
                    </th>
                    <td>−{money(b.charterIncome)}</td>
                    <td />
                  </tr>
                )}
                <tr className="total-row">
                  <th>5-year total</th>
                  <td>{money(r.fiveYearTotal.typical)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </section>

          {SPEC_GROUPS.map((g) => (
            <section key={g.title} className="drawer-section">
              <h3>{g.title}</h3>
              <table className="kv">
                <tbody>
                  {g.keys.map((k) => {
                    const c = COLUMNS.find((x) => x.key === k)!
                    const src = c.source(r)
                    const tone = toneFor(c, position[k], failing.has(k))
                    return (
                      <tr key={k}>
                        <th>{c.label}</th>
                        <td>
                          <span className={`dot tone-${tone}`} aria-hidden="true" />
                          {src ? (
                            <button type="button" className="value" onClick={() => openLibrary({ focus: src })}>
                              {c.chip(r)}
                            </button>
                          ) : (
                            c.chip(r)
                          )}
                          <CertaintyDots level={confidenceOf(src)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          ))}

          <section className="drawer-section">
            <h3>Flying a year</h3>
            <table className="kv">
              <tbody>
                <tr>
                  <th>Hours with you onboard</th>
                  <td>{num(t.ownerHours, 1)}</td>
                </tr>
                <tr>
                  <th>Empty hours</th>
                  <td>{num(t.emptyHours, 1)}</td>
                </tr>
                <tr>
                  <th>Charter hours</th>
                  <td>{num(t.charterHours)}</td>
                </tr>
                <tr>
                  <th>Total hours</th>
                  <td>{num(t.totalHours, 1)}</td>
                </tr>
                <tr>
                  <th>Pilots</th>
                  <td>{t.pilots}</td>
                </tr>
                <tr>
                  <th>Landings</th>
                  <td>{num(t.landings)}</td>
                </tr>
                <tr>
                  <th>Nights away</th>
                  <td>{num(t.nightsAway)}</td>
                </tr>
                <tr>
                  <th>Days out of service</th>
                  <td>{num(t.daysOutOfService, 1)}</td>
                </tr>
                <tr>
                  <th>Most charter hours possible</th>
                  <td>{num(t.maxCharterHours)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="drawer-section">
            <h3>Trips</h3>
            <div className="trip-squares">
              {t.plans.map((p) => {
                const leg = p.legs.find((l) => l.kind === 'passengers')!
                const runwayFail = r.reasons.some((x) => x.key === 'runway' && (x.label.endsWith(` ${code(leg.to)}`) || x.label.endsWith(` ${code(leg.from)}`)))
                const status = runwayFail ? 'fail' : p.fuelStopsEachWay > 0 ? 'low' : 'good'
                const word = runwayFail ? 'Runway too short' : p.fuelStopsEachWay > 0 ? `${p.fuelStopsEachWay} fuel stop${p.fuelStopsEachWay > 1 ? 's' : ''}` : 'Nonstop'
                return (
                  <span key={p.tripId} className={`trip-square tone-${status}`} title={`${code(leg.from)}–${code(leg.to)} · ${word}`}>
                    <span className="trip-square-code">{code(leg.to)}</span>
                    <span className="trip-square-word">{word}</span>
                  </span>
                )
              })}
            </div>
            <table className="kv trips-table">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Nautical miles</th>
                  <th>Fuel stops each way</th>
                  <th>Between legs</th>
                  <th>A year</th>
                </tr>
              </thead>
              <tbody>
                {t.plans.map((p) => {
                  const leg = p.legs.find((l) => l.kind === 'passengers')!
                  return (
                    <tr key={p.tripId}>
                      <th>
                        {code(leg.from)}–{code(leg.to)}
                      </th>
                      <td>{num(p.distanceNm)}</td>
                      <td className={p.fuelStopsEachWay ? 'cell-low' : ''}>{p.fuelStopsEachWay}</td>
                      <td>{p.choice === 'wait' ? 'Waits' : p.choice === 'fly home empty' ? 'Flies home empty' : p.legs.some((l) => l.kind === 'empty') ? 'Empty return' : 'Same day'}</td>
                      <td>{p.timesPerYear}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className="drawer-section">
            <h3>Values and sources · {sources.length}</h3>
            <table className="sources-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Value</th>
                  <th>Low–high</th>
                  <th>Confidence</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const changed = changes[s.id] !== undefined
                  return (
                    <tr key={s.id} className={changed ? 'changed' : ''}>
                      <th>
                        <button type="button" className="link small" onClick={() => openLibrary({ focus: s.id })}>
                          {s.item}
                        </button>
                        <span className="muted"> · {s.jet}</span>
                      </th>
                      <td className="nowrap">
                        {rawValue(changed ? changes[s.id] : s.value)} <span className="muted">{s.unit}</span>
                        {changed && <span className="pill">Yours</span>}
                      </td>
                      <td className="nowrap">{s.low && s.high ? `${rawValue(s.low)}–${rawValue(s.high)}` : ''}</td>
                      <td>
                        <span className={`conf conf-${s.confidence.toLowerCase()}`}>{s.confidence}</span>
                      </td>
                      <td>
                        {s.source_url ? (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer">
                            {s.source_name ?? s.source_url}
                          </a>
                        ) : (
                          (s.source_name ?? 'Not found')
                        )}
                        {s.source_date && <span className="muted"> · {s.source_date}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </div>
      </aside>
    </div>
  )
}
