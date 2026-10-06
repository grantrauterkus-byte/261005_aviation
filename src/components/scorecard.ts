import type { JetResult } from '../engine/index.ts'
import { feetInches, money, moneyRange, num } from '../lib/format.ts'

export type SortKey = 'total' | 'yearly' | 'perHour' | 'price' | 'nonstop' | 'stops' | 'seats' | 'cabin' | 'bags' | 'speed' | 'confidence'

export interface ScorecardRow {
  key: SortKey
  label: string
  better: 'lower' | 'higher'
  sortValue: (r: JetResult) => number
  value: (r: JetResult) => string
  detail?: (r: JetResult) => string
  /** The Library row this number comes from, or null when it is calculated from many rows. */
  source: (r: JetResult) => string | null
}

export function confidenceShare(r: JetResult) {
  const c = r.confidence
  const pct = (n: number) => Math.round((100 * n) / Math.max(1, c.count))
  return { high: pct(c.High), medium: pct(c.Medium), low: pct(c.Low) }
}

/** The scorecard rows, in the order and position every card shows them (SPEC.md). */
export const SCORECARD: ScorecardRow[] = [
  {
    key: 'total',
    label: '5-year total cost',
    better: 'lower',
    sortValue: (r) => r.fiveYearTotal.typical,
    value: (r) => money(r.fiveYearTotal.typical),
    detail: (r) => {
      const range = moneyRange(r.fiveYearTotal.low, r.fiveYearTotal.high)
      return range ? `Range ${range}` : ''
    },
    source: () => null,
  },
  {
    key: 'yearly',
    label: 'Yearly out-of-pocket cost',
    better: 'lower',
    sortValue: (r) => r.yearlyOutOfPocket.typical,
    value: (r) => money(r.yearlyOutOfPocket.typical),
    detail: (r) => {
      const range = moneyRange(r.yearlyOutOfPocket.low, r.yearlyOutOfPocket.high)
      return range ? `Range ${range}` : ''
    },
    source: () => null,
  },
  {
    key: 'perHour',
    label: 'Cost per hour you fly',
    better: 'lower',
    sortValue: (r) => r.costPerHour.typical ?? Infinity,
    value: (r) => (r.costPerHour.typical == null ? 'No hours with you onboard' : money(r.costPerHour.typical)),
    detail: (r) => {
      const range = moneyRange(r.costPerHour.low, r.costPerHour.high)
      return range ? `Range ${range}` : ''
    },
    source: () => null,
  },
  {
    key: 'price',
    label: 'Purchase price',
    better: 'lower',
    sortValue: (r) => r.specs.purchasePrice,
    value: (r) => money(r.specs.purchasePrice),
    detail: (r) => `For ${r.jet.most_sold_build_years} aircraft`,
    source: (r) => r.sourceIds.purchase_price,
  },
  {
    key: 'nonstop',
    label: 'Trips flown nonstop',
    better: 'higher',
    sortValue: (r) => (r.tripsTotal ? r.tripsNonstop / r.tripsTotal : 1),
    value: (r) => `${num(r.tripsNonstop)} of ${num(r.tripsTotal)}`,
    detail: (r) => `Range ${num(r.specs.rangeNm)} nautical miles`,
    source: (r) => r.sourceIds.range_4_pax,
  },
  {
    key: 'stops',
    label: 'Fuel stops per year',
    better: 'lower',
    sortValue: (r) => r.typical.fuelStopsPerYear,
    value: (r) => num(r.typical.fuelStopsPerYear),
    detail: (r) => (r.typical.fuelStopsPerYear ? 'Including empty flights' : ''),
    source: (r) => r.sourceIds.range_4_pax,
  },
  {
    key: 'seats',
    label: 'Seats',
    better: 'higher',
    sortValue: (r) => r.specs.seats,
    value: (r) => num(r.specs.seats),
    source: (r) => r.sourceIds.seats,
  },
  {
    key: 'cabin',
    label: 'Cabin height and width',
    better: 'higher',
    sortValue: (r) => r.specs.cabinHeightIn * 1000 + r.specs.cabinWidthIn,
    value: (r) => `${feetInches(r.specs.cabinHeightIn)} high, ${feetInches(r.specs.cabinWidthIn)} wide`,
    source: (r) => r.sourceIds.cabin_height,
  },
  {
    key: 'bags',
    label: 'Bag space',
    better: 'higher',
    sortValue: (r) => r.specs.bagSpaceCuFt,
    value: (r) => `${num(r.specs.bagSpaceCuFt)} cubic feet`,
    source: (r) => r.sourceIds.bag_space,
  },
  {
    key: 'speed',
    label: 'Cruise speed',
    better: 'higher',
    sortValue: (r) => r.specs.cruiseSpeedKt,
    value: (r) => `${num(r.specs.cruiseSpeedKt)} knots`,
    source: (r) => r.sourceIds.cruise_speed,
  },
  {
    key: 'confidence',
    label: 'Data confidence',
    better: 'higher',
    sortValue: (r) => {
      const s = confidenceShare(r)
      return s.high * 2 + s.medium
    },
    value: (r) => {
      const s = confidenceShare(r)
      return `High ${s.high}% · Medium ${s.medium}% · Low ${s.low}%`
    },
    detail: (r) => `Of the ${r.confidence.count} values used for this jet`,
    source: () => null,
  },
]
