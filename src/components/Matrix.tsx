import type { JetResult } from '../engine/index.ts'
import { COLUMNS, failingColumns, toneFor, type Column, type ColumnKey } from './columns.ts'

interface Props {
  rows: JetResult[] // fitting jets first, in the current sort, then jets that do not fit
  positions: Map<string, Partial<Record<ColumnKey, number>>>
  sort: { key: ColumnKey; dir: 'asc' | 'desc' }
  onSort: (key: ColumnKey) => void
  diff: boolean
  onOpen: (jetId: string) => void
}

const GROUPS = [...new Set(COLUMNS.map((c) => c.group))]

/** Shade from 0 (worst) to 1 (best): five steps from amber to green. */
function shade(t: number | undefined) {
  if (t == null) return ''
  return `heat-${Math.min(4, Math.floor(t * 5))}`
}

/** Every element of every plane in one grid. Each column is shaded from best (green) to lowest (amber) within itself. */
export function Matrix({ rows, positions, sort, onSort, diff, onOpen }: Props) {
  const fitting = rows.filter((r) => r.fits)
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
          {rows.map((r) => {
            const pos = positions.get(r.jet.id) ?? {}
            const failing = failingColumns(r)
            return (
              <tr key={r.jet.id} className={r.fits ? '' : 'greyed'} onClick={() => onOpen(r.jet.id)}>
                <th scope="row" className="jet-col">
                  <button type="button" className="jet-link" onClick={() => onOpen(r.jet.id)}>
                    <span className={`band-dot ${r.jet.class === 'Midsize' ? 'band-mid' : 'band-super'}`} aria-hidden="true" />
                    {r.jet.name}
                  </button>
                  {!r.fits && <span className="no-fit">Does not fit</span>}
                </th>
                {COLUMNS.map((c) => {
                  const isFail = failing.has(c.key)
                  const fill = isFail ? 'cell-fail' : c.key === 'confidence' ? `cell-${toneFor(c, pos[c.key], false, r)}` : shade(pos[c.key])
                  const cls = [fill, c.group === 'Cost parts, 5 years' ? 'part-col' : ''].join(' ')
                  return (
                    <td key={c.key} className={cls}>
                      {c.cell(r, bases[c.key])}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
