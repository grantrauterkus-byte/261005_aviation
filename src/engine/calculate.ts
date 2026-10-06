/**
 * The cost engine. Implements SPEC.md "How costs are calculated", step by step.
 * Plain TypeScript, no network calls. Section numbers in comments match SPEC.md.
 */
import { distanceNm } from './geo.ts'
import type {
  Airport,
  AssumptionRow,
  Breakdown,
  Calculation,
  Changes,
  Driver,
  EffectiveRequirements,
  Jet,
  JetResult,
  Leg,
  LegKind,
  Purchase,
  Results,
  ScenarioInputs,
  Trip,
  TripPlan,
  YearlyCosts,
} from './types.ts'
import { applyChanges, JetValues, type EffectiveRow, type End } from './values.ts'

const YEARS = 5
/** Pilots who travel on each trip (SPEC.md: "number of pilots on the trip (2)"). */
const PILOTS_PER_TRIP = 2

/** The assumptions that set the low and high ends of the three numbers (SPEC.md section 6). */
export const RANGE_KEYS = ['purchase_price', 'yearly_value_loss', 'fuel_price', 'charter_rate', 'owner_charter_revenue_share'] as const

export interface EngineData {
  jets: Jet[]
  assumptions: AssumptionRow[]
  airports: Map<string, Airport> // by ident
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export function effectiveRequirements(inputs: ScenarioInputs, rows: Map<string, EffectiveRow>): EffectiveRequirements {
  const r = inputs.requirements
  const maxPassengers = Math.max(0, ...inputs.trips.map((t) => t.passengers))
  const maxBags = Math.max(0, ...inputs.trips.map((t) => t.bags))
  const bags = r.bags ?? maxBags
  const bagSize = Number(rows.get('all.bag_size')?.value ?? NaN)
  return {
    seats: r.seats ?? maxPassengers,
    bags,
    bagSizeCuFt: bagSize,
    bagSpaceCuFt: bags * bagSize,
    runwayCheck: r.runwayCheck,
    rangeMarginPct: r.rangeMarginPct,
    maxFuelStopTrips: r.maxFuelStopTrips,
    standUpCabin: r.standUpCabin,
    flatFloor: r.flatFloor,
    enclosedLavatory: r.enclosedLavatory,
  }
}

// ---------------------------------------------------------------------------
// 1. Turning trips into flying
// ---------------------------------------------------------------------------

/** Number of fuel stops for a distance: how many times it exceeds the usable range, rounded up, minus one. */
export function fuelStopsFor(distance: number, rangeNm: number, marginPct: number): number {
  const usable = rangeNm * (1 - marginPct / 100)
  if (distance <= usable) return 0
  return Math.ceil(distance / usable) - 1
}

interface LegContext {
  airports: Map<string, Airport>
  rangeNm: number
  marginPct: number
  speedKt: number
  allowanceHours: number
  fuelStopHours: number
}

function makeLeg(ctx: LegContext, from: string, to: string, kind: LegKind): Leg {
  const a = ctx.airports.get(from)
  const b = ctx.airports.get(to)
  if (!a || !b) throw new Error(`Unknown airport: ${!a ? from : to}`)
  const d = distanceNm(a, b)
  const stops = fuelStopsFor(d, ctx.rangeNm, ctx.marginPct)
  return { from, to, kind, distanceNm: d, fuelStops: stops, hours: d / ctx.speedKt + ctx.allowanceHours + stops * ctx.fuelStopHours }
}

/** Cost of flying one leg, used to choose between waiting and flying home empty. */
interface LegCostRates {
  hourly: number // fuel + maintenance + engine reserve, per hour
  landing: number
  fuelStopFee: number
  hotel: number // per pilot per night
  parking: number // per night
}

function legCost(leg: Leg, rates: LegCostRates) {
  return leg.hours * rates.hourly + rates.landing + leg.fuelStops * rates.fuelStopFee
}

export function planTrip(trip: Trip, home: string, ctx: LegContext, rates: LegCostRates): TripPlan {
  const { from, to } = trip
  const toStart = from !== home ? [makeLeg(ctx, home, from, 'empty')] : []
  const outbound = makeLeg(ctx, from, to, 'passengers')
  const base = {
    tripId: trip.id,
    distanceNm: outbound.distanceNm,
    fuelStopsEachWay: outbound.fuelStops,
    timesPerYear: trip.timesPerYear,
  }

  if (!trip.roundTrip) {
    // One-way: one leg with passengers, plus one empty leg back to home base.
    const back = to !== home ? [makeLeg(ctx, to, home, 'empty')] : []
    return { ...base, choice: null, waitCost: null, flyHomeCost: null, legs: [...toStart, outbound, ...back], nightsAway: 0, ownerDays: 1 }
  }

  const inbound = makeLeg(ctx, to, from, 'passengers')
  const fromStart = from !== home ? [makeLeg(ctx, from, home, 'empty')] : []
  const days = trip.daysAtDestination
  const ownerDays = days + 1

  if (days === 0) {
    // Same-day round trip: two legs with passengers.
    return { ...base, choice: null, waitCost: null, flyHomeCost: null, legs: [...toStart, outbound, inbound, ...fromStart], nightsAway: 0, ownerDays }
  }

  // Round trip with days at the destination: wait there, or fly home empty and come back. Pick the cheaper.
  const waitCost = days * (PILOTS_PER_TRIP * rates.hotel + rates.parking)
  const repo = to !== home ? [makeLeg(ctx, to, home, 'empty'), makeLeg(ctx, home, to, 'empty')] : []
  const flyHomeCost = repo.reduce((s, l) => s + legCost(l, rates), 0)
  if (repo.length && flyHomeCost < waitCost) {
    return { ...base, choice: 'fly home empty', waitCost, flyHomeCost, legs: [...toStart, outbound, ...repo, inbound, ...fromStart], nightsAway: 0, ownerDays }
  }
  return { ...base, choice: 'wait', waitCost, flyHomeCost: repo.length ? flyHomeCost : null, legs: [...toStart, outbound, inbound, ...fromStart], nightsAway: days, ownerDays }
}

// ---------------------------------------------------------------------------
// Steps 1 to 5 for one jet and one set of values
// ---------------------------------------------------------------------------

export function calculateJet(inputs: ScenarioInputs, v: JetValues, airports: Map<string, Airport>, marginPct: number): Calculation {
  const ctx: LegContext = {
    airports,
    rangeNm: v.num('range_4_pax'),
    marginPct,
    speedKt: v.num('cruise_speed'),
    allowanceHours: v.num('taxi_climb_descent_allowance'),
    fuelStopHours: v.num('fuel_stop_time'),
  }
  const fuelPrice = v.num('fuel_price')
  const fuelBurn = v.num('fuel_burn')
  const maintenancePerHour = v.num('maintenance_per_hour')
  const reservePerHour = v.num('engine_reserve_per_hour')
  const rates: LegCostRates = {
    hourly: fuelBurn * fuelPrice + maintenancePerHour + reservePerHour,
    landing: v.num('landing_handling_fee'),
    fuelStopFee: v.num('fuel_stop_fee'),
    hotel: v.num('pilot_hotel_meals_per_night'),
    parking: v.num('parking_per_night'),
  }

  // 1. Trips into flying
  const plans = inputs.trips.map((t) => planTrip(t, inputs.homeBase, ctx, rates))
  let ownerHours = 0
  let emptyHours = 0
  let landings = 0
  let fuelStopsPerYear = 0
  let nightsAway = 0
  let ownerDays = 0
  for (const p of plans) {
    for (const l of p.legs) {
      if (l.kind === 'passengers') ownerHours += l.hours * p.timesPerYear
      else emptyHours += l.hours * p.timesPerYear
      landings += p.timesPerYear
      fuelStopsPerYear += l.fuelStops * p.timesPerYear
    }
    nightsAway += p.nightsAway * p.timesPerYear
    ownerDays += p.ownerDays * p.timesPerYear
  }

  // 2. Can the jet fly that much?
  // Days out of service depend on total hours, which include charter hours, so the most charter hours possible
  // solves: C = (365 − (base + extra × (owner and empty hours + C) ÷ 100) − owner days) × charter hours per day.
  const baseDays = v.num('base_days_out_of_service')
  const extraDaysPer100 = v.num('extra_days_out_of_service_per_100_hours')
  const perDay = v.num('charter_hours_per_available_day')
  const flown = ownerHours + emptyHours
  const maxCharterHours = Math.max(
    0,
    Math.floor((perDay * (365 - baseDays - ownerDays - (extraDaysPer100 * flown) / 100)) / (1 + (extraDaysPer100 * perDay) / 100)),
  )
  const charterHoursRequested = Math.max(0, inputs.charterHours)
  const charterHours = Math.min(charterHoursRequested, maxCharterHours)
  const charterLimited = charterHoursRequested > maxCharterHours
  const totalHours = flown + charterHours
  const daysOutOfService = baseDays + (extraDaysPer100 * totalHours) / 100
  const pilots = totalHours > v.num('third_pilot_threshold_hours') ? 3 : 2

  // 3. Yearly costs
  const price = v.num('purchase_price')
  // Insurance uses the typical purchase price (SPEC.md), even when the range uses a low or high price.
  const typicalPrice = Number(v.row('purchase_price').value)
  const yearly: YearlyCosts = {
    fuel: totalHours * fuelBurn * fuelPrice,
    maintenance: totalHours * maintenancePerHour,
    engineReserve: totalHours * reservePerHour,
    landingAndHandling: landings * rates.landing,
    fuelStopFees: fuelStopsPerYear * rates.fuelStopFee,
    parking: nightsAway * rates.parking,
    pilotTravel: nightsAway * PILOTS_PER_TRIP * rates.hotel,
    pilots: pilots * v.num('pilot_salary_average') * (1 + v.num('benefits_share') / 100),
    pilotTraining: pilots * v.num('pilot_training'),
    hangar: v.num('hangar'),
    insurance: (v.num('insurance_hull_rate') / 100) * typicalPrice + v.num('insurance_liability'),
    managementFee: v.num('management_fee'),
    otherFixed: v.num('other_fixed'),
    charterCertificate: charterHours > 0 ? v.num('charter_certificate_costs') : 0,
  }
  const yearlyCostsTotal = Object.values(yearly).reduce((s, x) => s + x, 0)
  const charterIncome = charterHours > 0 ? charterHours * v.num('charter_rate') * (v.num('owner_charter_revenue_share') / 100) : 0

  // 4. Buying and selling
  const buyingCosts = price * (v.num('buying_costs') / 100)
  const salesTax = price * (v.num('sales_tax') / 100)
  const resaleBeforeHighHours = price * (1 - v.num('yearly_value_loss') / 100) ** YEARS
  const extraHours = Math.max(0, totalHours - v.num('typical_yearly_hours')) * YEARS
  const highHoursLoss = resaleBeforeHighHours * (v.num('extra_value_loss_per_1000_hours') / 100) * (extraHours / 1000)
  const resale = resaleBeforeHighHours - highHoursLoss
  const sellingCosts = resale * (v.num('selling_costs') / 100)
  const valueLost = price + buyingCosts + salesTax - (resale - sellingCosts)
  const purchase: Purchase = { price, buyingCosts, salesTax, resaleBeforeHighHours, extraHours, highHoursLoss, resale, sellingCosts, valueLost }

  // 5. The three numbers
  const yearlyOutOfPocket = yearlyCostsTotal - charterIncome
  const fiveYearTotal = valueLost + YEARS * yearlyOutOfPocket
  const costPerHour = ownerHours > 0 ? fiveYearTotal / (YEARS * ownerHours) : null

  return {
    plans,
    ownerHours,
    emptyHours,
    charterHoursRequested,
    charterHours,
    maxCharterHours,
    charterLimited,
    totalHours,
    daysOutOfService,
    ownerDays,
    pilots,
    nightsAway,
    landings,
    fuelStopsPerYear,
    yearly,
    yearlyCostsTotal,
    charterIncome,
    purchase,
    fiveYearTotal,
    yearlyOutOfPocket,
    costPerHour,
  }
}

// ---------------------------------------------------------------------------
// Fit checks
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

function airportLabel(a: Airport) {
  return a.municipality ? `${a.municipality} (${a.code})` : `${a.name} (${a.code})`
}

function fitReasons(inputs: ScenarioInputs, req: EffectiveRequirements, v: JetValues, tripsNeedingStop: number, airports: Map<string, Airport>): string[] {
  const reasons: string[] = []
  const seats = v.num('seats')
  if (seats < req.seats) reasons.push(`Seats ${seats}, you need ${req.seats}`)
  const bag = v.num('bag_space')
  if (bag < req.bagSpaceCuFt) reasons.push(`Bag space ${fmt(bag)} cubic feet, you need ${fmt(req.bagSpaceCuFt)} (${req.bags} bags)`)
  if (req.runwayCheck) {
    const takeoff = v.num('takeoff_distance')
    const idents = new Set([inputs.homeBase, ...inputs.trips.flatMap((t) => [t.from, t.to])])
    for (const id of idents) {
      const a = airports.get(id)
      if (a?.longest_runway_ft != null && a.longest_runway_ft < takeoff) {
        reasons.push(`Cannot take off from ${airportLabel(a)} (needs ${fmt(takeoff)} ft, longest runway ${fmt(a.longest_runway_ft)} ft)`)
      }
    }
  }
  if (req.maxFuelStopTrips != null && tripsNeedingStop > req.maxFuelStopTrips) {
    reasons.push(`${tripsNeedingStop} trips a year need a fuel stop, you allow ${req.maxFuelStopTrips}`)
  }
  if (req.standUpCabin && !v.yes('stand_up_cabin')) reasons.push(`No stand-up cabin (cabin height ${fmt(v.num('cabin_height'))} inches)`)
  if (req.flatFloor && !v.yes('flat_floor')) reasons.push('No flat floor')
  if (req.enclosedLavatory && !v.yes('enclosed_lavatory')) reasons.push('No enclosed lavatory')
  return reasons
}

// ---------------------------------------------------------------------------
// Everything for one jet: typical, low, high, biggest driver
// ---------------------------------------------------------------------------

export function evaluateJet(inputs: ScenarioInputs, jet: Jet, rows: Map<string, EffectiveRow>, airports: Map<string, Airport>, req: EffectiveRequirements): JetResult {
  const margin = req.rangeMarginPct
  const typicalValues = new JetValues(rows, jet)
  const typical = calculateJet(inputs, typicalValues, airports, margin)
  const run = (ends: Record<string, End>) => calculateJet(inputs, new JetValues(rows, jet, ends), airports, margin)

  // 6. Each range assumption alone at its low and its high; the favorable end is whichever gives the lower total.
  const favorable: Record<string, End> = {}
  const unfavorable: Record<string, End> = {}
  let biggestDriver: Driver | null = null
  for (const key of RANGE_KEYS) {
    if (!typicalValues.range(key)) continue
    const atLow = run({ [key]: 'low' }).fiveYearTotal
    const atHigh = run({ [key]: 'high' }).fiveYearTotal
    const difference = Math.abs(atHigh - atLow)
    if (difference < 0.5) continue // makes no difference here, e.g. charter rate with no charter hours
    favorable[key] = atLow <= atHigh ? 'low' : 'high'
    unfavorable[key] = atLow <= atHigh ? 'high' : 'low'
    if (!biggestDriver || difference > biggestDriver.difference) {
      const id = typicalValues.idFor(key)
      biggestDriver = { assumptionId: id, item: rows.get(id)!.item, totalAtLow: atLow, totalAtHigh: atHigh, difference }
    }
  }
  const low = run(favorable)
  const high = run(unfavorable)

  const tripsTotal = typical.plans.reduce((s, p) => s + p.timesPerYear, 0)
  const tripsNeedingFuelStop = typical.plans.reduce(
    (s, p) => s + (p.legs.some((l) => l.kind === 'passengers' && l.fuelStops > 0) ? p.timesPerYear : 0),
    0,
  )
  const reasons = fitReasons(inputs, req, typicalValues, tripsNeedingFuelStop, airports)

  const y = typical.yearly
  const breakdown: Breakdown = {
    valueLost: typical.purchase.valueLost,
    fuel: YEARS * y.fuel,
    maintenance: YEARS * (y.maintenance + y.engineReserve),
    pilotsAndOther: YEARS * (typical.yearlyCostsTotal - y.fuel - y.maintenance - y.engineReserve),
    charterIncome: YEARS * typical.charterIncome,
  }

  const confidence = { High: 0, Medium: 0, Low: 0, count: 0 }
  for (const id of typicalValues.used) {
    confidence[rows.get(id)!.confidence]++
    confidence.count++
  }

  const sourceIds: Record<string, string> = {}
  for (const key of ['purchase_price', 'seats', 'cabin_height', 'cabin_width', 'bag_space', 'cruise_speed', 'range_4_pax', 'fuel_burn', 'maintenance_per_hour', 'yearly_value_loss', 'fuel_price', 'charter_rate']) {
    sourceIds[key] = typicalValues.idFor(key)
  }

  return {
    jet,
    fits: reasons.length === 0,
    reasons,
    tripsNonstop: tripsTotal - tripsNeedingFuelStop,
    tripsTotal,
    tripsNeedingFuelStop,
    typical,
    fiveYearTotal: { typical: typical.fiveYearTotal, low: low.fiveYearTotal, high: high.fiveYearTotal },
    yearlyOutOfPocket: { typical: typical.yearlyOutOfPocket, low: low.yearlyOutOfPocket, high: high.yearlyOutOfPocket },
    costPerHour: { typical: typical.costPerHour, low: low.costPerHour, high: high.costPerHour },
    breakdown,
    biggestDriver,
    confidence,
    usedAssumptions: [...typicalValues.used],
    specs: {
      seats: typicalValues.num('seats'),
      cabinHeightIn: typicalValues.num('cabin_height'),
      cabinWidthIn: typicalValues.num('cabin_width'),
      bagSpaceCuFt: typicalValues.num('bag_space'),
      cruiseSpeedKt: typicalValues.num('cruise_speed'),
      rangeNm: typicalValues.num('range_4_pax'),
      purchasePrice: typicalValues.num('purchase_price'),
    },
    sourceIds,
  }
}

/** Runs the whole engine for a scenario. */
export function calculate(inputs: ScenarioInputs, changes: Changes, data: EngineData): Results {
  const rows = applyChanges(data.assumptions, changes)
  const req = effectiveRequirements(inputs, rows)
  const warnings: string[] = []

  const known = (id: string) => data.airports.has(id)
  const usable = { ...inputs, trips: inputs.trips.filter((t) => known(t.from) && known(t.to) && t.timesPerYear > 0) }
  if (!known(inputs.homeBase)) return { requirements: req, fitting: [], notFitting: [], warnings: ['Choose a home base airport.'] }
  const skipped = inputs.trips.length - usable.trips.length
  if (skipped > 0) warnings.push(`${skipped} trip${skipped > 1 ? 's are' : ' is'} missing an airport or times per year and ${skipped > 1 ? 'are' : 'is'} not counted.`)

  const results = data.jets.map((jet) => evaluateJet(usable, jet, rows, data.airports, req))
  const fitting = results.filter((r) => r.fits).sort((a, b) => a.fiveYearTotal.typical - b.fiveYearTotal.typical)
  const notFitting = results.filter((r) => !r.fits).sort((a, b) => a.jet.sort_order - b.jet.sort_order)
  return { requirements: req, fitting, notFitting, warnings }
}
