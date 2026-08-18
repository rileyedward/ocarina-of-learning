<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import { findSong, readDensity, writeDensity } from '@/composables/useLibrary'

const route = useRoute()
const songId = computed(() => String(route.params.id))
const song = computed(() => findSong(songId.value))

/** Phrases visible at once. 0 means all of them. One control drives card size too. */
const DENSITIES = [
  { value: 1, label: '1', cardSize: '340px' },
  { value: 2, label: '2', cardSize: '250px' },
  { value: 4, label: '4', cardSize: '185px' },
  { value: 8, label: '8', cardSize: '135px' },
  { value: 0, label: 'All', cardSize: '110px' },
]

const density = ref(readDensity(songId.value) ?? 2)
const page = ref(0)
const chromeless = ref(false)

const cardSize = computed(
  () => DENSITIES.find((d) => d.value === density.value)?.cardSize ?? '185px',
)

const phrases = computed(() => song.value?.phrases ?? [])

const pageSize = computed(() =>
  density.value === 0 ? Math.max(phrases.value.length, 1) : density.value,
)

const pageCount = computed(() => Math.max(1, Math.ceil(phrases.value.length / pageSize.value)))

const visible = computed(() => {
  const start = page.value * pageSize.value
  return phrases.value
    .slice(start, start + pageSize.value)
    .map((phrase, i) => ({ phrase, index: start + i }))
})

const paginated = computed(() => pageCount.value > 1)

function setDensity(value: number) {
  const firstVisible = page.value * pageSize.value
  density.value = value
  writeDensity(songId.value, value)
  // Keep the phrase you were looking at on screen when the density changes.
  page.value = value === 0 ? 0 : Math.floor(firstVisible / value)
}

function step(delta: number) {
  page.value = Math.min(pageCount.value - 1, Math.max(0, page.value + delta))
}

function toggleChromeless() {
  chromeless.value = !chromeless.value
  const target = document.documentElement
  if (chromeless.value && !document.fullscreenElement) {
    void target.requestFullscreen?.().catch(() => {})
  } else if (!chromeless.value && document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => {})
  }
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

  switch (event.key) {
    case 'ArrowRight':
    case 'j':
      step(1)
      break
    case 'ArrowLeft':
    case 'k':
      step(-1)
      break
    case 'f':
      toggleChromeless()
      break
    case 'Escape':
      if (chromeless.value) toggleChromeless()
      break
    default:
      return
  }
  event.preventDefault()
}

watch(pageCount, (count) => {
  if (page.value > count - 1) page.value = count - 1
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppNav v-if="!chromeless" />

  <main v-if="song" class="mx-auto max-w-[1600px] px-6 py-6">
    <div v-if="!chromeless" class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <RouterLink to="/" class="text-sm text-parchment-dim hover:text-parchment">
          ← All songs
        </RouterLink>
        <h1 class="mt-1 truncate font-display text-3xl text-parchment">{{ song.title }}</h1>
        <p v-if="song.subtitle" class="mt-1 truncate text-sm text-parchment-dim">
          {{ song.subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs tracking-wider text-parchment-dim uppercase">Phrases shown</span>
          <div class="flex items-center gap-1 rounded-sm border border-white/10 p-1">
            <button
              v-for="option in DENSITIES"
              :key="option.value"
              type="button"
              class="rounded-xs px-3 py-1 text-sm transition-colors"
              :class="
                density === option.value
                  ? 'bg-gold/20 text-parchment'
                  : 'text-parchment-dim hover:text-parchment'
              "
              :aria-pressed="density === option.value"
              @click="setDensity(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <RouterLink
          :to="`/song/${song.id}/edit`"
          class="px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
        >
          Edit
        </RouterLink>

        <button
          type="button"
          class="px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
          @click="toggleChromeless"
        >
          Fullscreen (f)
        </button>
      </div>
    </div>

    <div
      v-if="paginated"
      class="mt-4 flex items-center gap-3 text-sm text-parchment-dim"
      :class="{ 'opacity-40': chromeless }"
    >
      <button type="button" class="px-2 py-1 hover:text-parchment" @click="step(-1)">←</button>
      <span>Page {{ page + 1 }} of {{ pageCount }}</span>
      <button type="button" class="px-2 py-1 hover:text-parchment" @click="step(1)">→</button>
      <span class="text-parchment-dim/60">← → or j / k</span>
    </div>

    <section class="mt-6 flex flex-col gap-8" :style="{ '--card-size': cardSize }">
      <article
        v-for="entry in visible"
        :key="entry.phrase.id"
        class="border-l-2 border-glaze/40 pl-4"
      >
        <h2 class="mb-2 text-xs tracking-widest text-parchment-dim uppercase">
          {{ entry.phrase.label || `Phrase ${entry.index + 1}` }}
        </h2>

        <div v-if="entry.phrase.notes.length" class="flex flex-wrap gap-3">
          <FingeringCard
            v-for="(noteId, i) in entry.phrase.notes"
            :key="`${entry.phrase.id}-${i}`"
            :note="noteId"
          />
        </div>
        <p v-else class="text-sm text-parchment-dim/70 italic">
          Empty phrase — a breath.
          <RouterLink :to="`/song/${song.id}/edit`" class="text-glaze underline">
            Add notes
          </RouterLink>
        </p>
      </article>
    </section>

    <button
      v-if="chromeless"
      type="button"
      class="fixed right-4 bottom-4 rounded-sm border border-white/10 px-3 py-2 text-xs text-parchment-dim hover:text-parchment"
      @click="toggleChromeless"
    >
      Exit fullscreen (esc)
    </button>
  </main>

  <main v-else class="mx-auto max-w-[900px] px-6 py-8">
    <p class="text-parchment-dim">
      That song is gone.
      <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
    </p>
  </main>
</template>
