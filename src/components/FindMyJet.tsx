import { useState } from 'react'
import type { Airport, Changes, JetResult, Results, ScenarioInputs } from '../engine/index.ts'
import { Inputs } from './Inputs.tsx'
import { JetCard, NotFittingCard } from './JetCard.tsx'
import { SCORECARD, type SortKey } from './scorecard.ts'

interface Props {
  inputs: ScenarioInputs
  setInputs: (i: ScenarioInputs) => void
  results: Results
  airports: Map<string, Airport>
  rememberAirport: (a: Airport) => void
  changes: Changes
  setChange: (id: string, value: string | null) => void
  openLibrary: (o: { focus?: string; jet?: string }) => void
  totalJets: number
}

function fuelStopNote(all: JetResult[]) {
  const needing = all.filter((r) => r.tripsNeedingFuelStop > 0).sort((a, b) => b.tripsNeedingFuelStop - a.tripsNeedingFuelStop)
  if (!all.length) return ''
  if (!needing.length) return 'Every jet flies all your trips nonstop.'
  const list = needing.map((r) => `${r.jet.name} ${r.tripsNeedingFuelStop}`).join(', ')
  return `Trips a year that would need a fuel stop: ${list}. All other jets: none.`
}

export function FindMyJet({ inputs, setInputs, results, airports, rememberAirport, changes, setChange, openLibrary, totalJets }: Props) {
  const [sort, setSort] = useState<SortKey>('total')
  const all = [...results.fitting, ...results.notFitting]
  const row = SCORECARD.find((r) => r.key === sort)!
  const sorted = [...results.fitting].sort((a, b) => {
    const va = row.sortValue(a)
    const vb = row.sortValue(b)
    const d = row.better === 'lower' ? va - vb : vb - va
    return d || a.fiveYearTotal.typical - b.fiveYearTotal.typical
  })

  return (
    <div className="find">
      <aside className="find-inputs">
        <Inputs
          inputs={inputs}
          setInputs={setInputs}
          airports={airports}
          rememberAirport={rememberAirport}
          requirements={results.requirements}
          tripsNeedingStopNote={fuelStopNote(all)}
        />
      </aside>
      <section className="find-results" aria-live="polite">
        <div className="results-head">
          <h1>
            {results.fitting.length} of {totalJets} jets fit how you fly.
          </h1>
          <label className="sort">
            <span className="label">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SCORECARD.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {results.warnings.map((w) => (
          <p key={w} className="notice">
            {w}
          </p>
        ))}
        <div className="cards">
          {sorted.map((r, i) => (
            <JetCard key={r.jet.id} rank={i + 1} result={r} changes={changes} setChange={setChange} openLibrary={openLibrary} />
          ))}
        </div>
        {results.notFitting.length > 0 && (
          <>
            <h2 className="not-fitting-title">Jets that don't fit</h2>
            <div className="not-fitting">
              {results.notFitting.map((r) => (
                <NotFittingCard key={r.jet.id} result={r} openLibrary={openLibrary} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
