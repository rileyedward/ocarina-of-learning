// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LIBRARY_KEY, LIBRARY_V1_BACKUP_KEY, parseLibraryJson } from '@/composables/useStorage'

/**
 * The v1 library stored notes as bare strings and knew of one instrument.
 * Opening such a library must lose nothing and must leave the old payload
 * where a worried user can still find it.
 */
const V1 = JSON.stringify({
  version: 1,
  songs: [
    {
      id: 'old-song',
      title: 'Written before note values',
      phrases: [{ id: 'p1', label: 'opening', notes: ['C5', 'D5', 'E5'] }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  scales: [{ id: 's1', name: 'Old scale', notes: ['C5', 'D5'] }],
})

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('library v1 to v2', () => {
  it('upcasts bare note strings into note objects', () => {
    const parsed = parseLibraryJson(V1)
    expect(parsed?.version).toBe(2)
    expect(parsed?.songs[0].phrases[0].notes).toEqual([
      { note: 'C5' },
      { note: 'D5' },
      { note: 'E5' },
    ])
  })

  it('still accepts bare strings inside a v2 payload, so hand editing stays pleasant', () => {
    const parsed = parseLibraryJson(
      JSON.stringify({
        version: 2,
        songs: [{ id: 'x', title: 'Mixed', phrases: [{ id: 'p', notes: ['C5', { note: 'D5', dur: 4 }] }] }],
        scales: [],
      }),
    )
    expect(parsed?.songs[0].phrases[0].notes).toEqual([{ note: 'C5' }, { note: 'D5', dur: 4 }])
  })

  it('keeps rests and drops junk note values', () => {
    const parsed = parseLibraryJson(
      JSON.stringify({
        version: 2,
        songs: [
          {
            id: 'x',
            title: 'Rests',
            phrases: [{ id: 'p', notes: [{ note: null, dur: 4 }, { note: 'C5', dur: 7 }, { note: 'Z9' }] }],
          },
        ],
        scales: [],
      }),
    )
    expect(parsed?.songs[0].phrases[0].notes).toEqual([{ note: null, dur: 4 }, { note: 'C5' }])
  })

  it('falls back to the default instrument rather than refusing the song', () => {
    const parsed = parseLibraryJson(
      JSON.stringify({
        version: 2,
        songs: [{ id: 'x', title: 'From the future', instrument: 'triple-chamber-99', phrases: [] }],
        scales: [],
      }),
    )
    expect(parsed?.songs[0].instrument).toBeUndefined()
  })

  it('copies the v1 payload aside before the first v2 write lands on it', async () => {
    localStorage.setItem(LIBRARY_KEY, V1)
    const { useLibrary } = await import('@/composables/useLibrary')
    const { library } = useLibrary()

    expect(library.songs[0]?.id).toBe('old-song')
    expect(localStorage.getItem(LIBRARY_V1_BACKUP_KEY)).toBe(V1)
  })

  it('does not overwrite an existing backup on a later load', async () => {
    localStorage.setItem(LIBRARY_V1_BACKUP_KEY, 'the original')
    localStorage.setItem(LIBRARY_KEY, V1)

    const { useLibrary } = await import('@/composables/useLibrary')
    useLibrary()

    expect(localStorage.getItem(LIBRARY_V1_BACKUP_KEY)).toBe('the original')
  })
})
