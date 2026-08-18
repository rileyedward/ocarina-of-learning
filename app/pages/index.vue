<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import {
  createSong,
  deleteSong,
  duplicateSong,
  exportLibrary,
  importLibrary,
  noteCount,
  songsByRecency,
  useLibrary,
} from '@/composables/useLibrary'
import type { ImportMode } from '@/composables/useLibrary'

const router = useRouter()
const { library } = useLibrary()

const songs = computed(() => {
  // Touch the reactive list so re-sorting tracks edits.
  void library.songs.length
  return songsByRecency()
})

const pendingDelete = ref<string | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<File | null>(null)
const importMessage = ref('')

function onNewSong() {
  const song = createSong()
  router.push(`/song/${song.id}/edit`)
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  pendingImport.value = input.files?.[0] ?? null
  importMessage.value = ''
  input.value = ''
}

async function applyImport(mode: ImportMode) {
  const file = pendingImport.value
  if (!file) return
  const result = await importLibrary(file, mode)
  importMessage.value = result.message
  pendingImport.value = null
}
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[900px] px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">Songs</h1>
        <p class="mt-1 text-sm text-parchment-dim">Most recently edited first.</p>
      </div>

      <button
        type="button"
        class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
        @click="onNewSong"
      >
        New song
      </button>
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
            </div>
          </RouterLink>

          <div v-if="pendingDelete === song.id" class="flex flex-wrap items-center gap-2 text-sm sm:shrink-0">
            <span class="text-parchment-dim">Delete for good?</span>
            <button
              type="button"
              class="px-2 py-1 text-red-300 hover:text-red-200"
              @click="deleteSong(song.id)"
            >
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

    <div v-else class="mt-10 rounded-sm border border-white/5 bg-stone px-6 py-10 text-center">
      <p class="font-display text-xl text-parchment">Nothing here yet.</p>
      <p class="mx-auto mt-2 max-w-md text-sm text-parchment-dim">
        Build a song out of short phrases, then practise it a phrase at a time.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
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
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="fileInput?.click()">
          Import JSON
        </button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFilePicked" />
      </div>

      <div v-if="pendingImport" class="mt-3 flex flex-wrap items-center gap-3 rounded-sm border border-white/10 px-3 py-2">
        <span class="text-parchment">{{ pendingImport.name }}</span>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="applyImport('merge')">
          Merge into library
        </button>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="applyImport('replace')">
          Replace library
        </button>
        <button type="button" class="px-2 py-1 hover:text-parchment" @click="pendingImport = null">
          Cancel
        </button>
      </div>

      <p v-if="importMessage" class="mt-2 text-kokiri">{{ importMessage }}</p>
    </footer>
  </main>
</template>
