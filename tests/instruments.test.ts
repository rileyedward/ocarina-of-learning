import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INSTRUMENT_ID,
  INSTRUMENTS,
  coveredFor,
  describeFingering,
  getInstrument,
  isInstrumentId,
  notesForHoles,
  playable,
  transition,
  usesGroup,
} from '@/data/instruments'
import { FINGERINGS, NOTE_ORDER } from '@/data/fingerings'

/**
 * `tests/fingerings.test.ts` is what checks the alto C table against a second
 * transcription of a published chart. This file checks that generalising the
 * model did not disturb it, and that the derived helpers behave.
 *
 * The pendant tables are community transcriptions — they carry `verified:
 * false` and say so on screen — so what is asserted about them is structure,
 * not pitch: distinct fingerings, a covered set that only shrinks as the scale
 * rises, and holes that exist on the instrument.
 */
describe('the alto C instrument is the fingering table, unchanged', () => {
  const alto = getInstrument(DEFAULT_INSTRUMENT_ID)

  it('carries every note of the table with identical hole sets', () => {
    expect(alto.range).toEqual(NOTE_ORDER)
    for (const id of NOTE_ORDER) {
      expect(coveredFor(alto, id)).toEqual(FINGERINGS[id].covered)
    }
  })

  it('draws twelve holes and keeps the thumbs off the front', () => {
    expect(alto.holes).toHaveLength(12)
    expect(alto.holes.filter((h) => h.group === 'thumb').map((h) => h.id)).toEqual([
      'lhThumb',
      'rhThumb',
    ])
  })

  it('is the default, and unknown ids fall back to it', () => {
    expect(getInstrument(undefined).id).toBe(DEFAULT_INSTRUMENT_ID)
    expect(getInstrument('triple-chamber-99').id).toBe(DEFAULT_INSTRUMENT_ID)
    expect(isInstrumentId('pendant-6')).toBe(true)
    expect(isInstrumentId('nope')).toBe(false)
  })
})

describe('the soprano and bass share the alto fingerings', () => {
  it('differ only in the octave they sound', () => {
    const alto = getInstrument('alto-c-12')
    for (const id of ['soprano-c-12', 'bass-c-12']) {
      const other = getInstrument(id)
      expect(other.range).toEqual(alto.range)
      for (const note of alto.range) {
        expect(coveredFor(other, note)).toEqual(coveredFor(alto, note))
      }
    }
    expect(getInstrument('soprano-c-12').sounding).toBe(12)
    expect(getInstrument('bass-c-12').sounding).toBe(-12)
  })
})

describe('every instrument is internally consistent', () => {
  it('only ever names holes it draws', () => {
    for (const instrument of INSTRUMENTS) {
      const known = new Set(instrument.holes.map((h) => h.id))
      for (const note of instrument.range) {
        for (const hole of coveredFor(instrument, note)) {
          expect(known.has(hole)).toBe(true)
        }
      }
    }
  })

  it('gives no two notes the same fingering', () => {
    for (const instrument of INSTRUMENTS) {
      const seen = instrument.range.map((id) => [...coveredFor(instrument, id)].sort().join('|'))
      expect(new Set(seen).size).toBe(seen.length)
    }
  })

  it('covers fewer holes as the scale rises', () => {
    for (const instrument of INSTRUMENTS) {
      const counts = instrument.range.map((id) => coveredFor(instrument, id).length)
      for (let i = 1; i < counts.length; i += 1) {
        expect(counts[i]!).toBeLessThanOrEqual(counts[i - 1]!)
      }
    }
  })

  it('marks the pendant charts as unverified so the UI can warn', () => {
    expect(getInstrument('pendant-6').verified).toBe(false)
    expect(getInstrument('pendant-4').verified).toBe(false)
    expect(getInstrument('pendant-6').caveat).toBeTruthy()
    expect(getInstrument('alto-c-12').verified).toBe(true)
  })

  it('knows what it cannot play', () => {
    const pendant = getInstrument('pendant-4')
    expect(playable(pendant, 'C5')).toBe(true)
    expect(playable(pendant, 'F6')).toBe(false)
  })
})

describe('derived helpers', () => {
  const alto = getInstrument('alto-c-12')

  it('names which holes lift and which press between two notes', () => {
    // D5 is C5 with the right little finger lifted.
    const up = transition(alto, 'C5', 'D5')
    expect([...up.lift]).toEqual(['rhPinky'])
    expect([...up.press]).toHaveLength(0)

    const down = transition(alto, 'D5', 'C5')
    expect([...down.press]).toEqual(['rhPinky'])
    expect([...down.lift]).toHaveLength(0)
  })

  it('reports no change when there is no previous note', () => {
    const none = transition(alto, null, 'D5')
    expect(none.lift.size + none.press.size).toBe(0)
  })

  it('looks a fingering up backwards', () => {
    expect(notesForHoles(alto, coveredFor(alto, 'G5'))).toEqual(['G5'])
    expect(notesForHoles(alto, [])).toEqual(['F6'])
    expect(notesForHoles(alto, ['subA'])).toEqual([])
  })

  it('describes a fingering in words for screen readers', () => {
    expect(describeFingering(alto, 'A4', 'A4')).toBe('A4 — every hole covered.')
    expect(describeFingering(alto, 'F6', 'F6')).toBe('F6 — every hole open.')
    expect(describeFingering(alto, 'E6', 'E6')).toContain('cover left little finger')
  })

  it('knows which notes actually use the sub-holes', () => {
    expect(usesGroup(alto, 'A4', 'sub')).toBe(true)
    expect(usesGroup(alto, 'G5', 'sub')).toBe(false)
  })
})
