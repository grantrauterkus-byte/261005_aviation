import { Fragment } from 'react'
import type { JetResult } from '../engine/index.ts'
import { COLUMNS, failingColumns, type Column, type ColumnKey } from './columns.ts'
import { ConfidenceBar, type ConfidenceOf } from './Certainty.tsx'

interface Props {
  rows: JetResult[] // fitting jets first, in the current sort, then jets that do not fit
  sort: { key: ColumnKey; dir: 'asc' | 'desc' }
  onSort: (key: ColumnKey) => void
  diff: boolean
  confidenceOf: ConfidenceOf
  onOpen: (jetId: string) => void
}

const GROUPS = [...new Set(COLUMNS.map((c) => c.group))]

/** Gap steps for the shading: how far a value is behind the best plane that fits, as a share of the best value. */
export const GAP_STEPS = [0.05, 0.15, 0.3, 0.5]

/**
 * Shading by how far a value is behind the best plane that fits: under 5% behind is not shaded,
 * then four steps of one neutral blue up to 50% or more behind. Yes/no items: "No" where the best has "Yes" is the darkest step.
 */
function gapShade(c: Column, r: JetResult, fitting: JetResult[]): string {
  if (!fitting.length) return ''
  const vals = fitting.map((o) => c.value(o)).filter(Number.isFinite)
  if (!vals.length) return ''
  const best = c.better === 'lower' ? Math.min(...vals) : Math.max(...vals)
  const v = c.value(r)
  if (!Number.isFinite(v) || best <= 0) return ''
  const gap = c.better === 'lower' ? (v - best) / best : (best - v) / best
  const step = GAP_STEPS.filter((s) => gap >= s).length
  return step ? `gap-${step}` : ''
}

/** Every element of every plane in one grid. Blue shading shows how far behind the best plane that fits; red marks a failed need. */
export function Matrix({ rows, sort, onSort, diff, confidenceOf, onOpen }: Props) {
  const fitting = rows.filter((r) => r.fits)
  const firstMiss = rows.findIndex((r) => !r.fits)
  // Difference view: each cost part against the lowest value among the jets that fit.
  const base = (c: Column) => {
    if (!diff || !c.diffable) return undefined
    const vals = (fitting.length ? fitting : rows).map((r) => c.value(r))
    return c.better === 'higher' ? Math.max(...vals) : Math.min(...vals)
  }
  const bases = Object.fromEntries(COLUMNS.map((c) => [c.key, base(c)])) as Record<ColumnKey, number | undefined>

  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr className="group-row">
            <th rowSpan={2} className="jet-col">
              Plane
            </th>
            {GROUPS.map((g) => (
              <th key={g} colSpan={COLUMNS.filter((c) => c.group === g).length} className="group-head">
                {g}
                {g === 'Cost parts, 5 years' && diff ? ' · difference from lowest' : ''}
              </th>
            ))}
          </tr>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.group === 'Cost parts, 5 years' ? 'part-col' : ''} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="sort-head" onClick={() => onSort(c.key)}>
                  <span>{c.label}</span>
                  {c.unit && <span className="unit">{c.unit}</span>}
                  {sort.key === c.key && <span className="arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const failing = failingColumns(r)
            return (
              <Fragment key={r.jet.id}>
              {i === firstMiss && (
                <tr className="divider-row">
                  <td colSpan={COLUMNS.length + 1}>
                    <span>Do not fit · {rows.length - firstMiss}</span>
                  </td>
                </tr>
              )}
              <tr className={r.fits ? '' : 'no-fit-row'} onClick={() => onOpen(r.jet.id)}>
                <th scope="row" className="jet-col">
                  <button type="button" className="jet-link" onClick={() => onOpen(r.jet.id)}>
                    <span className={`band-dot ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`} aria-hidden="true" />
                    {r.jet.name}
                  </button>
                  {!r.fits && <span className="no-fit">Does not fit</span>}
                </th>
                {COLUMNS.map((c) => {
                  const isFail = failing.has(c.key)
                  if (c.key === 'confidence') {
                    return (
                      <td key={c.key} className="conf-col">
                        <ConfidenceBar r={r} />
                      </td>
                    )
                  }
                  // Planes that do not fit are never shaded; only their failed needs are marked.
                  const fill = isFail ? 'cell-fail' : r.fits ? gapShade(c, r, fitting) : ''
                  // A zero (for example no charter income) carries no uncertainty, so it is not hatched.
                  const low = confidenceOf(c.source(r)) === 'Low' && c.value(r) !== 0
                  const cls = [fill, low ? 'cell-hatch' : '', c.group === 'Cost parts, 5 years' ? 'part-col' : ''].join(' ')
                  return (
                    <td key={c.key} className={cls} title={low ? 'Confidence Low' : undefined}>
                      {c.cell(r, bases[c.key])}
                    </td>
                  )
                })}
              </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
