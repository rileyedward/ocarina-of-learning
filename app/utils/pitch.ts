import { getNote } from '@/data/fingerings'
import type { NoteId } from '@/types'

/**
 * Pitch arithmetic, kept apart from the fingering table: the table says where
 * fingers go, this says where a note sits on a staff and what to call it.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

export type LetterName = (typeof LETTERS)[number]

export interface Pitch {
  /** Base letter without the accidental. */
  letter: LetterName
  /** -1 flat, 0 natural, 1 sharp — as written in the app's flat-first spelling. */
  alter: -1 | 0 | 1
  octave: number
}

const FLAT_SPELLING: Record<string, [LetterName, -1 | 0]> = {
  A: ['A', 0],
  Bb: ['B', -1],
  B: ['B', 0],
  C: ['C', 0],
  Db: ['D', -1],
  D: ['D', 0],
  Eb: ['E', -1],
  E: ['E', 0],
  F: ['F', 0],
  Gb: ['G', -1],
  G: ['G', 0],
  Ab: ['A', -1],
}

/** Split "Bb4" into its letter, accidental and octave. */
export function toPitch(id: NoteId): Pitch {
  const match = /^([A-G])(b?)(\d)$/.exec(id)
  if (!match) return { letter: 'C', alter: 0, octave: 5 }
  const [, letter = 'C', flat, octave = '5'] = match
  const spelled = FLAT_SPELLING[`${letter}${flat}`] ?? ['C', 0]
  return { letter: spelled[0], alter: spelled[1], octave: Number(octave) }
}

/**
 * Diatonic step counted from C0 — the number a staff cares about. Two notes a
 * semitone apart can share a step (C and C♯); that is the point.
 */
export function diatonicStep(id: NoteId): number {
  const { letter, octave } = toPitch(id)
  return octave * 7 + LETTERS.indexOf(letter)
}

/** Semitones from C0. Used for range checks and octave shifting. */
export function semitones(id: NoteId): number {
  const { letter, alter, octave } = toPitch(id)
  const base = [0, 2, 4, 5, 7, 9, 11][LETTERS.indexOf(letter)] ?? 0
  return octave * 12 + base + alter
}

/** How the note should read given the user's ♯/♭ preference. */
export function displayLetter(id: NoteId, enharmonic: 'flat' | 'sharp'): string {
  const note = getNote(id)
  if (enharmonic === 'sharp' && note.altLetter) return note.altLetter
  return note.letter
}

export function displayName(id: NoteId, enharmonic: 'flat' | 'sharp'): string {
  return `${displayLetter(id, enharmonic)}${getNote(id).octave}`
}

/** The written pitch shifted by an instrument's sounding offset, for labels. */
export function soundingName(id: NoteId, offset: number | undefined): string {
  const note = getNote(id)
  if (!offset) return `${note.letter}${note.octave}`
  return `${note.letter}${note.octave + Math.round(offset / 12)}`
}
