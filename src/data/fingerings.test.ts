import { describe, expect, it } from 'vitest'
import { ALL_NOTES, FINGERINGS, NOTE_ORDER, isNatural, usesSubholes } from '@/data/fingerings'
import type { HoleId, NoteId } from '@/types'

/**
 * Transcribed independently from the PRD §4 table so a typo in fingerings.ts
 * cannot agree with itself. `covered` = sealed holes; everything else is open.
 */
const ALL_12: HoleId[] = [
  'lhIndex',
  'lhMiddle',
  'lhRing',
  'lhPinky',
  'rhIndex',
  'rhMiddle',
  'rhRing',
  'rhPinky',
  'lhThumb',
  'rhThumb',
  'subA',
  'subB',
]

const EXPECTED: Record<NoteId, HoleId[]> = {
  A4: ALL_12,
  Bb4: ALL_12.filter((h) => h !== 'subB'),
  B4: ALL_12.filter((h) => h !== 'subA'),
  C5: ALL_12.filter((h) => h !== 'subA' && h !== 'subB'),
  Db5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'rhIndex', 'rhMiddle', 'rhRing', 'lhThumb', 'rhThumb', 'subB'],
  D5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'rhIndex', 'rhMiddle', 'rhRing', 'lhThumb', 'rhThumb'],
  Eb5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'rhIndex', 'rhMiddle', 'lhThumb', 'rhThumb', 'subB'],
  E5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'rhIndex', 'rhMiddle', 'lhThumb', 'rhThumb'],
  F5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'rhIndex', 'lhThumb', 'rhThumb'],
  Gb5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'lhThumb', 'rhThumb', 'rhRing'],
  G5: ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky', 'lhThumb', 'rhThumb'],
  Ab5: ['lhIndex', 'lhMiddle', 'lhPinky', 'lhThumb', 'rhThumb', 'rhRing'],
  A5: ['lhIndex', 'lhMiddle', 'lhPinky', 'lhThumb', 'rhThumb'],
  Bb5: ['lhIndex', 'lhPinky', 'lhThumb', 'rhThumb', 'rhRing'],
  B5: ['lhIndex', 'lhPinky', 'lhThumb', 'rhThumb'],
  C6: ['lhPinky', 'lhThumb', 'rhThumb'],
  Db6: ['lhPinky', 'rhThumb', 'rhRing'],
  D6: ['lhPinky', 'rhThumb'],
  Eb6: ['lhPinky', 'rhRing'],
  E6: ['lhPinky'],
  F6: [],
}

const sorted = (holes: HoleId[]) => [...holes].sort()

describe('fingering table', () => {
  it('covers all 21 notes, A4 to F6, in order', () => {
    expect(NOTE_ORDER).toHaveLength(21)
    expect(NOTE_ORDER[0]).toBe('A4')
    expect(NOTE_ORDER.at(-1)).toBe('F6')
    expect(new Set(NOTE_ORDER).size).toBe(21)
    expect(ALL_NOTES.map((n) => n.id)).toEqual(NOTE_ORDER)
  })

  it.each(NOTE_ORDER)('%s matches the published chart', (id) => {
    expect(sorted(FINGERINGS[id].covered)).toEqual(sorted(EXPECTED[id]))
  })

  it('gets lower as more holes are covered', () => {
    const counts = NOTE_ORDER.map((id) => FINGERINGS[id].covered.length)
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    }
  })

  // The chart also calls for subB on C♯5 and D♯5, so "bottom three" is not the
  // whole story — the diagram dims sub-holes wherever they are genuinely unused.
  it('uses sub-holes only where the chart calls for them', () => {
    expect(NOTE_ORDER.filter(usesSubholes)).toEqual(['A4', 'Bb4', 'B4', 'Db5', 'Eb5'])
  })

  it('keeps the left pinky down until the very top note', () => {
    const lifted = NOTE_ORDER.filter((id) => !FINGERINGS[id].covered.includes('lhPinky'))
    expect(lifted).toEqual(['F6'])
  })

  it('flags the maker-variation accidentals', () => {
    expect(FINGERINGS.Db6.note).toBeTruthy()
    expect(FINGERINGS.Eb6.note).toBeTruthy()
  })

  it('treats accidentals as non-naturals for the reference filter', () => {
    expect(NOTE_ORDER.filter(isNatural)).toEqual([
      'A4',
      'B4',
      'C5',
      'D5',
      'E5',
      'F5',
      'G5',
      'A5',
      'B5',
      'C6',
      'D6',
      'E6',
      'F6',
    ])
  })
})
