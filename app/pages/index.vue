<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import {
  applyImport,
  copyLibraryToClipboard,
  createSong,
  deleteSong,
  duplicateSong,
  exportLibrary,
  exportMeta,
  noteCount,
  previewImport,
  songsFiltered,
  useLibrary,
} from '@/composables/useLibrary'
import { getInstrument } from '@/data/instruments'
import { shareUrl } from '@/utils/shareLink'
import type { ImportMode, ImportPreview, SongSort } from '@/composables/useLibrary'

const router = useRouter()
const { library } = useLibrary()

const query = ref('')
const sort = ref<SongSort>('recent')

const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'title', label: 'A–Z' },
  { value: 'length', label: 'Longest' },
]

const songs = computed(() => {
  // Touch the reactive list so re-sorting tracks edits.
  void library.songs.length
  return songsFiltered(query.value, sort.value)
})

const sortBlurb = computed(() =>
  sort.value === 'title'
    ? 'Alphabetical.'
    : sort.value === 'length'
      ? 'Longest first.'
      : 'Most recently edited first.',
)

const pendingDelete = ref<string | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<{ name: string; preview: ImportPreview } | null>(null)
const importMessage = ref('')
const copied = ref(false)
const sharedId = ref<string | null>(null)

function onNewSong() {
  const song = createSong()
  router.push(`/song/${song.id}/edit`)
}

/**
 * Read the file up front so the confirmation can say what the import will
 * actually do. Merging blind is how someone loses a song they had edited.
 */
async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  importMessage.value = ''
  pendingImport.value = null
  if (!file) return

  const preview = previewImport(await file.text())
  if (!preview) {
    importMessage.value = 'That file is not a readable ocarina library (expected version 1 or 2).'
    return
  }
  pendingImport.value = { name: file.name, preview }
}

function runImport(mode: ImportMode) {
  const pending = pendingImport.value
  if (!pending) return
  importMessage.value = applyImport(pending.preview.library, mode).message
  pendingImport.value = null
}

async function onCopy() {
  copied.value = await copyLibraryToClipboard()
  setTimeout(() => (copied.value = false), 2500)
}

/** Share a song by putting the whole thing in the link. No server involved. */
async function onShare(id: string) {
  const song = library.songs.find((s) => s.id === id)
  if (!song) return
  const url = await shareUrl(song, window.location.origin)
  try {
    await navigator.clipboard.writeText(url)
    sharedId.value = id
    setTimeout(() => (sharedId.value = null), 2500)
  } catch {
    window.prompt('Copy this link', url)
  }
}

/** Only nag once the gap is real: localStorage is the only copy of this. */
const exportNag = computed(() => {
  const { lastExportAt, editsSinceExport } = exportMeta
  if (editsSinceExport < 20) return ''
  if (!lastExportAt) return `Never exported · ${editsSinceExport} edits so far`
  const days = Math.floor((Date.now() - Date.parse(lastExportAt)) / 86_400_000)
  const when = days < 1 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  return `Last exported ${when} · ${editsSinceExport} edits since`
})
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[900px] px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">Songs</h1>
        <p class="mt-1 text-sm text-parchment-dim">{{ sortBlurb }}</p>
      </div>

      <button
        type="button"
        class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
        @click="onNewSong"
      >
        New song
      </button>
    </div>

    <div v-if="library.songs.length > 3" class="mt-6 flex flex-wrap items-center gap-3">
      <label class="min-w-0 flex-1">
        <span class="sr-only">Search songs</span>
        <input
          v-model="query"
          type="search"
          placeholder="Search titles"
          class="w-full rounded-sm border border-white/10 bg-stone px-3 py-2 text-sm text-parchment placeholder:text-parchment-dim/50"
        />
      </label>
      <SegmentedControl v-model="sort" :options="SORTS" density="tight" />
    </div>

    <ul v-if="songs.length" class="mt-8 flex flex-col gap-2">
      <li
        v-for="song in songs"
        :key="song.id"
        class="rounded-sm border border-white/5 bg-stone transition-colors hover:border-glaze/40"
      >
        <div class="flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <RouterLink :to="`/song/${song.id}`" class="w-full min-w-0 flex-1">
            <div class="truncate font-display text-lg text-parchment">{{ song.title }}</div>
            <div class="text-sm text-parchment-dim sm:truncate">
              <span v-if="song.subtitle">{{ song.subtitle }} · </span>
              {{ song.phrases.length }} phrase{{ song.phrases.length === 1 ? '' : 's' }} ·
              {{ noteCount(song) }} note{{ noteCount(song) === 1 ? '' : 's' }}
              <span v-if="song.instrument && song.instrument !== 'alto-c-12'">
                · {{ getInstrument(song.instrument).name }}
              </span>
            </div>
          </RouterLink>

          <div
            v-if="pendingDelete === song.id"
            class="flex flex-wrap items-center gap-2 text-sm sm:shrink-0"
          >
            <span class="text-parchment-dim">Delete for good?</span>
            <button type="button" class="px-2 py-1 text-red-300 hover:text-red-200" @click="deleteSong(song.id)">
              Delete
            </button>
            <button
              type="button"
              class="px-2 py-1 text-parchment-dim hover:text-parchment"
              @click="pendingDelete = null"
            >
              Cancel
            </button>
          </div>

          <div v-else class="flex items-center gap-1 text-sm sm:shrink-0">
            <RouterLink
              :to="`/song/${song.id}/edit`"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
            >
              Edit
            </RouterLink>
            <button
              type="button"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
              :class="sharedId === song.id ? 'text-kokiri' : ''"
              title="Copy a link containing this whole song"
              @click="onShare(song.id)"
            >
              {{ sharedId === song.id ? 'Link copied' : 'Share' }}
            </button>
            <button
              type="button"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
              @click="duplicateSong(song.id)"
            >
              Duplicate
            </button>
            <button
              type="button"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
              @click="pendingDelete = song.id"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-else-if="query" class="mt-10 rounded-sm border border-white/5 bg-stone px-6 py-10 text-center">
      <p class="font-display text-xl text-parchment">Nothing by that name.</p>
      <p class="mt-2 text-sm text-parchment-dim">
        No song matches “{{ query }}”.
        <button type="button" class="text-glaze underline" @click="query = ''">Clear the search</button>
      </p>
    </div>

    <div v-else class="mt-10 rounded-sm border border-white/5 bg-stone px-6 py-10 text-center">
      <p class="font-display text-xl text-parchment">Nothing here yet — an empty case.</p>
      <p class="mx-auto mt-2 max-w-md text-sm text-parchment-dim">
        Build a song out of short phrases, then practise it a phrase at a time.
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
          @click="onNewSong"
        >
          Create your first song
        </button>
        <RouterLink to="/reference" class="px-4 py-2 text-sm text-parchment-dim hover:text-parchment">
          Or study the fingering chart →
        </RouterLink>
      </div>
    </div>

    <footer class="mt-14 border-t border-white/5 pt-4 text-sm text-parchment-dim">
      <div class="flex flex-wrap items-center gap-3">
        <span>Library lives in this browser only.</span>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="exportLibrary">
          Export JSON
        </button>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="onCopy">
          {{ copied ? 'Copied' : 'Copy JSON' }}
        </button>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="fileInput?.click()">
          Import JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onFilePicked"
        />
      </div>

      <p v-if="exportNag" class="mt-2 text-gold/80">{{ exportNag }}</p>

      <div
        v-if="pendingImport"
        class="mt-3 flex flex-col gap-2 rounded-sm border border-white/10 px-3 py-2"
      >
        <div class="text-parchment">{{ pendingImport.name }}</div>
        <p class="text-xs">
          {{ pendingImport.preview.incoming }} song{{ pendingImport.preview.incoming === 1 ? '' : 's' }} incoming.
          <template v-if="pendingImport.preview.overwritten.length">
            Merging replaces {{ pendingImport.preview.overwritten.length }}:
            <span class="text-gold">{{ pendingImport.preview.overwritten.join(', ') }}</span
            >.
          </template>
          <template v-else>Nothing in your library would be replaced.</template>
          Replacing drops everything you have now.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" class="px-2 py-1 hover:text-parchment" @click="runImport('merge')">
            Merge into library
          </button>
          <button type="button" class="px-2 py-1 text-red-300 hover:text-red-200" @click="runImport('replace')">
            Replace library
          </button>
          <button type="button" class="px-2 py-1 hover:text-parchment" @click="pendingImport = null">
            Cancel
          </button>
        </div>
      </div>

      <p v-if="importMessage" class="mt-2 text-kokiri">{{ importMessage }}</p>
    </footer>
  </main>
</template>
