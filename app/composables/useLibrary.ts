import { reactive, watch } from 'vue'
import { SEED_SCALES } from '@/data/scales'
import { SEED_SONGS } from '@/data/songs'
import {
  LIBRARY_KEY,
  densityKey,
  parseLibraryJson,
  readRaw,
  writeRaw,
} from '@/composables/useStorage'
import type { Library, Phrase, Song } from '@/types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`

const seedLibrary = (): Library => ({
  version: 1,
  songs: clone(SEED_SONGS),
  scales: clone(SEED_SCALES),
})

/**
 * First run seeds from the static data modules. A library that already exists is
 * used as-is — seeding never merges into or overwrites user edits. An unreadable
 * payload is stashed aside rather than silently discarded.
 */
function loadLibrary(): Library {
  const raw = readRaw(LIBRARY_KEY)
  if (raw === null) return seedLibrary()

  const parsed = parseLibraryJson(raw)
  if (parsed) return parsed

  writeRaw(`ocarina.library.corrupt.${Date.now()}`, raw)
  console.warn('Stored library was unreadable; it has been set aside and reseeded.')
  return seedLibrary()
}

const library = reactive<Library>(loadLibrary())

let saveTimer: ReturnType<typeof setTimeout> | undefined

function save(): void {
  writeRaw(LIBRARY_KEY, JSON.stringify(library))
}

/** The single autosave. Every mutation anywhere lands here — no save buttons. */
watch(
  library,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 300)
  },
  { deep: true },
)

// Persist the seeded library immediately so a first run survives a hard close.
if (readRaw(LIBRARY_KEY) === null) save()

const nowIso = () => new Date().toISOString()

export function touch(song: Song): void {
  song.updatedAt = nowIso()
}

export function findSong(id: string): Song | undefined {
  return library.songs.find((s) => s.id === id)
}

export function songsByRecency(): Song[] {
  return [...library.songs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function noteCount(song: Song): number {
  return song.phrases.reduce((total, phrase) => total + phrase.notes.length, 0)
}

export function newPhrase(label?: string): Phrase {
  return { id: newId(), label, notes: [] }
}

export function createSong(title = 'Untitled song'): Song {
  const song: Song = {
    id: newId(),
    title,
    subtitle: '',
    phrases: [newPhrase()],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  library.songs.push(song)
  return song
}

export function duplicateSong(id: string): Song | undefined {
  const source = findSong(id)
  if (!source) return undefined

  const copy: Song = {
    ...clone(source),
    id: newId(),
    title: `${source.title} (copy)`,
    phrases: source.phrases.map((p) => ({ ...clone(p), id: newId() })),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  library.songs.push(copy)
  return copy
}

export function deleteSong(id: string): void {
  const index = library.songs.findIndex((s) => s.id === id)
  if (index !== -1) library.songs.splice(index, 1)
}

/** Download the whole library as one file. The escape hatch from localStorage. */
export function exportLibrary(): void {
  const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ocarina-library-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  ok: boolean
  message: string
}

export async function importLibrary(file: File, mode: ImportMode): Promise<ImportResult> {
  const parsed = parseLibraryJson(await file.text())
  if (!parsed) {
    return { ok: false, message: 'That file is not a readable ocarina library (expected version 1).' }
  }

  if (mode === 'replace') {
    library.songs = parsed.songs
    library.scales = parsed.scales.length > 0 ? parsed.scales : clone(SEED_SCALES)
    return { ok: true, message: `Replaced library with ${parsed.songs.length} songs.` }
  }

  let added = 0
  let updated = 0
  for (const incoming of parsed.songs) {
    const index = library.songs.findIndex((s) => s.id === incoming.id)
    if (index === -1) {
      library.songs.push(incoming)
      added += 1
    } else {
      library.songs.splice(index, 1, incoming)
      updated += 1
    }
  }
  return { ok: true, message: `Merged: ${added} added, ${updated} replaced.` }
}

/** Density is a per-song view preference, not library data. */
export function readDensity(songId: string): number | null {
  const raw = readRaw(densityKey(songId))
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function writeDensity(songId: string, density: number): void {
  writeRaw(densityKey(songId), String(density))
}

export function useLibrary() {
  return { library, newId, save }
}
