import { describe, expect, it } from 'vitest'
import { countUnparsed, formatNoteText, parseNoteText } from '@/utils/noteText'

describe('typed note shorthand', () => {
  it('reads bare letters in the default octave', () => {
    expect(parseNoteText('c d e')).toEqual([{ note: 'C5' }, { note: 'D5' }, { note: 'E5' }])
  })

  it('carries the octave forward from the last explicit one', () => {
    expect(parseNoteText('a4 b')).toEqual([{ note: 'A4' }, { note: 'B4' }])
    expect(parseNoteText('c6 d e')).toEqual([{ note: 'C6' }, { note: 'D6' }, { note: 'E6' }])
    // C4 is below the instrument, so the carry produces nothing rather than a wrong note.
    expect(parseNoteText('a4 b c')).toEqual([{ note: 'A4' }, { note: 'B4' }])
  })

  it('spells sharps as the table spells them', () => {
    // The fingering table is flat-first, so F#5 has to land on Gb5.
    expect(parseNoteText('f#5 bb4 db6')).toEqual([
      { note: 'Gb5' },
      { note: 'Bb4' },
      { note: 'Db6' },
    ])
  })

  it('reads rests, note values and dots', () => {
    expect(parseNoteText('c/4 r/8 f5/16.')).toEqual([
      { note: 'C5', dur: 4 },
      { note: null, dur: 8 },
      { note: 'F5', dur: 16, dotted: true },
    ])
  })

  it('drops what it cannot read instead of throwing', () => {
    expect(parseNoteText('c banana h9 d')).toEqual([{ note: 'C5' }, { note: 'D5' }])
    expect(countUnparsed('c banana h9 d')).toBe(2)
  })

  it('round-trips through the formatter', () => {
    const text = 'C5 D5/4 r/8 Gb5/16.'
    expect(formatNoteText(parseNoteText(text))).toBe(text)
  })
})
