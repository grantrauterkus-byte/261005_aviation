import type { AssumptionRow, Changes, Jet } from './types.ts'

/** A row with the user's change applied. A changed value replaces the low and high too. */
export interface EffectiveRow extends AssumptionRow {
  original: string
  changed: boolean
}

export function applyChanges(rows: AssumptionRow[], changes: Changes): Map<string, EffectiveRow> {
  const out = new Map<string, EffectiveRow>()
  for (const r of rows) {
    const c = changes[r.id]
    const changed = c !== undefined && c !== '' && c !== r.value
    out.set(r.id, changed ? { ...r, value: c, low: c, high: c, original: r.value, changed } : { ...r, original: r.value, changed })
  }
  return out
}

export function classPrefix(cls: Jet['class']) {
  return cls === 'Midsize' ? 'midsize' : 'super-midsize'
}

/** Which end of an assumption's range to use. */
export type End = 'value' | 'low' | 'high'

/**
 * Looks up values for one jet: its own row first, then its class row, then the row for all jets.
 * Records every row it reads, so the card can show the confidence of the numbers behind it.
 */
export class JetValues {
  readonly used = new Set<string>()
  private readonly rows: Map<string, EffectiveRow>
  private readonly jet: Jet
  private readonly ends: Record<string, End>

  constructor(rows: Map<string, EffectiveRow>, jet: Jet, ends: Record<string, End> = {}) {
    this.rows = rows
    this.jet = jet
    this.ends = ends
  }

  /** The id of the row that supplies this item for this jet. */
  idFor(key: string): string {
    for (const prefix of [this.jet.id, classPrefix(this.jet.class), 'all']) {
      const id = `${prefix}.${key}`
      if (this.rows.has(id)) return id
    }
    throw new Error(`No assumption for "${key}" for ${this.jet.name}`)
  }

  row(key: string): EffectiveRow {
    const id = this.idFor(key)
    this.used.add(id)
    return this.rows.get(id)!
  }

  /** A number, at the end requested for this item (typical unless set otherwise). Falls back to typical if the end is blank. */
  num(key: string): number {
    const r = this.row(key)
    const end = this.ends[key] ?? 'value'
    const raw = end === 'value' ? r.value : (r[end] ?? r.value)
    const n = Number(raw === '' ? r.value : raw)
    if (!Number.isFinite(n)) throw new Error(`Assumption ${r.id} is not a number: "${raw}"`)
    return n
  }

  yes(key: string): boolean {
    return this.row(key).value.trim().toLowerCase() === 'yes'
  }

  /** Low and high as numbers, or null if the row has no range. */
  range(key: string): { low: number; high: number } | null {
    const r = this.rows.get(this.idFor(key))!
    if (r.low == null || r.high == null || r.low === '' || r.high === '') return null
    const low = Number(r.low)
    const high = Number(r.high)
    if (!Number.isFinite(low) || !Number.isFinite(high) || low === high) return null
    return { low, high }
  }
}
