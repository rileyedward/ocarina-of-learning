import { parseLibrary } from '@/composables/useStorage'
import type { Song } from '@/types'

/**
 * A song in a URL. There is no server to host a shared song on and no account
 * to attach it to, so the link carries the whole thing in its fragment —
 * which never leaves the browser it is pasted into until someone opens it.
 *
 * Gzip where the browser has it, plain otherwise. A one-character prefix says
 * which, so an old link keeps opening after the fallback path changes.
 */

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function gzip(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

async function gunzip(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
    return await new Response(stream).text()
  } catch {
    return null
  }
}

/** The encoded payload — everything after `#s=`. */
export async function encodeSong(song: Song): Promise<string> {
  const json = JSON.stringify({ version: 2, songs: [song], scales: [] })
  const packed = await gzip(json)
  if (packed) return `g${toBase64Url(packed)}`
  return `p${toBase64Url(new TextEncoder().encode(json))}`
}

export async function decodeSong(payload: string): Promise<Song | null> {
  if (!payload) return null

  const mode = payload[0]
  const body = payload.slice(1)

  let json: string | null = null
  try {
    if (mode === 'g') json = await gunzip(fromBase64Url(body))
    else if (mode === 'p') json = new TextDecoder().decode(fromBase64Url(body))
  } catch {
    return null
  }
  if (!json) return null

  try {
    // Reuse the library parser: a shared song is untrusted input like any other.
    const library = parseLibrary(JSON.parse(json))
    return library?.songs[0] ?? null
  } catch {
    return null
  }
}

/** The full link to hand to someone. */
export async function shareUrl(song: Song, origin: string): Promise<string> {
  return `${origin}/song/shared#s=${await encodeSong(song)}`
}

/** Pull the payload out of a `#s=…` fragment. */
export function payloadFromHash(hash: string): string {
  const match = /[#&]s=([^&]+)/.exec(hash)
  return match?.[1] ?? ''
}
