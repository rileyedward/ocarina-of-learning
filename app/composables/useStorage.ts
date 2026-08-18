import { isNoteId } from '@/data/fingerings'
import type { Library, Phrase, Song } from '@/types'

export const LIBRARY_KEY = 'ocarina.library.v1'
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

const parsePhrase = (value: unknown, index: number): Phrase | null => {
  if (!isRecord(value)) return null
  const notes = Array.isArray(value.notes)
    ? value.notes.filter((n): n is string => typeof n === 'string').filter(isNoteId)
    : []
  return {
    id: asString(value.id, `phrase-${index}-${notes.length}`),
    label: typeof value.label === 'string' ? value.label : undefined,
    notes,
  }
}

const parseSong = (value: unknown, index: number): Song | null => {
  if (!isRecord(value)) return null
  const id = asString(value.id, `song-${index}`)
  const now = new Date().toISOString()
  const phrases = Array.isArray(value.phrases)
    ? value.phrases.map(parsePhrase).filter((p): p is Phrase => p !== null)
    : []
  return {
    id,
    title: asString(value.title, 'Untitled'),
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : undefined,
    phrases,
    createdAt: asString(value.createdAt, now),
    updatedAt: asString(value.updatedAt, now),
  }
}

/**
 * Parse an untrusted library payload (localStorage or an imported file).
 * Unknown notes and malformed entries are dropped rather than thrown on —
 * a hand-edited JSON file should degrade, not brick the app.
 */
export function parseLibrary(value: unknown): Library | null {
  if (!isRecord(value)) return null
  if (value.version !== 1) return null

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
        }))
    : []

  return { version: 1, songs, scales }
}

export function parseLibraryJson(json: string): Library | null {
  try {
    return parseLibrary(JSON.parse(json))
  } catch {
    return null
  }
}
