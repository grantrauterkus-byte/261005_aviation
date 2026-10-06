import type { ScenarioInputs } from './types.ts'

/** The default demo scenario from SPEC.md. */
export const DEFAULT_SCENARIO_NAME = 'Demo: New York owner'

export function defaultInputs(): ScenarioInputs {
  return {
    homeBase: 'KTEB',
    trips: [
      { id: 't1', from: 'KTEB', to: 'KPBI', passengers: 4, bags: 4, roundTrip: true, daysAtDestination: 5, timesPerYear: 8 },
      { id: 't2', from: 'KTEB', to: 'KASE', passengers: 6, bags: 8, roundTrip: true, daysAtDestination: 4, timesPerYear: 4 },
      { id: 't3', from: 'KTEB', to: 'KVNY', passengers: 4, bags: 4, roundTrip: true, daysAtDestination: 3, timesPerYear: 4 },
      { id: 't4', from: 'KTEB', to: 'KBED', passengers: 3, bags: 2, roundTrip: true, daysAtDestination: 0, timesPerYear: 10 },
    ],
    requirements: {
      seats: null,
      bags: null,
      runwayCheck: true,
      rangeMarginPct: 10,
      maxFuelStopTrips: null,
      standUpCabin: false,
      flatFloor: false,
      enclosedLavatory: false,
    },
    charterHours: 0,
  }
}
