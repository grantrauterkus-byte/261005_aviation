/** One row of the Assumptions Library, as stored in data/assumptions.csv and the assumptions table. */
export interface AssumptionRow {
  id: string
  item: string
  jet: string
  applies_to: 'Plane-specific' | 'Class-wide' | 'Same for all'
  value: string
  low: string | null
  high: string | null
  unit: string
  type: 'Measured' | 'Published' | 'Our assumption'
  source_name: string | null
  source_url: string | null
  source_date: string | null
  confidence: 'High' | 'Medium' | 'Low'
  notes: string | null
}

export type JetClass = 'Midsize' | 'Super-midsize'

export interface Jet {
  id: string // e.g. 'challenger-300'
  name: string
  class: JetClass
  sort_order: number
  most_sold_build_years: string
}

export interface Airport {
  ident: string // e.g. 'KTEB'
  code: string // e.g. 'TEB'
  name: string
  municipality: string | null
  latitude: number
  longitude: number
  longest_runway_ft: number | null
}

export interface Trip {
  id: string
  from: string // airport ident
  to: string // airport ident
  passengers: number
  bags: number
  roundTrip: boolean
  daysAtDestination: number // round trips only; 0 means same-day return
  timesPerYear: number
}

export interface Requirements {
  seats: number | null // null: the most passengers on any trip
  bags: number | null // null: the most bags on any trip
  runwayCheck: boolean
  rangeMarginPct: number
  maxFuelStopTrips: number | null // null: no limit
  standUpCabin: boolean
  flatFloor: boolean
  enclosedLavatory: boolean
}

export interface ScenarioInputs {
  homeBase: string // airport ident
  trips: Trip[]
  requirements: Requirements
  charterHours: number
}

/** The user's changed values, by assumption id. */
export type Changes = Record<string, string>

export interface Range {
  typical: number
  low: number
  high: number
}

export type LegKind = 'passengers' | 'empty'

export interface Leg {
  from: string
  to: string
  kind: LegKind
  distanceNm: number
  fuelStops: number
  hours: number
}

export interface TripPlan {
  tripId: string
  distanceNm: number // between the trip's two airports
  fuelStopsEachWay: number
  /** For round trips with days at the destination: whether the jet waits or flies home empty and returns. */
  choice: 'wait' | 'fly home empty' | null
  waitCost: number | null
  flyHomeCost: number | null
  legs: Leg[] // one occurrence of the trip
  nightsAway: number // per occurrence, pilots away from home
  ownerDays: number // per occurrence
  timesPerYear: number
}

export interface YearlyCosts {
  fuel: number
  maintenance: number
  engineReserve: number
  landingAndHandling: number
  fuelStopFees: number
  parking: number
  pilotTravel: number
  pilots: number
  pilotTraining: number
  hangar: number
  insurance: number
  managementFee: number
  otherFixed: number
  charterCertificate: number
}

export interface Purchase {
  price: number
  buyingCosts: number
  salesTax: number
  resaleBeforeHighHours: number
  extraHours: number // over 5 years, above a typical owner's
  highHoursLoss: number
  resale: number
  sellingCosts: number
  valueLost: number
}

/** One full calculation for one jet with one set of values (typical, low or high). */
export interface Calculation {
  plans: TripPlan[]
  ownerHours: number
  emptyHours: number
  charterHoursRequested: number
  charterHours: number
  maxCharterHours: number
  charterLimited: boolean
  totalHours: number
  daysOutOfService: number
  ownerDays: number
  pilots: number
  nightsAway: number
  landings: number
  fuelStopsPerYear: number
  yearly: YearlyCosts
  yearlyCostsTotal: number
  charterIncome: number
  purchase: Purchase
  fiveYearTotal: number
  yearlyOutOfPocket: number
  costPerHour: number | null
}

export interface Driver {
  assumptionId: string
  item: string
  totalAtLow: number
  totalAtHigh: number
  difference: number
}

export interface Breakdown {
  valueLost: number
  pilotsAndOther: number
  fuel: number
  maintenance: number
  charterIncome: number // a reduction, stored as a positive amount
}

export interface JetResult {
  jet: Jet
  fits: boolean
  reasons: string[]
  tripsNonstop: number
  tripsTotal: number
  tripsNeedingFuelStop: number
  typical: Calculation
  fiveYearTotal: Range
  yearlyOutOfPocket: Range
  costPerHour: { typical: number | null; low: number | null; high: number | null }
  breakdown: Breakdown // 5-year amounts
  biggestDriver: Driver | null
  confidence: { High: number; Medium: number; Low: number; count: number }
  usedAssumptions: string[]
  specs: {
    seats: number
    cabinHeightIn: number
    cabinWidthIn: number
    bagSpaceCuFt: number
    cruiseSpeedKt: number
    rangeNm: number
    purchasePrice: number
  }
  /** Assumption id behind each scorecard value, for linking to the Library. */
  sourceIds: Record<string, string>
}

export interface EffectiveRequirements {
  seats: number
  bags: number
  bagSpaceCuFt: number
  bagSizeCuFt: number
  runwayCheck: boolean
  rangeMarginPct: number
  maxFuelStopTrips: number | null
  standUpCabin: boolean
  flatFloor: boolean
  enclosedLavatory: boolean
}

export interface Results {
  requirements: EffectiveRequirements
  fitting: JetResult[] // sorted by typical 5-year total
  notFitting: JetResult[]
  warnings: string[]
}
