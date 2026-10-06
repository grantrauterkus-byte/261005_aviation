/** Number formatting for people: plain words, no abbreviations. */

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'Not available'
  const sign = n < 0 ? '−' : ''
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)} million`
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`
}

/** A low–high range in the same style, sharing the unit word: "$9.00–11.70 million". */
export function moneyRange(low: number | null, high: number | null): string {
  if (low == null || high == null) return ''
  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  if (Math.round(lo) === Math.round(hi)) return ''
  if (lo >= 1_000_000) return `$${(lo / 1_000_000).toFixed(2)}–${(hi / 1_000_000).toFixed(2)} million`
  return `$${Math.round(lo).toLocaleString('en-US')}–${Math.round(hi).toLocaleString('en-US')}`
}

export function num(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function feetInches(inches: number): string {
  const ft = Math.floor(inches / 12)
  const inch = Math.round(inches - ft * 12)
  return inch ? `${ft} ft ${inch} in` : `${ft} ft`
}

/** Shows a stored assumption value with thousands separators where it is a number. */
export function rawValue(v: string | null): string {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n) || v.trim() === '') return v
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}
