<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import { findSong, readCols, readDensity, writeCols, writeDensity } from '@/composables/useLibrary'

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

/**
 * On a phone a card size in pixels means nothing — what matters is how many
 * fingerings fit across the screen. Below `md` this drives the grid instead.
 */
const COLS = [2, 3, 4, 5, 6]

const density = ref(readDensity(songId.value) ?? 2)
const cols = ref(readCols(songId.value) ?? 3)
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

function setCols(value: number) {
  cols.value = value
  writeCols(songId.value, value)
}

function step(delta: number) {
  page.value = Math.min(pageCount.value - 1, Math.max(0, page.value + delta))
}

/** Swipe across the notes to turn the page — the touch equivalent of ← / →. */
const touchStart = ref<{ x: number; y: number } | null>(null)

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  touchStart.value = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function onTouchEnd(event: TouchEvent) {
  const start = touchStart.value
  const touch = event.changedTouches[0]
  touchStart.value = null
  if (!start || !touch) return

  const dx = touch.clientX - start.x
  const dy = touch.clientY - start.y
  // Mostly-horizontal and long enough that it cannot be a scroll.
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  step(dx < 0 ? 1 : -1)
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

  <main v-if="song" class="tight-landscape mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
    <div
      v-if="!chromeless"
      class="md:flex md:flex-wrap md:items-end md:justify-between md:gap-4"
    >
      <div class="min-w-0">
        <!-- Sideways on a phone the nav is right there; this line is pure cost. -->
        <RouterLink
          to="/"
          class="tight-landscape-hide text-sm text-parchment-dim hover:text-parchment"
        >
          ← All songs
        </RouterLink>
        <h1 class="tight-landscape-title mt-1 truncate font-display text-2xl text-parchment md:text-3xl">
          {{ song.title }}
        </h1>
        <p
          v-if="song.subtitle"
          class="tight-landscape-hide mt-1 truncate text-sm text-parchment-dim"
        >
          {{ song.subtitle }}
        </p>
      </div>

      <!--
        Controls stay put on a phone: density, zoom and page are always a thumb
        away. At `md` the wrapper dissolves (`display: contents`) so the controls
        sit back in the title row exactly as they always have.
      -->
      <div
        class="tight-landscape sticky top-0 z-10 -mx-4 mt-3 bg-ink/95 px-4 py-1.5 backdrop-blur md:contents"
      >
        <div class="tight-landscape-controls flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div class="flex shrink-0 items-center gap-2">
            <span class="tight-landscape-hide text-xs tracking-wider text-parchment-dim uppercase">
              Phrases
            </span>
            <div class="flex items-center gap-1 rounded-sm border border-white/10 p-1">
              <button
                v-for="option in DENSITIES"
                :key="option.value"
                type="button"
                class="min-h-10 rounded-xs px-3 py-1 text-sm transition-colors md:min-h-0"
                :class="
                  density === option.value
                    ? 'bg-gold/20 text-parchment'
                    : 'text-parchment-dim hover:text-parchment'
                "
                :aria-pressed="density === option.value"
                :aria-label="
                  option.value === 0 ? 'All phrases on one page' : `${option.value} phrases per page`
                "
                @click="setDensity(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Second line on a phone; at `md` it dissolves back into the row. -->
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 md:contents">
            <!-- Card width in pixels is a desktop idea; on a phone you pick columns. -->
            <div class="grid-mode-only shrink-0 items-center gap-2">
              <span
                class="tight-landscape-hide text-xs tracking-wider text-parchment-dim uppercase"
              >
                Per row
              </span>
              <div class="flex items-center gap-1 rounded-sm border border-white/10 p-1">
                <button
                  v-for="option in COLS"
                  :key="`cols-${option}`"
                  type="button"
                  class="min-h-10 rounded-xs px-2.5 py-1 text-sm transition-colors"
                  :class="
                    cols === option
                      ? 'bg-glaze/25 text-parchment'
                      : 'text-parchment-dim hover:text-parchment'
                  "
                  :aria-pressed="cols === option"
                  :aria-label="`${option} fingerings per row`"
                  @click="setCols(option)"
                >
                  {{ option }}
                </button>
              </div>
            </div>

            <div class="ml-auto flex items-center gap-1 md:ml-0 md:gap-4">
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
                Fullscreen<span class="hidden md:inline"> (f)</span>
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="paginated"
          class="mt-2 flex items-center gap-3 text-sm text-parchment-dim md:mt-4 md:w-full"
        >
          <button type="button" class="px-3 py-2 hover:text-parchment md:px-2 md:py-1" @click="step(-1)">
            ←
          </button>
          <span>Page {{ page + 1 }} of {{ pageCount }}</span>
          <button type="button" class="px-3 py-2 hover:text-parchment md:px-2 md:py-1" @click="step(1)">
            →
          </button>
          <span class="tight-landscape-hide hidden text-parchment-dim/60 md:inline">
            ← → or j / k
          </span>
          <span class="text-parchment-dim/60 md:hidden">or swipe</span>
        </div>
      </div>
    </div>

    <div
      v-else-if="paginated"
      class="mt-4 flex items-center gap-3 text-sm text-parchment-dim opacity-40"
    >
      <button type="button" class="px-3 py-2 hover:text-parchment" @click="step(-1)">←</button>
      <span>Page {{ page + 1 }} of {{ pageCount }}</span>
      <button type="button" class="px-3 py-2 hover:text-parchment" @click="step(1)">→</button>
    </div>

    <section
      class="tight-landscape-gap mt-4 flex flex-col gap-8 md:mt-6"
      :style="{ '--card-size': cardSize, '--card-cols': cols }"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <article
        v-for="entry in visible"
        :key="entry.phrase.id"
        class="border-l-2 border-glaze/40 pl-3 md:pl-4"
      >
        <h2 class="mb-2 text-xs tracking-widest text-parchment-dim uppercase">
          {{ entry.phrase.label || `Phrase ${entry.index + 1}` }}
        </h2>

        <div v-if="entry.phrase.notes.length" class="note-grid">
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
      class="fixed right-4 bottom-4 rounded-sm border border-white/10 bg-ink/90 px-4 py-3 text-xs text-parchment-dim hover:text-parchment"
      @click="toggleChromeless"
    >
      Exit fullscreen<span class="hidden md:inline"> (esc)</span>
    </button>
  </main>

  <main v-else class="mx-auto max-w-[900px] px-4 py-8 md:px-6">
    <p class="text-parchment-dim">
      That song is gone.
      <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
    </p>
  </main>
</template>
