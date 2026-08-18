<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import PhraseView from '@/components/PhraseView.vue'
import { addSong, noteCount } from '@/composables/useLibrary'
import { getInstrument } from '@/data/instruments'
import { decodeSong, payloadFromHash } from '@/utils/shareLink'
import type { Song } from '@/types'

/**
 * The other end of a share link. The song arrives in the fragment, so it is
 * shown before it is saved — nobody should have a stranger's song appear in
 * their library without being asked.
 */
const router = useRouter()
const song = ref<Song | null>(null)
const state = ref<'loading' | 'ready' | 'bad'>('loading')

onMounted(async () => {
  const decoded = await decodeSong(payloadFromHash(window.location.hash))
  song.value = decoded
  state.value = decoded ? 'ready' : 'bad'
})

function save() {
  if (!song.value) return
  const saved = addSong(song.value)
  void router.push(`/song/${saved.id}`)
}
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1100px] px-4 py-6 md:px-6 md:py-8">
    <p v-if="state === 'loading'" class="text-parchment-dim">Unpacking the link…</p>

    <template v-else-if="state === 'bad'">
      <h1 class="font-display text-2xl text-parchment">That link has nothing in it.</h1>
      <p class="mt-2 text-sm text-parchment-dim">
        A shared song travels in the part of the URL after the <code>#</code>. If the link was
        broken across two lines, the tail is probably missing.
        <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
      </p>
    </template>

    <template v-else-if="song">
      <p class="text-sm text-parchment-dim">Shared song — not saved yet.</p>
      <h1 class="mt-1 font-display text-2xl text-parchment md:text-3xl">{{ song.title }}</h1>
      <p v-if="song.subtitle" class="mt-1 text-sm text-parchment-dim">{{ song.subtitle }}</p>
      <p class="mt-1 text-xs text-parchment-dim/70">
        {{ song.phrases.length }} phrase{{ song.phrases.length === 1 ? '' : 's' }} ·
        {{ noteCount(song) }} notes · {{ getInstrument(song.instrument).name }}
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
          @click="save"
        >
          Save to my library
        </button>
        <RouterLink to="/" class="px-4 py-2 text-sm text-parchment-dim hover:text-parchment">
          Discard
        </RouterLink>
      </div>

      <section class="mt-8 flex flex-col gap-8" :style="{ '--card-size': '135px', '--card-cols': 4 }">
        <article
          v-for="(phrase, index) in song.phrases"
          :key="phrase.id"
          class="border-l-2 border-glaze/40 pl-3 md:pl-4"
        >
          <h2 class="mb-2 text-xs tracking-widest text-parchment-dim uppercase">
            {{ phrase.label || `Phrase ${index + 1}` }}
          </h2>
          <PhraseView v-if="phrase.notes.length" :notes="phrase.notes" :instrument="song.instrument" />
          <p v-else class="text-sm text-parchment-dim/70 italic">Empty phrase — a breath.</p>
        </article>
      </section>
    </template>
  </main>
</template>
