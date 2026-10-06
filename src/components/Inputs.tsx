import { useEffect, useState } from 'react'
import type { Airport, EffectiveRequirements, Requirements, ScenarioInputs, Trip } from '../engine/index.ts'
import { AirportPicker } from './AirportPicker.tsx'

interface Props {
  inputs: ScenarioInputs
  setInputs: (i: ScenarioInputs) => void
  airports: Map<string, Airport>
  rememberAirport: (a: Airport) => void
  requirements: EffectiveRequirements
  tripsNeedingStopNote: string
}

/** A number box that lets people clear it while typing; only whole, in-range numbers are passed on. */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  suffix,
  hideLabel,
}: {
  label: string
  value: number | null
  onChange: (n: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  suffix?: string
  hideLabel?: boolean
}) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => {
    setText((t) => (value == null ? (t === '' ? t : '') : Number(t) === value && t !== '' ? t : String(value)))
  }, [value])
  return (
    <label className="field">
      <span className={hideLabel ? 'sr-only' : 'label'}>{label}</span>
      <span className="input-wrap">
        <input
          type="number"
          inputMode={step < 1 ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={step}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value === '') return onChange(null)
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            onChange(Math.min(max ?? Infinity, Math.max(min, n)))
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
    </label>
  )
}

let tripCounter = 0
function newTripId() {
  tripCounter += 1
  return `trip-${Date.now().toString(36)}-${tripCounter}`
}

export function Inputs({ inputs, setInputs, airports, rememberAirport, requirements, tripsNeedingStopNote }: Props) {
  const setTrip = (id: string, patch: Partial<Trip>) =>
    setInputs({ ...inputs, trips: inputs.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  const removeTrip = (id: string) => setInputs({ ...inputs, trips: inputs.trips.filter((t) => t.id !== id) })
  const addTrip = () =>
    setInputs({
      ...inputs,
      trips: [
        ...inputs.trips,
        { id: newTripId(), from: inputs.homeBase, to: '', passengers: 4, bags: 4, roundTrip: true, daysAtDestination: 2, timesPerYear: 4 },
      ],
    })
  const setReq = (patch: Partial<Requirements>) => setInputs({ ...inputs, requirements: { ...inputs.requirements, ...patch } })
  const r = inputs.requirements

  return (
    <div className="inputs">
      <section className="panel">
        <h2>Home base</h2>
        <AirportPicker
          label="Home base airport"
          hideLabel
          value={inputs.homeBase}
          airports={airports}
          onChange={(a) => {
            rememberAirport(a)
            const old = inputs.homeBase
            // Trips that started at the old home base now start at the new one.
            setInputs({ ...inputs, homeBase: a.ident, trips: inputs.trips.map((t) => (t.from === old ? { ...t, from: a.ident } : t)) })
          }}
        />
      </section>

      <section className="panel">
        <h2>Trips in a typical year</h2>
        {inputs.trips.length === 0 && <p className="muted">No trips yet.</p>}
        <ol className="trips">
          {inputs.trips.map((t, i) => (
            <li key={t.id} className="trip">
              <div className="trip-head">
                <span className="trip-number">Trip {i + 1}</span>
                <button type="button" className="link danger" onClick={() => removeTrip(t.id)}>
                  Remove
                </button>
              </div>
              <div className="trip-airports">
                <AirportPicker
                  label="From"
                  value={t.from}
                  airports={airports}
                  onChange={(a) => {
                    rememberAirport(a)
                    setTrip(t.id, { from: a.ident })
                  }}
                />
                <AirportPicker
                  label="To"
                  value={t.to}
                  airports={airports}
                  onChange={(a) => {
                    rememberAirport(a)
                    setTrip(t.id, { to: a.ident })
                  }}
                />
              </div>
              <div className="trip-grid">
                <NumberField label="Passengers" value={t.passengers} min={1} max={19} onChange={(n) => setTrip(t.id, { passengers: n ?? 1 })} />
                <NumberField label="Bags" value={t.bags} min={0} max={60} onChange={(n) => setTrip(t.id, { bags: n ?? 0 })} />
                <NumberField label="Times per year" value={t.timesPerYear} min={0} max={365} onChange={(n) => setTrip(t.id, { timesPerYear: n ?? 0 })} />
                <label className="field">
                  <span className="label">Trip type</span>
                  <select value={t.roundTrip ? 'round' : 'one'} onChange={(e) => setTrip(t.id, { roundTrip: e.target.value === 'round' })}>
                    <option value="round">Round trip</option>
                    <option value="one">One-way</option>
                  </select>
                </label>
                {t.roundTrip && (
                  <NumberField
                    label="Days at destination"
                    value={t.daysAtDestination}
                    min={0}
                    max={60}
                    onChange={(n) => setTrip(t.id, { daysAtDestination: n ?? 0 })}
                  />
                )}
              </div>
              {t.roundTrip && t.daysAtDestination === 0 && <p className="hint">0 days means a same-day return.</p>}
            </li>
          ))}
        </ol>
        <button type="button" onClick={addTrip}>
          Add a trip
        </button>
      </section>

      <section className="panel">
        <h2>Requirements</h2>
        <p className="hint">Seats and bag space are filled in from your trips. You can change them.</p>
        <div className="req-grid">
          <div>
            <NumberField label="Seats needed" value={r.seats ?? requirements.seats} min={1} max={19} onChange={(n) => setReq({ seats: n })} />
            {r.seats != null && (
              <button type="button" className="link" onClick={() => setReq({ seats: null })}>
                Use the most passengers on any trip
              </button>
            )}
          </div>
          <div>
            <NumberField label="Bags needed" value={r.bags ?? requirements.bags} min={0} max={60} onChange={(n) => setReq({ bags: n })} />
            <p className="hint">
              Bag space needed: {requirements.bagSpaceCuFt.toLocaleString('en-US')} cubic feet ({requirements.bagSizeCuFt} per bag)
            </p>
            {r.bags != null && (
              <button type="button" className="link" onClick={() => setReq({ bags: null })}>
                Use the most bags on any trip
              </button>
            )}
          </div>
          <NumberField label="Range safety margin" value={r.rangeMarginPct} min={0} max={50} suffix="%" onChange={(n) => setReq({ rangeMarginPct: n ?? 0 })} />
          <div>
            <NumberField
              label="Most trips allowed to need a fuel stop"
              value={r.maxFuelStopTrips}
              min={0}
              max={9999}
              placeholder="No limit"
              onChange={(n) => setReq({ maxFuelStopTrips: n })}
            />
            <p className="hint">{tripsNeedingStopNote}</p>
          </div>
        </div>
        <fieldset className="checks">
          <legend className="label">Checks and must-haves</legend>
          <label>
            <input type="checkbox" checked={r.runwayCheck} onChange={(e) => setReq({ runwayCheck: e.target.checked })} /> Runway check: the jet must be able to
            take off from every airport in my trips
          </label>
          <label>
            <input type="checkbox" checked={r.standUpCabin} onChange={(e) => setReq({ standUpCabin: e.target.checked })} /> Stand-up cabin (6 ft or more)
          </label>
          <label>
            <input type="checkbox" checked={r.flatFloor} onChange={(e) => setReq({ flatFloor: e.target.checked })} /> Flat floor
          </label>
          <label>
            <input type="checkbox" checked={r.enclosedLavatory} onChange={(e) => setReq({ enclosedLavatory: e.target.checked })} /> Enclosed lavatory
          </label>
        </fieldset>
      </section>

      <section className="panel">
        <h2>Charter</h2>
        <NumberField
          label="Hours you would charter the jet out per year (0 to 400)"
          value={inputs.charterHours}
          min={0}
          max={400}
          onChange={(n) => setInputs({ ...inputs, charterHours: n ?? 0 })}
        />
        <input
          type="range"
          aria-label="Charter hours per year"
          min={0}
          max={400}
          step={10}
          value={inputs.charterHours}
          onChange={(e) => setInputs({ ...inputs, charterHours: Number(e.target.value) })}
        />
      </section>
    </div>
  )
}
