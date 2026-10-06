import type { FitReason, JetResult } from '../engine/index.ts'
import { feetInches, num } from '../lib/format.ts'

/** How a value compares: good (best third), low (lowest third), fail (does not meet a need), plain (middle or not ranked). */
export type Tone = 'good' | 'plain' | 'low' | 'fail'

export type ColumnKey =
  | 'total'
  | 'yearly'
  | 'perHour'
  | 'price'
  | 'valueLost'
  | 'crew'
  | 'fixed'
  | 'fuel'
  | 'maintenance'
  | 'tripFees'
  | 'charterIncome'
  | 'nonstop'
  | 'stops'
  | 'range'
  | 'seats'
  | 'cabinHeight'
  | 'cabinWidth'
  | 'cabinLength'
  | 'bags'
  | 'standUp'
  | 'flatFloor'
  | 'lavatory'
  | 'speed'
  | 'takeoff'
  | 'confidence'

export interface Column {
  key: ColumnKey
  group: 'Cost' | 'Cost parts, 5 years' | 'Trips' | 'Cabin' | 'Performance' | 'Data'
  label: string
  unit?: string // shown in the matrix header; cells then show only the number
  better: 'lower' | 'higher' | 'yes'
  /** A number to rank and sort by (booleans: 1 yes, 0 no). */
  value: (r: JetResult) => number
  /** Matrix cell text. */
  cell: (r: JetResult, diffFrom?: number) => string
  /** Chip text (label is shown separately). */
  chip: (r: JetResult) => string
  /** Library row behind the value, or null for calculated values. */
  source: (r: JetResult) => string | null
  /** Cost part shown as difference from the cheapest when that view is on. */
  diffable?: boolean
}

export const confidenceShare = (r: JetResult) => {
  const c = r.confidence
  const pct = (n: number) => Math.round((100 * n) / Math.max(1, c.count))
  return { high: pct(c.High), medium: pct(c.Medium), low: pct(c.Low) }
}

const millions = (n: number) => (n / 1_000_000).toFixed(2)
const signedMillions = (n: number) => `${n > 0.005e6 ? '+' : n < -0.005e6 ? '−' : ''}${(Math.abs(n) / 1_000_000).toFixed(2)}`
const dollars = (n: number) => Math.round(n).toLocaleString('en-US')
const yesNo = (b: boolean) => (b ? 'Yes' : 'No')
const moneyChip = (n: number) => (Math.abs(n) >= 1_000_000 ? `$${millions(n)} million` : `$${dollars(n)}`)

function costPart(key: ColumnKey, label: string, part: keyof JetResult['breakdown'], sourceKey: string | null, better: 'lower' | 'higher' = 'lower'): Column {
  return {
    key,
    group: 'Cost parts, 5 years',
    label,
    unit: '$ million',
    better,
    diffable: true,
    value: (r) => r.breakdown[part],
    cell: (r, base) => (base == null ? millions(r.breakdown[part]) : signedMillions(r.breakdown[part] - base)),
    chip: (r) => moneyChip(r.breakdown[part]),
    source: (r) => (sourceKey ? r.sourceIds[sourceKey] : null),
  }
}

/** Every element of a plane, in the order the matrix shows them. */
export const COLUMNS: Column[] = [
  {
    key: 'total',
    group: 'Cost',
    label: '5-year total',
    unit: '$ million',
    better: 'lower',
    value: (r) => r.fiveYearTotal.typical,
    cell: (r) => millions(r.fiveYearTotal.typical),
    chip: (r) => moneyChip(r.fiveYearTotal.typical),
    source: () => null,
  },
  {
    key: 'yearly',
    group: 'Cost',
    label: 'Yearly out of pocket',
    unit: '$ million',
    better: 'lower',
    value: (r) => r.yearlyOutOfPocket.typical,
    cell: (r) => millions(r.yearlyOutOfPocket.typical),
    chip: (r) => moneyChip(r.yearlyOutOfPocket.typical),
    source: () => null,
  },
  {
    key: 'perHour',
    group: 'Cost',
    label: 'Per hour you fly',
    unit: '$',
    better: 'lower',
    value: (r) => r.costPerHour.typical ?? Infinity,
    cell: (r) => (r.costPerHour.typical == null ? '–' : dollars(r.costPerHour.typical)),
    chip: (r) => (r.costPerHour.typical == null ? '–' : `$${dollars(r.costPerHour.typical)}`),
    source: () => null,
  },
  {
    key: 'price',
    group: 'Cost',
    label: 'Purchase price',
    unit: '$ million',
    better: 'lower',
    value: (r) => r.specs.purchasePrice,
    cell: (r) => millions(r.specs.purchasePrice),
    chip: (r) => moneyChip(r.specs.purchasePrice),
    source: (r) => r.sourceIds.purchase_price,
  },
  costPart('valueLost', 'Value lost', 'valueLost', 'yearly_value_loss'),
  costPart('crew', 'Crew', 'crew', 'pilot_salary_average'),
  costPart('fixed', 'Fixed costs', 'fixed', 'hangar'),
  costPart('fuel', 'Fuel', 'fuel', 'fuel_burn'),
  costPart('maintenance', 'Maintenance', 'maintenance', 'maintenance_per_hour'),
  costPart('tripFees', 'Trip fees', 'tripFees', 'landing_handling_fee'),
  costPart('charterIncome', 'Charter income', 'charterIncome', 'charter_rate', 'higher'),
  {
    key: 'nonstop',
    group: 'Trips',
    label: 'Nonstop trips',
    better: 'higher',
    value: (r) => (r.tripsTotal ? r.tripsNonstop / r.tripsTotal : 1),
    cell: (r) => `${r.tripsNonstop} / ${r.tripsTotal}`,
    chip: (r) => `${r.tripsNonstop} of ${r.tripsTotal}`,
    source: (r) => r.sourceIds.range_4_pax,
  },
  {
    key: 'stops',
    group: 'Trips',
    label: 'Fuel stops a year',
    better: 'lower',
    value: (r) => r.typical.fuelStopsPerYear,
    cell: (r) => num(r.typical.fuelStopsPerYear),
    chip: (r) => num(r.typical.fuelStopsPerYear),
    source: (r) => r.sourceIds.range_4_pax,
  },
  {
    key: 'range',
    group: 'Trips',
    label: 'Range',
    unit: 'nautical miles',
    better: 'higher',
    value: (r) => r.specs.rangeNm,
    cell: (r) => num(r.specs.rangeNm),
    chip: (r) => `${num(r.specs.rangeNm)} nautical miles`,
    source: (r) => r.sourceIds.range_4_pax,
  },
  {
    key: 'seats',
    group: 'Cabin',
    label: 'Seats',
    better: 'higher',
    value: (r) => r.specs.seats,
    cell: (r) => num(r.specs.seats),
    chip: (r) => num(r.specs.seats),
    source: (r) => r.sourceIds.seats,
  },
  {
    key: 'cabinHeight',
    group: 'Cabin',
    label: 'Cabin height',
    better: 'higher',
    value: (r) => r.specs.cabinHeightIn,
    cell: (r) => feetInches(r.specs.cabinHeightIn),
    chip: (r) => feetInches(r.specs.cabinHeightIn),
    source: (r) => r.sourceIds.cabin_height,
  },
  {
    key: 'cabinWidth',
    group: 'Cabin',
    label: 'Cabin width',
    better: 'higher',
    value: (r) => r.specs.cabinWidthIn,
    cell: (r) => feetInches(r.specs.cabinWidthIn),
    chip: (r) => feetInches(r.specs.cabinWidthIn),
    source: (r) => r.sourceIds.cabin_width,
  },
  {
    key: 'cabinLength',
    group: 'Cabin',
    label: 'Cabin length',
    better: 'higher',
    value: (r) => r.specs.cabinLengthIn,
    cell: (r) => feetInches(r.specs.cabinLengthIn),
    chip: (r) => feetInches(r.specs.cabinLengthIn),
    source: (r) => r.sourceIds.cabin_length,
  },
  {
    key: 'bags',
    group: 'Cabin',
    label: 'Bag space',
    unit: 'cubic feet',
    better: 'higher',
    value: (r) => r.specs.bagSpaceCuFt,
    cell: (r) => num(r.specs.bagSpaceCuFt),
    chip: (r) => `${num(r.specs.bagSpaceCuFt)} cubic feet`,
    source: (r) => r.sourceIds.bag_space,
  },
  {
    key: 'standUp',
    group: 'Cabin',
    label: 'Stand-up cabin',
    better: 'yes',
    value: (r) => (r.specs.standUpCabin ? 1 : 0),
    cell: (r) => yesNo(r.specs.standUpCabin),
    chip: (r) => yesNo(r.specs.standUpCabin),
    source: (r) => r.sourceIds.stand_up_cabin,
  },
  {
    key: 'flatFloor',
    group: 'Cabin',
    label: 'Flat floor',
    better: 'yes',
    value: (r) => (r.specs.flatFloor ? 1 : 0),
    cell: (r) => yesNo(r.specs.flatFloor),
    chip: (r) => yesNo(r.specs.flatFloor),
    source: (r) => r.sourceIds.flat_floor,
  },
  {
    key: 'lavatory',
    group: 'Cabin',
    label: 'Enclosed lavatory',
    better: 'yes',
    value: (r) => (r.specs.enclosedLavatory ? 1 : 0),
    cell: (r) => yesNo(r.specs.enclosedLavatory),
    chip: (r) => yesNo(r.specs.enclosedLavatory),
    source: (r) => r.sourceIds.enclosed_lavatory,
  },
  {
    key: 'speed',
    group: 'Performance',
    label: 'Cruise speed',
    unit: 'knots',
    better: 'higher',
    value: (r) => r.specs.cruiseSpeedKt,
    cell: (r) => num(r.specs.cruiseSpeedKt),
    chip: (r) => `${num(r.specs.cruiseSpeedKt)} knots`,
    source: (r) => r.sourceIds.cruise_speed,
  },
  {
    key: 'takeoff',
    group: 'Performance',
    label: 'Takeoff distance',
    unit: 'feet',
    better: 'lower',
    value: (r) => r.specs.takeoffFt,
    cell: (r) => num(r.specs.takeoffFt),
    chip: (r) => `${num(r.specs.takeoffFt)} ft`,
    source: (r) => r.sourceIds.takeoff_distance,
  },
  {
    key: 'confidence',
    group: 'Data',
    label: 'Data confidence',
    unit: '% High · Medium · Low',
    better: 'higher',
    value: (r) => {
      const s = confidenceShare(r)
      return s.high * 2 + s.medium
    },
    cell: (r) => {
      const s = confidenceShare(r)
      return `${s.high} · ${s.medium} · ${s.low}`
    },
    chip: (r) => {
      const s = confidenceShare(r)
      return s.low >= 50 ? `Mostly Low ${s.low}%` : s.high >= 50 ? `Mostly High ${s.high}%` : `Medium or better ${s.high + s.medium}%`
    },
    source: () => null,
  },
]

export const COLUMN = Object.fromEntries(COLUMNS.map((c) => [c.key, c])) as Record<ColumnKey, Column>

/** Which column a "does not fit" reason belongs to. */
export const REASON_COLUMN: Record<FitReason['key'], ColumnKey> = {
  seats: 'seats',
  bags: 'bags',
  runway: 'takeoff',
  fuelStops: 'nonstop',
  standUpCabin: 'standUp',
  flatFloor: 'flatFloor',
  enclosedLavatory: 'lavatory',
}

/**
 * Where each jet sits in each column, from 0 (worst) to 1 (best), compared with the jets that fit
 * (all jets when fewer than two fit). Jets outside that range are clamped to 0 or 1.
 * Used for the matrix shading and the chip colors.
 */
export function positions(results: JetResult[]): Map<string, Partial<Record<ColumnKey, number>>> {
  const out = new Map<string, Partial<Record<ColumnKey, number>>>(results.map((r) => [r.jet.id, {}]))
  const fitting = results.filter((r) => r.fits)
  const compareWith = fitting.length >= 2 ? fitting : results
  for (const c of COLUMNS) {
    const vals = compareWith.map((r) => c.value(r)).filter(Number.isFinite)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    for (const r of results) {
      const v = c.value(r)
      let t: number
      if (!Number.isFinite(v)) t = 0
      else if (max === min) t = 0.5
      else t = Math.min(1, Math.max(0, (v - min) / (max - min)))
      if (c.better === 'lower') t = 1 - t
      out.get(r.jet.id)![c.key] = c.better === 'yes' ? (v ? 1 : 0) : t
    }
  }
  return out
}

export function failingColumns(r: JetResult): Set<ColumnKey> {
  return new Set(r.reasons.map((x) => REASON_COLUMN[x.key]))
}

/** Chip color: fail if it breaks a need; otherwise best third green, lowest third amber. Yes/no: yes green, no plain. */
export function toneFor(c: Column, t: number | undefined, failing: boolean, r?: JetResult): Tone {
  if (failing) return 'fail'
  if (c.key === 'confidence' && r) {
    // Confidence is colored by its own level, not by comparison: mostly Low is amber, mostly High is green.
    const s = confidenceShare(r)
    return s.low >= 50 ? 'low' : s.high >= 50 ? 'good' : 'plain'
  }
  if (t == null) return 'plain'
  if (c.better === 'yes') return t >= 1 ? 'good' : 'plain'
  if (t >= 2 / 3) return 'good'
  if (t <= 1 / 3) return 'low'
  return 'plain'
}
