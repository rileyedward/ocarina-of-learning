import type { Scale } from '@/types'
import { NOTE_ORDER } from '@/data/fingerings'

/**
 * Seed scales, all playable in full within A4–F6.
 * G major and D major are deliberately absent: their top notes fall above F6.
 */
export const SEED_SCALES: Scale[] = [
  { id: 'chromatic', name: 'Chromatic (full range)', seeded: true, notes: [...NOTE_ORDER] },
  { id: 'c-major', name: 'C major', seeded: true, notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'] },
  {
    id: 'c-major-extended',
    name: 'C major (extended)',
    seeded: true,
    notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F6'],
  },
  { id: 'f-major', name: 'F major', seeded: true, notes: ['F5', 'G5', 'A5', 'Bb5', 'C6', 'D6', 'E6', 'F6'] },
  {
    id: 'd-minor',
    name: 'D minor (natural)',
    seeded: true,
    notes: ['D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6', 'D6'],
  },
  {
    id: 'a-minor',
    name: 'A minor (natural)',
    seeded: true,
    notes: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
  },
]
