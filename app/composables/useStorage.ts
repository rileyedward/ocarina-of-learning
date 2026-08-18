import { isNoteId } from '@/data/fingerings'
import { isInstrumentId } from '@/data/instruments'
import type { Duration, Library, Phrase, PhraseNote, PhraseStatus, Song } from '@/types'

export const LIBRARY_KEY = 'ocarina.library.v1'
/** The v1 payload, kept aside once before the first v2 write. */
export const LIBRARY_V1_BACKUP_KEY = 'ocarina.library.v1.backup'
export const PREFS_KEY = 'ocarina.prefs.v1'
export const EXPORT_META_KEY = 'ocarina.export.meta'
export const densityKey = (songId: string) => `ocarina.density.${songId}`
export const colsKey = (songId: string) => `ocarina.cols.${songId}`

/** localStorage is one cleared cache away from gone; every read is defensive. */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Could not write ${key} to localStorage`, error)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

const DURATIONS: Duration[] = [1, 2, 4, 8, 16]
const STATUSES: PhraseStatus[] = ['new', 'shaky', 'learned']

/**
 * A note is either a bare note id — the v1 shape, and still the pleasant thing
 * to hand-edit — or an object carrying a note value and a dot. A rest is
 * `{ note: null }`. Anything else is dropped.
 */
const parseNote = (value: unknown): PhraseNote | null => {
  if (typeof value === 'string') return isNoteId(value) ? { note: value } : null
  if (!isRecord(value)) return null

  const raw = value.note
  if (raw !== null && !(typeof raw === 'string' && isNoteId(raw))) return null

  const dur = DURATIONS.includes(value.dur as Duration) ? (value.dur as Duration) : undefined
  return {
    note: raw === null ? null : (raw as PhraseNote['note']),
    ...(dur ? { dur } : {}),
    ...(value.dotted === true ? { dotted: true } : {}),
  }
}

const parsePhrase = (value: unknown, index: number): Phrase | null => {
  if (!isRecord(value)) return null
  const notes = Array.isArray(value.notes)
    ? value.notes.map(parseNote).filter((n): n is PhraseNote => n !== null)
    : []

  const repeat =
    typeof value.repeat === 'number' && value.repeat > 1 && value.repeat <= 99
      ? Math.floor(value.repeat)
      : undefined

  const status = STATUSES.includes(value.status as PhraseStatus)
    ? (value.status as PhraseStatus)
    : undefined

  return {
    id: asString(value.id, `phrase-${index}-${notes.length}`),
    label: typeof value.label === 'string' ? value.label : undefined,
    notes,
    ...(repeat ? { repeat } : {}),
    ...(status ? { status } : {}),
  }
}

const parseSong = (value: unknown, index: number): Song | null => {
  if (!isRecord(value)) return null
  const id = asString(value.id, `song-${index}`)
  const now = new Date().toISOString()
  const phrases = Array.isArray(value.phrases)
    ? value.phrases.map(parsePhrase).filter((p): p is Phrase => p !== null)
    : []

  // An unknown instrument means an older or newer build wrote this file.
  // Falling back to the default is better than refusing to open the song.
  const instrument =
    typeof value.instrument === 'string' && isInstrumentId(value.instrument)
      ? value.instrument
      : undefined

  return {
    id,
    title: asString(value.title, 'Untitled'),
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : undefined,
    phrases,
    ...(instrument ? { instrument } : {}),
    createdAt: asString(value.createdAt, now),
    updatedAt: asString(value.updatedAt, now),
  }
}

/**
 * Parse an untrusted library payload (localStorage or an imported file).
 *
 * Version 1 and version 2 are both accepted: v1's bare-string notes upcast to
 * `{ note }` objects on the way in, which is the whole of the migration.
 * Unknown notes and malformed entries are dropped rather than thrown on — a
 * hand-edited JSON file should degrade, not brick the app.
 */
export function parseLibrary(value: unknown): Library | null {
  if (!isRecord(value)) return null
  if (value.version !== 1 && value.version !== 2) return null

  const songs = Array.isArray(value.songs)
    ? value.songs.map(parseSong).filter((s): s is Song => s !== null)
    : []
  const scales = Array.isArray(value.scales)
    ? value.scales
        .filter(isRecord)
        .map((s, i) => ({
          id: asString(s.id, `scale-${i}`),
          name: asString(s.name, 'Untitled scale'),
          notes: Array.isArray(s.notes)
            ? s.notes.filter((n): n is string => typeof n === 'string').filter(isNoteId)
            : [],
          ...(s.seeded === true ? { seeded: true } : {}),
        }))
    : []

  return { version: 2, songs, scales }
}

export function parseLibraryJson(json: string): Library | null {
  try {
    return parseLibrary(JSON.parse(json))
  } catch {
    return null
  }
}

/** True when the stored payload predates note values and instruments. */
export function isV1Payload(json: string): boolean {
  try {
    const value: unknown = JSON.parse(json)
    return isRecord(value) && value.version === 1
  } catch {
    return false
  }
}
