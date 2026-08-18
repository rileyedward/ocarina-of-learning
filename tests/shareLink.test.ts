// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { decodeSong, encodeSong, payloadFromHash, shareUrl } from '@/utils/shareLink'
import { seq } from '@/utils/noteText'
import type { Song } from '@/types'

const song: Song = {
  id: 'shared-1',
  title: 'Song of Storms',
  subtitle: 'from a link',
  instrument: 'alto-c-12',
  phrases: [
    { id: 'p1', label: 'opening', notes: seq('D5 F5 D6 D5 F5 D6'), repeat: 2 },
    { id: 'p2', notes: seq('r/4 E6 F6 E6 F6 E6 C6 A5') },
  ],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
}

describe('sharing a song in a URL', () => {
  it('round-trips a whole song through the fragment', async () => {
    const decoded = await decodeSong(await encodeSong(song))
    expect(decoded).toEqual(song)
  })

  it('round-trips through the plain fallback when gzip is unavailable', async () => {
    const original = globalThis.CompressionStream
    // @ts-expect-error — deliberately removing the API the encoder prefers.
    delete globalThis.CompressionStream

    const payload = await encodeSong(song)
    expect(payload.startsWith('p')).toBe(true)
    expect(await decodeSong(payload)).toEqual(song)

    globalThis.CompressionStream = original
  })

  it('returns null for a payload that is not a song', async () => {
    expect(await decodeSong('')).toBeNull()
    expect(await decodeSong('pnot-base64!!')).toBeNull()
    expect(await decodeSong('xanything')).toBeNull()
  })

  it('builds a link the shared route can read back', async () => {
    const url = await shareUrl(song, 'https://ocarina.example')
    expect(url.startsWith('https://ocarina.example/song/shared#s=')).toBe(true)

    const payload = payloadFromHash(new URL(url).hash)
    expect((await decodeSong(payload))?.title).toBe('Song of Storms')
  })

  it('finds nothing in a fragment without a payload', () => {
    expect(payloadFromHash('#nothing-here')).toBe('')
    expect(payloadFromHash('')).toBe('')
  })
})
