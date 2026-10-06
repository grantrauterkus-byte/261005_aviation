import { useEffect, useMemo, useState } from 'react'
import type { Airport, AssumptionRow, Changes, JetResult, Results, ScenarioInputs } from '../engine/index.ts'
import { Inputs } from './Inputs.tsx'
import { JetTile } from './JetTile.tsx'
import { JetPanel } from './JetPanel.tsx'
import { Matrix } from './Matrix.tsx'
import { Chip, ToneKey } from './Chip.tsx'
import { COLUMN, COLUMNS, positions as columnPositions, type ColumnKey } from './columns.ts'

interface Props {
  inputs: ScenarioInputs
  setInputs: (i: ScenarioInputs) => void
  results: Results
  airports: Map<string, Airport>
  rememberAirport: (a: Airport) => void
  assumptions: AssumptionRow[]
  changes: Changes
  setChange: (id: string, value: string | null) => void
  openLibrary: (o: { focus?: string; jet?: string }) => void
  totalJets: number
}

type View = 'tiles' | 'matrix'

function readView(): View {
  try {
    return localStorage.getItem('find-view') === 'matrix' ? 'matrix' : 'tiles'
  } catch {
    return 'tiles'
  }
}

export function FindMyJet({ inputs, setInputs, results, airports, rememberAirport, assumptions, changes, setChange, openLibrary, totalJets }: Props) {
  const [view, setView] = useState<View>(readView)
  const [sort, setSort] = useState<{ key: ColumnKey; dir: 'asc' | 'desc' }>({ key: 'total', dir: 'asc' })
  const [diff, setDiff] = useState(false)
  const [openJet, setOpenJet] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('find-view', view)
    } catch {
      /* not available */
    }
  }, [view])

  const all = useMemo(() => [...results.fitting, ...results.notFitting], [results])
  const pos = useMemo(() => columnPositions(all), [all])
  const sorted = useMemo(() => {
    const c = COLUMN[sort.key]
    const by = (a: JetResult, b: JetResult) => {
      const d = sort.dir === 'asc' ? c.value(a) - c.value(b) : c.value(b) - c.value(a)
      return d || a.fiveYearTotal.typical - b.fiveYearTotal.typical
    }
    return [...[...results.fitting].sort(by), ...[...results.notFitting].sort(by)]
  }, [results, sort])

  const chooseSort = (key: ColumnKey) => {
    const natural = COLUMN[key].better === 'lower' ? 'asc' : 'desc'
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: natural }))
  }

  const home = airports.get(inputs.homeBase)
  const tripsPerYear = inputs.trips.reduce((s, t) => s + (t.timesPerYear || 0), 0)
  const req = results.requirements
  const musts = [req.standUpCabin && 'Stand-up cabin', req.flatFloor && 'Flat floor', req.enclosedLavatory && 'Enclosed lavatory'].filter(Boolean) as string[]
  const open = all.find((r) => r.jet.id === openJet)

  return (
    <div className="find">
      <section className="summary-bar" aria-label="How you fly">
        <Chip label="Home" value={home ? home.code : '–'} />
        <Chip label="Trips" value={`${inputs.trips.length} · ${tripsPerYear} a year`} />
        <Chip label="Seats" value={String(req.seats)} />
        <Chip label="Bags" value={String(req.bags)} />
        <Chip label="Runway check" value={req.runwayCheck ? 'On' : 'Off'} />
        <Chip label="Range margin" value={`${req.rangeMarginPct}%`} />
        {req.maxFuelStopTrips != null && <Chip label="Fuel-stop trips allowed" value={String(req.maxFuelStopTrips)} />}
        {musts.map((m) => (
          <Chip key={m} label="Must have" value={m} />
        ))}
        <Chip label="Charter" value={`${inputs.charterHours} hours`} />
        <button type="button" className="primary small-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
      </section>

      <div className="results-head">
        <h1>
          {results.fitting.length} of {totalJets} fit
        </h1>
        <div className="view-switch" role="group" aria-label="View">
          <button type="button" className={view === 'tiles' ? 'on' : ''} onClick={() => setView('tiles')}>
            Tiles
          </button>
          <button type="button" className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>
            Matrix
          </button>
        </div>
        <label className="sort">
          <span>Sort</span>
          <select value={sort.key} onChange={(e) => chooseSort(e.target.value as ColumnKey)}>
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.group === 'Cost parts, 5 years' ? `Cost part: ${c.label}` : c.label}
              </option>
            ))}
          </select>
          <button type="button" className="small" onClick={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))} aria-label="Reverse sort">
            {sort.dir === 'asc' ? '▲' : '▼'}
          </button>
        </label>
        {view === 'matrix' && (
          <div className="view-switch" role="group" aria-label="Cost parts">
            <button type="button" className={!diff ? 'on' : ''} onClick={() => setDiff(false)}>
              Amounts
            </button>
            <button type="button" className={diff ? 'on' : ''} onClick={() => setDiff(true)}>
              Difference from lowest
            </button>
          </div>
        )}
        <ToneKey />
      </div>

      {results.warnings.map((w) => (
        <p key={w} className="notice small">
          {w}
        </p>
      ))}

      {view === 'tiles' ? (
        <div className="tile-list">
          {sorted.map((r) => (
            <JetTile key={r.jet.id} rank={r.fits ? sorted.filter((x) => x.fits).indexOf(r) + 1 : null} result={r} position={pos.get(r.jet.id) ?? {}} onOpen={() => setOpenJet(r.jet.id)} />
          ))}
        </div>
      ) : (
        <Matrix rows={sorted} positions={pos} sort={sort} onSort={chooseSort} diff={diff} onOpen={setOpenJet} />
      )}

      {open && (
        <JetPanel
          result={open}
          position={pos.get(open.jet.id) ?? {}}
          rows={assumptions}
          changes={changes}
          airports={airports}
          setChange={setChange}
          openLibrary={openLibrary}
          onClose={() => setOpenJet(null)}
        />
      )}

      {editing && (
        <div className="drawer-wrap" onClick={() => setEditing(false)}>
          <aside className="drawer left wide" role="dialog" aria-label="How you fly" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-head">
              <h2>How you fly</h2>
              <button type="button" className="primary" onClick={() => setEditing(false)}>
                Done
              </button>
            </header>
            <div className="drawer-body">
              <Inputs inputs={inputs} setInputs={setInputs} airports={airports} rememberAirport={rememberAirport} requirements={results.requirements} />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
