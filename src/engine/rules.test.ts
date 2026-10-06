import { describe, expect, it } from 'vitest'
import { calculate, defaultInputs, fuelStopsFor, type Airport, type ScenarioInputs, type Trip } from './index.ts'
import { demoData } from './__fixtures__/data.ts'

const data = demoData()
// Extra airports on the equator, so distances are easy to reason about (one degree of longitude ≈ 60.04 nautical miles).
const extra: Airport[] = [
  { ident: 'HOME', code: 'HOM', name: 'Home Field', municipality: 'Home', latitude: 0, longitude: 0, longest_runway_ft: 8000 },
  { ident: 'NEAR', code: 'NEA', name: 'Near Field', municipality: 'Near', latitude: 0, longitude: 2, longest_runway_ft: 8000 },
  { ident: 'FAR', code: 'FAR', name: 'Far Field', municipality: 'Far', latitude: 0, longitude: 50, longest_runway_ft: 8000 },
  { ident: 'SHORT', code: 'SHT', name: 'Short Strip', municipality: 'Shortville', latitude: 0, longitude: 3, longest_runway_ft: 4000 },
]
for (const a of extra) data.airports.set(a.ident, a)

function scenario(trips: Partial<Trip>[], more: Partial<ScenarioInputs> = {}): ScenarioInputs {
  const base = defaultInputs()
  return {
    ...base,
    homeBase: 'HOME',
    trips: trips.map((t, i) => ({ id: `t${i}`, from: 'HOME', to: 'NEAR', passengers: 4, bags: 2, roundTrip: true, daysAtDestination: 0, timesPerYear: 1, ...t })),
    ...more,
  }
}

function jet(inputs: ScenarioInputs, id: string, changes = {}) {
  const r = calculate(inputs, changes, data)
  return [...r.fitting, ...r.notFitting].find((j) => j.jet.id === id)!
}

describe('trip-to-legs rules', () => {
  it('same-day round trip: two legs with passengers, no nights', () => {
    const plan = jet(scenario([{}]), 'challenger-300').typical.plans[0]
    expect(plan.choice).toBeNull()
    expect(plan.legs.map((l) => `${l.from}-${l.to} ${l.kind}`)).toEqual(['HOME-NEAR passengers', 'NEAR-HOME passengers'])
    expect(plan.nightsAway).toBe(0)
    expect(plan.ownerDays).toBe(1)
  })

  it('waits at the destination when that costs less', () => {
    // 2 nights at $810 a night is far cheaper than two empty 120-nautical-mile legs.
    const plan = jet(scenario([{ daysAtDestination: 2 }]), 'challenger-300').typical.plans[0]
    expect(plan.choice).toBe('wait')
    expect(plan.waitCost).toBe(2 * (2 * 330 + 150))
    expect(plan.legs).toHaveLength(2)
    expect(plan.nightsAway).toBe(2)
    expect(plan.ownerDays).toBe(3)
  })

  it('flies home empty and comes back when that costs less', () => {
    // 30 nights cost $24,300 to wait; two empty legs of about 120 nautical miles cost far less.
    const r = jet(scenario([{ daysAtDestination: 30 }]), 'challenger-300')
    const plan = r.typical.plans[0]
    expect(plan.choice).toBe('fly home empty')
    expect(plan.flyHomeCost!).toBeLessThan(plan.waitCost!)
    expect(plan.legs.map((l) => `${l.from}-${l.to} ${l.kind}`)).toEqual([
      'HOME-NEAR passengers',
      'NEAR-HOME empty',
      'HOME-NEAR empty',
      'NEAR-HOME passengers',
    ])
    expect(plan.nightsAway).toBe(0)
    expect(plan.ownerDays).toBe(31) // the owner is still using the jet those days
    expect(r.typical.emptyHours).toBeCloseTo(r.typical.ownerHours, 6)
    expect(r.typical.yearly.pilotTravel).toBe(0)
    expect(r.typical.yearly.parking).toBe(0)
  })

  it('one-way: one leg with passengers and one empty leg back to home base', () => {
    const plan = jet(scenario([{ roundTrip: false, daysAtDestination: 4 }]), 'challenger-300').typical.plans[0]
    expect(plan.legs.map((l) => `${l.from}-${l.to} ${l.kind}`)).toEqual(['HOME-NEAR passengers', 'NEAR-HOME empty'])
    expect(plan.nightsAway).toBe(0)
    expect(plan.ownerDays).toBe(1)
  })

  it('a trip that does not start at home base adds empty legs to the start and back', () => {
    const plan = jet(scenario([{ from: 'NEAR', to: 'SHORT' }]), 'challenger-300').typical.plans[0]
    expect(plan.legs.map((l) => `${l.from}-${l.to} ${l.kind}`)).toEqual([
      'HOME-NEAR empty',
      'NEAR-SHORT passengers',
      'SHORT-NEAR passengers',
      'NEAR-HOME empty',
    ])
  })

  it('counts every landing, with you onboard or empty', () => {
    const r = jet(scenario([{ roundTrip: false, timesPerYear: 3 }]), 'challenger-300')
    expect(r.typical.landings).toBe(6)
    expect(r.typical.yearly.landingAndHandling).toBe(6 * 400)
  })
})

describe('fuel stops', () => {
  it('counts how many times the distance exceeds the usable range, rounded up, minus one', () => {
    // Range 1,000 with a 10% margin: usable range is 900.
    expect(fuelStopsFor(900, 1000, 10)).toBe(0)
    expect(fuelStopsFor(901, 1000, 10)).toBe(1)
    expect(fuelStopsFor(1800, 1000, 10)).toBe(1)
    expect(fuelStopsFor(1801, 1000, 10)).toBe(2)
    expect(fuelStopsFor(500, 1000, 0)).toBe(0)
  })

  it('adds stop time to the leg, a fee per stop, and counts trips that are not nonstop', () => {
    // HOME to FAR is about 3,002 nautical miles: more than the Citation XLS's usable 1,616 (1,796 less 10%), less than twice it.
    const r = jet(scenario([{ to: 'FAR', timesPerYear: 2 }]), 'citation-xls')
    const leg = r.typical.plans[0].legs[0]
    expect(leg.fuelStops).toBe(1)
    expect(leg.hours).toBeCloseTo(leg.distanceNm / 433 + 0.3 + 0.75, 9)
    expect(r.typical.fuelStopsPerYear).toBe(4) // 2 legs × 2 times a year
    expect(r.typical.yearly.fuelStopFees).toBe(4 * 300)
    expect(r.tripsNonstop).toBe(0)
    expect(r.tripsNeedingFuelStop).toBe(2)
  })

  it('a larger safety margin can add a stop', () => {
    const inputs = scenario([{ to: 'FAR' }])
    expect(jet(inputs, 'embraer-praetor-600').typical.plans[0].fuelStopsEachWay).toBe(0) // usable 3,616
    inputs.requirements = { ...inputs.requirements, rangeMarginPct: 30 } // usable 2,813
    expect(jet(inputs, 'embraer-praetor-600').typical.plans[0].fuelStopsEachWay).toBe(1)
  })

  it('the fuel-stop limit greys out jets that need too many stops', () => {
    const inputs = scenario([{ to: 'FAR', timesPerYear: 3 }])
    inputs.requirements = { ...inputs.requirements, maxFuelStopTrips: 2 }
    const xls = jet(inputs, 'citation-xls')
    expect(xls.fits).toBe(false)
    expect(xls.reasons).toContain('3 trips a year need a fuel stop, you allow 2')
    expect(jet(inputs, 'embraer-praetor-600').fits).toBe(true)
  })
})

describe('availability cap on charter hours', () => {
  it('limits charter hours to what the free days allow', () => {
    // Owner flying: 100 same-day trips to NEAR, so 100 owner days.
    const inputs = scenario([{ timesPerYear: 100 }], { charterHours: 400 })
    const r = jet(inputs, 'challenger-300')
    const t = r.typical
    const flown = t.ownerHours + t.emptyHours
    const expected = Math.floor((1.0 * (365 - 14 - 100 - (2.5 * flown) / 100)) / (1 + 2.5 / 100))
    expect(t.maxCharterHours).toBe(expected)
    expect(t.charterHours).toBe(expected)
    expect(t.charterLimited).toBe(true)
    // At the cap, the free days still cover the charter hours.
    const freeDays = 365 - t.daysOutOfService - t.ownerDays
    expect(t.charterHours).toBeLessThanOrEqual(freeDays * 1.0)
    expect(freeDays * 1.0 - t.charterHours).toBeLessThan(1.1)
  })

  it('uses the requested hours when they fit, and adds charter costs and income', () => {
    const r = jet(scenario([{}], { charterHours: 100 }), 'challenger-300')
    const t = r.typical
    expect(t.charterLimited).toBe(false)
    expect(t.charterHours).toBe(100)
    expect(t.yearly.charterCertificate).toBe(45000)
    expect(t.charterIncome).toBeCloseTo(100 * 7500 * 0.85, 6)
    expect(t.totalHours).toBeCloseTo(t.ownerHours + 100, 9)
    // Charter hours are not your hours.
    expect(t.costPerHour!).toBeCloseTo(t.fiveYearTotal / (5 * t.ownerHours), 6)
  })

  it('no charter hours means no charter costs or income', () => {
    const t = jet(scenario([{}]), 'challenger-300').typical
    expect(t.yearly.charterCertificate).toBe(0)
    expect(t.charterIncome).toBe(0)
  })
})

describe('pilot count', () => {
  it('two pilots at or below the threshold', () => {
    const t = jet(scenario([{}], { charterHours: 0 }), 'challenger-300').typical
    expect(t.pilots).toBe(2)
    expect(t.yearly.pilots).toBeCloseTo(2 * 161795 * 1.43, 6)
    expect(t.yearly.pilotTraining).toBe(2 * 22500)
  })

  it('three pilots above the threshold', () => {
    // Long trips to FAR, 40 times a year: well over 500 hours.
    const t = jet(scenario([{ to: 'FAR', timesPerYear: 40 }]), 'challenger-300').typical
    expect(t.totalHours).toBeGreaterThan(500)
    expect(t.pilots).toBe(3)
    expect(t.yearly.pilots).toBeCloseTo(3 * 161795 * 1.43, 6)
    expect(t.yearly.pilotTraining).toBe(3 * 22500)
  })

  it('follows the threshold in the Library, including a changed value', () => {
    const inputs = scenario([{ timesPerYear: 10 }])
    expect(jet(inputs, 'challenger-300').typical.pilots).toBe(2)
    expect(jet(inputs, 'challenger-300', { 'all.third_pilot_threshold_hours': '5' }).typical.pilots).toBe(3)
  })

  it('pilots traveling on a trip are always two', () => {
    const t = jet(scenario([{ to: 'FAR', timesPerYear: 40, daysAtDestination: 1 }]), 'challenger-300').typical
    expect(t.pilots).toBe(3)
    expect(t.yearly.pilotTravel).toBe(t.nightsAway * 2 * 330)
  })
})

describe('fit checks', () => {
  it('reports seats, bag space, runway and must-haves with real values', () => {
    const inputs = scenario([{ to: 'SHORT', passengers: 9, bags: 30 }])
    inputs.requirements = { ...inputs.requirements, standUpCabin: true, flatFloor: true }
    const lear = jet(inputs, 'learjet-60')
    expect(lear.fits).toBe(false)
    expect(lear.reasons).toEqual([
      'Seats 7, you need 9',
      'Bag space 48 cubic feet, you need 75 (30 bags)',
      'Cannot take off from Shortville (SHT) (needs 5,450 ft, longest runway 4,000 ft)',
      'No stand-up cabin (cabin height 68 inches)',
      'No flat floor',
    ])
  })

  it('runway check off ignores runways', () => {
    const inputs = scenario([{ to: 'SHORT' }])
    expect(jet(inputs, 'learjet-60').fits).toBe(false)
    inputs.requirements = { ...inputs.requirements, runwayCheck: false }
    expect(jet(inputs, 'learjet-60').fits).toBe(true)
  })

  it('the default scenario: all 10 jets fit', () => {
    const r = calculate(defaultInputs(), {}, data)
    expect(r.fitting).toHaveLength(10)
    expect(r.requirements.seats).toBe(6)
    expect(r.requirements.bagSpaceCuFt).toBe(20)
  })
})

describe('changed values', () => {
  it('a changed purchase price is used everywhere and replaces its low and high', () => {
    const before = jet(defaultInputs(), 'challenger-300')
    const after = jet(defaultInputs(), 'challenger-300', { 'challenger-300.purchase_price': '7000000' })
    expect(after.specs.purchasePrice).toBe(7000000)
    expect(after.typical.yearly.insurance).toBeCloseTo(0.00185 * 7000000 + 18500, 6)
    expect(after.fiveYearTotal.typical).toBeLessThan(before.fiveYearTotal.typical)
    expect(after.biggestDriver?.assumptionId).not.toBe('challenger-300.purchase_price')
  })

  it('a changed value equal to the original counts as unchanged', () => {
    const a = jet(defaultInputs(), 'challenger-300')
    const b = jet(defaultInputs(), 'challenger-300', { 'challenger-300.purchase_price': '8200000' })
    expect(b.fiveYearTotal).toEqual(a.fiveYearTotal)
  })
})

describe('high hours lower the resale value', () => {
  it('applies extra value loss only above the typical owner hours', () => {
    const t = jet(scenario([{}], { charterHours: 247 }), 'challenger-300').typical
    expect(t.totalHours).toBeLessThan(400)
    expect(t.purchase.highHoursLoss).toBe(0)
    const busy = jet(scenario([{ to: 'FAR', timesPerYear: 40 }]), 'challenger-300').typical
    const extraHours = (busy.totalHours - 400) * 5
    expect(busy.purchase.extraHours).toBeCloseTo(extraHours, 9)
    expect(busy.purchase.highHoursLoss).toBeCloseTo(busy.purchase.resaleBeforeHighHours * 0.06 * (extraHours / 1000), 6)
  })
})
