import type { Tone } from './columns.ts'

const TONE_WORD: Record<Tone, string> = { good: 'among the best', plain: '', low: 'among the lowest', fail: 'does not meet your need' }

/** A labeled chip: the label in plain text, then the value. The color adds to the words, never replaces them. */
export function Chip({ label, value, tone = 'plain', onClick }: { label: string; value: string; tone?: Tone; onClick?: () => void }) {
  const title = TONE_WORD[tone] ? `${label}: ${value} (${TONE_WORD[tone]})` : `${label}: ${value}`
  const body = (
    <>
      <span className="chip-k">{label}</span>
      <span className="chip-v">{value}</span>
    </>
  )
  return onClick ? (
    <button type="button" className={`chip tone-${tone}`} title={title} onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={`chip tone-${tone}`} title={title}>
      {body}
    </span>
  )
}

/** The small key that explains the chip and cell colors. */
export function ToneKey() {
  return (
    <div className="tone-key" aria-label="Color key">
      <span>
        <i className="tone-good" /> Best third
      </span>
      <span>
        <i className="tone-low" /> Lowest third
      </span>
      <span>
        <i className="tone-fail" /> Fails a need
      </span>
    </div>
  )
}
