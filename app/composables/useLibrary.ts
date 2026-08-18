import { reactive, watch } from 'vue'
import { SEED_SCALES } from '@/data/scales'
import { SEED_SONGS } from '@/data/songs'
import { DEFAULT_INSTRUMENT_ID, getInstrument, playable } from '@/data/instruments'
import {
  EXPORT_META_KEY,
  LIBRARY_KEY,
  LIBRARY_V1_BACKUP_KEY,
  colsKey,
  densityKey,
  isV1Payload,
  parseLibraryJson,
  readRaw,
  writeRaw,
} from '@/composables/useStorage'
import type { Library, NoteId, Phrase, PhraseNote, Scale, Song } from '@/types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`

const seedLibrary = (): Library => ({
  version: 2,
  songs: clone(SEED_SONGS),
  scales: clone(SEED_SCALES),
})

/**
 * First run seeds from the static data modules. A library that already exists is
 * used as-is — seeding never merges into or overwrites user edits. An unreadable
 * payload is stashed aside rather than silently discarded, and a v1 payload is
 * copied aside before the first v2 write lands on top of it.
 */
function loadLibrary(): Library {
  const raw = readRaw(LIBRARY_KEY)
  if (raw === null) return seedLibrary()

  if (isV1Payload(raw) && readRaw(LIBRARY_V1_BACKUP_KEY) === null) {
    writeRaw(LIBRARY_V1_BACKUP_KEY, raw)
  }

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
    bumpEdits()
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

export type SongSort = 'recent' | 'title' | 'length'

/** The library screen's one query: filter by title, then order. */
export function songsFiltered(query: string, sort: SongSort): Song[] {
  const needle = query.trim().toLowerCase()
  const matches = needle
    ? library.songs.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          (s.subtitle ?? '').toLowerCase().includes(needle),
      )
    : [...library.songs]

  if (sort === 'title') return matches.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'length') return matches.sort((a, b) => noteCount(b) - noteCount(a))
  return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function noteCount(song: Song): number {
  return song.phrases.reduce(
    (total, phrase) => total + phrase.notes.filter((n) => n.note !== null).length,
    0,
  )
}

/** Notes this song asks for that its instrument cannot play. */
export function outOfRange(song: Song): NoteId[] {
  const instrument = getInstrument(song.instrument)
  const bad = new Set<NoteId>()
  for (const phrase of song.phrases) {
    for (const note of phrase.notes) {
      if (note.note && !playable(instrument, note.note)) bad.add(note.note)
    }
  }
  return [...bad]
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
    instrument: DEFAULT_INSTRUMENT_ID,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  library.songs.push(song)
  return song
}

/** Take a song from a share link or a preview and give it a home. */
export function addSong(incoming: Song): Song {
  const song: Song = {
    ...clone(incoming),
    id: findSong(incoming.id) ? newId() : incoming.id,
    phrases: incoming.phrases.map((p) => ({ ...clone(p), id: newId() })),
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

/* ------------------------------------------------------------------ scales */

export function findScale(id: string): Scale | undefined {
  return library.scales.find((s) => s.id === id)
}

export function createScale(name = 'Untitled scale'): Scale {
  const scale: Scale = { id: newId(), name, notes: [] }
  library.scales.push(scale)
  return scale
}

export function deleteScale(id: string): void {
  const index = library.scales.findIndex((s) => s.id === id)
  if (index !== -1) library.scales.splice(index, 1)
}

export function duplicateScale(id: string): Scale | undefined {
  const source = findScale(id)
  if (!source) return undefined
  const copy: Scale = { ...clone(source), id: newId(), name: `${source.name} (copy)`, seeded: false }
  library.scales.push(copy)
  return copy
}

/* ------------------------------------------------------- export and import */

export interface ExportMeta {
  lastExportAt: string | null
  editsSinceExport: number
}

function readExportMeta(): ExportMeta {
  const raw = readRaw(EXPORT_META_KEY)
  if (!raw) return { lastExportAt: null, editsSinceExport: 0 }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) throw new Error('bad')
    const value = parsed as Partial<ExportMeta>
    return {
      lastExportAt: typeof value.lastExportAt === 'string' ? value.lastExportAt : null,
      editsSinceExport:
        typeof value.editsSinceExport === 'number' ? value.editsSinceExport : 0,
    }
  } catch {
    return { lastExportAt: null, editsSinceExport: 0 }
  }
}

export const exportMeta = reactive<ExportMeta>(readExportMeta())

function writeExportMeta(): void {
  writeRaw(EXPORT_META_KEY, JSON.stringify({ ...exportMeta }))
}

/**
 * localStorage is the only copy of this library. Counting edits since the last
 * export is what lets the footer nag proportionally instead of nagging always.
 */
function bumpEdits(): void {
  exportMeta.editsSinceExport += 1
  writeExportMeta()
}

function markExported(): void {
  exportMeta.lastExportAt = nowIso()
  exportMeta.editsSinceExport = 0
  writeExportMeta()
}

export const libraryJson = (): string => JSON.stringify(library, null, 2)

/** Download the whole library as one file. The escape hatch from localStorage. */
export function exportLibrary(): void {
  const blob = new Blob([libraryJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ocarina-library-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  markExported()
}

export async function copyLibraryToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(libraryJson())
    markExported()
    return true
  } catch {
    return false
  }
}

export type ImportMode = 'replace' | 'merge'

export interface ImportPreview {
  library: Library
  incoming: number
  added: string[]
  overwritten: string[]
}

export interface ImportResult {
  ok: boolean
  message: string
}

/** What an import would do, worked out before anything is touched. */
export function previewImport(json: string): ImportPreview | null {
  const parsed = parseLibraryJson(json)
  if (!parsed) return null

  const added: string[] = []
  const overwritten: string[] = []
  for (const song of parsed.songs) {
    const existing = findSong(song.id)
    if (existing) overwritten.push(existing.title)
    else added.push(song.title)
  }
  return { library: parsed, incoming: parsed.songs.length, added, overwritten }
}

export function applyImport(parsed: Library, mode: ImportMode): ImportResult {
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
  for (const scale of parsed.scales) {
    if (!findScale(scale.id)) library.scales.push(scale)
  }
  return { ok: true, message: `Merged: ${added} added, ${updated} replaced.` }
}

export async function importLibrary(file: File, mode: ImportMode): Promise<ImportResult> {
  const parsed = parseLibraryJson(await file.text())
  if (!parsed) {
    return { ok: false, message: 'That file is not a readable ocarina library (expected version 1 or 2).' }
  }
  return applyImport(parsed, mode)
}

/* ------------------------------------------------------- view preferences */

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

/** Cards per row on narrow screens. Same deal: a view preference, per song. */
export function readCols(songId: string): number | null {
  const raw = readRaw(colsKey(songId))
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function writeCols(songId: string, cols: number): void {
  writeRaw(colsKey(songId), String(cols))
}

/** A phrase's playable notes, rests dropped — what a drill or a scale wants. */
export const phraseNoteIds = (notes: PhraseNote[]): NoteId[] =>
  notes.map((n) => n.note).filter((n): n is NoteId => n !== null)

export function useLibrary() {
  return { library, newId, save }
}

export { newId }
