<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import NotationToggle from '@/components/NotationToggle.vue'
import PhraseView from '@/components/PhraseView.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { findSong, outOfRange, readCols, readDensity, touch, writeCols, writeDensity } from '@/composables/useLibrary'
import { prefs } from '@/composables/usePrefs'
import { useWakeLock } from '@/composables/useWakeLock'
import { getInstrument } from '@/data/instruments'
import type { Phrase, PhraseStatus } from '@/types'

const route = useRoute()
const songId = computed(() => String(route.params.id))
const song = computed(() => findSong(songId.value))
const instrument = computed(() => getInstrument(song.value?.instrument))

/** Keeps the screen awake while both hands are on the instrument. */
useWakeLock()

/** Phrases visible at once. 0 means all of them, -1 means fit the viewport. */
const AUTO = -1

const DENSITIES = [
  { value: AUTO, label: 'Auto', cardSize: '185px' },
  { value: 1, label: '1', cardSize: '340px' },
  { value: 2, label: '2', cardSize: '250px' },
  { value: 4, label: '4', cardSize: '185px' },
  { value: 8, label: '8', cardSize: '135px' },
  { value: 0, label: 'All', cardSize: '110px' },
]

const DENSITY_OPTIONS = DENSITIES.map((d) => ({
  value: d.value,
  label: d.label,
  ariaLabel:
    d.value === AUTO
      ? 'Fit phrases to the screen automatically'
      : d.value === 0
        ? 'All phrases on one page'
        : `${d.value} phrases per page`,
}))

/**
 * On a phone a card size in pixels means nothing — what matters is how many
 * fingerings fit across the screen. Below `md` this drives the grid instead.
 */
const COLS = [2, 3, 4, 5, 6]
const COL_OPTIONS = COLS.map((n) => ({
  value: n,
  label: String(n),
  ariaLabel: `${n} fingerings per row`,
}))

const STATUS_LABEL: Record<PhraseStatus, string> = {
  new: 'New',
  shaky: 'Shaky',
  learned: 'Learned',
}

const STATUS_NEXT: Record<PhraseStatus, PhraseStatus> = {
  new: 'shaky',
  shaky: 'learned',
  learned: 'new',
}

const density = ref(readDensity(songId.value) ?? 2)
const cols = ref(readCols(songId.value) ?? 3)
const page = ref(0)
const chromeless = ref(false)
/** One phrase, alone on the screen. The "play this bit again" mode. */
const solo = ref<string | null>(null)
/** Index into the visible page's notes. The place you have got to. */
const cursor = ref<number | null>(null)
const autoTurning = ref(false)

const viewport = ref({ width: 1280, height: 800 })

/**
 * Auto density: pick the largest cards whose page still fits the screen.
 * Estimated from the card size because measuring the rendered grid would mean
 * laying out, measuring, relaying out — visible every time the page turns.
 */
const autoDensity = computed(() => {
  const usable = viewport.value.height - (chromeless.value ? 40 : 210)
  const perPhrase = (size: number) => size * 1.3 + 44
  for (const option of DENSITIES) {
    if (option.value <= 0) continue
    const size = Number.parseInt(option.cardSize, 10)
    if (option.value * perPhrase(size) <= usable) return option.value
  }
  return 8
})

const effectiveDensity = computed(() => (density.value === AUTO ? autoDensity.value : density.value))

const cardSize = computed(
  () => DENSITIES.find((d) => d.value === effectiveDensity.value)?.cardSize ?? '185px',
)

/** Learned phrases can be hidden once they stop needing the screen. */
const phrases = computed<Phrase[]>(() => {
  const all = song.value?.phrases ?? []
  if (solo.value) return all.filter((p) => p.id === solo.value)
  if (!prefs.hideLearned) return all
  const kept = all.filter((p) => p.status !== 'learned')
  return kept.length ? kept : all
})

const pageSize = computed(() =>
  solo.value || effectiveDensity.value === 0
    ? Math.max(phrases.value.length, 1)
    : effectiveDensity.value,
)

const pageCount = computed(() => Math.max(1, Math.ceil(phrases.value.length / pageSize.value)))

const visible = computed(() => {
  const start = page.value * pageSize.value
  let offset = 0
  return phrases.value.slice(start, start + pageSize.value).map((phrase, i) => {
    const entry = { phrase, index: start + i, offset }
    offset += phrase.notes.length
    return entry
  })
})

const visibleNoteCount = computed(() =>
  visible.value.reduce((total, entry) => total + entry.phrase.notes.length, 0),
)

const paginated = computed(() => pageCount.value > 1)

const strays = computed(() => (song.value ? outOfRange(song.value) : []))

function setDensity(value: string | number) {
  const next = Number(value)
  const firstVisible = page.value * pageSize.value
  density.value = next
  writeDensity(songId.value, next)
  // Keep the phrase you were looking at on screen when the density changes.
  const size = next === AUTO ? autoDensity.value : next
  page.value = size === 0 ? 0 : Math.floor(firstVisible / size)
}

function setCols(value: string | number) {
  cols.value = Number(value)
  writeCols(songId.value, cols.value)
}

function step(delta: number, manual = true) {
  page.value = Math.min(pageCount.value - 1, Math.max(0, page.value + delta))
  cursor.value = null
  if (manual) autoTurning.value = false
}

/** Advance the cursor a note at a time, turning the page when it runs out. */
function advanceCursor(delta: number) {
  if (visibleNoteCount.value === 0) return
  const next = (cursor.value ?? -1) + delta

  if (next >= visibleNoteCount.value) {
    if (page.value < pageCount.value - 1) {
      step(1)
      cursor.value = 0
    } else {
      cursor.value = null
    }
    return
  }

  if (next < 0) {
    if (page.value > 0) {
      step(-1)
      cursor.value = null
    }
    return
  }

  cursor.value = next
}

function toggleSolo(phraseId: string) {
  solo.value = solo.value === phraseId ? null : phraseId
  page.value = 0
  cursor.value = null
}

function cycleStatus(phrase: Phrase) {
  phrase.status = STATUS_NEXT[phrase.status ?? 'new']
  if (song.value) touch(song.value)
}

/* --------------------------------------------------------- automatic turns */

let turnTimer: ReturnType<typeof setInterval> | undefined

function stopAutoTurn() {
  autoTurning.value = false
}

watch([autoTurning, () => prefs.autoTurnSeconds], () => {
  if (turnTimer) clearInterval(turnTimer)
  if (!autoTurning.value) return
  turnTimer = setInterval(() => {
    if (page.value >= pageCount.value - 1) {
      page.value = 0
      return
    }
    step(1, false)
  }, prefs.autoTurnSeconds * 1000)
})

/* --------------------------------------------------------------- gestures */

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

/** No page scroll while chromeless: the swipe is the only gesture that means anything. */
function lockScroll(locked: boolean) {
  document.documentElement.classList.toggle('practice-locked', locked)
}

function toggleChromeless() {
  chromeless.value = !chromeless.value
  lockScroll(chromeless.value)
  const target = document.documentElement
  if (chromeless.value && !document.fullscreenElement) {
    void target.requestFullscreen?.().catch(() => {})
  } else if (!chromeless.value && document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => {})
  }
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  switch (event.key) {
    case 'ArrowRight':
    case 'j':
      step(1)
      break
    case 'ArrowLeft':
    case 'k':
      step(-1)
      break
    case ' ':
      advanceCursor(1)
      break
    case 'Backspace':
      advanceCursor(-1)
      break
    case 'f':
      toggleChromeless()
      break
    case 's': {
      const first = visible.value[0]?.phrase.id
      if (first) toggleSolo(solo.value ? solo.value : first)
      break
    }
    case 'p':
      autoTurning.value = !autoTurning.value
      break
    case 'Escape':
      if (solo.value) solo.value = null
      else if (chromeless.value) toggleChromeless()
      else stopAutoTurn()
      break
    default:
      return
  }
  event.preventDefault()
}

/** Paper still beats a screen for some people. The stylesheet does the rest. */
function printSheet() {
  window.print()
}

/** Tap the left or right edge to turn the page — no free hand required. */
function onTapZone(delta: number) {
  step(delta)
}

watch(pageCount, (count) => {
  if (page.value > count - 1) page.value = count - 1
})

watch(page, () => {
  cursor.value = null
})

/** The browser can drop out of fullscreen on its own; don't leave the lock behind. */
function onFullscreenChange() {
  if (!document.fullscreenElement && chromeless.value) {
    chromeless.value = false
    lockScroll(false)
  }
}

function measure() {
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
}

function onVisibility() {
  if (document.visibilityState === 'hidden') stopAutoTurn()
}

onMounted(() => {
  measure()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', measure)
  window.addEventListener('orientationchange', measure)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measure)
  window.removeEventListener('orientationchange', measure)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('visibilitychange', onVisibility)
  if (turnTimer) clearInterval(turnTimer)
  // Leaving the page while chromeless must not leave the scroll locked.
  lockScroll(false)
})
</script>

<template>
  <AppNav v-if="!chromeless" />

  <main v-if="song" class="tight-landscape mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
    <div v-if="!chromeless" class="md:flex md:flex-wrap md:items-end md:justify-between md:gap-4">
      <div class="min-w-0">
        <!-- Sideways on a phone the nav is right there; this line is pure cost. -->
        <RouterLink to="/" class="tight-landscape-hide text-sm text-parchment-dim hover:text-parchment">
          ← All songs
        </RouterLink>
        <h1 class="tight-landscape-title mt-1 truncate font-display text-2xl text-parchment md:text-3xl">
          {{ song.title }}
        </h1>
        <p v-if="song.subtitle" class="tight-landscape-hide mt-1 truncate text-sm text-parchment-dim">
          {{ song.subtitle }}
        </p>
        <p class="tight-landscape-hide mt-1 text-xs text-parchment-dim/70">
          {{ instrument.name }}
          <span v-if="strays.length" class="text-red-300">
            · {{ strays.length }} note{{ strays.length === 1 ? '' : 's' }} out of range
          </span>
        </p>
      </div>

      <!--
        Controls stay put on a phone: density, zoom and page are always a thumb
        away. At `md` the wrapper dissolves (`display: contents`) so the controls
        sit back in the title row exactly as they always have.
      -->
      <div class="print-hide tight-landscape sticky top-0 z-10 -mx-4 mt-3 bg-ink/95 px-4 py-1.5 backdrop-blur md:contents">
        <div class="tight-landscape-controls flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <SegmentedControl
            :model-value="density"
            :options="DENSITY_OPTIONS"
            accent="gold"
            label="Phrases"
            @update:model-value="setDensity"
          />

          <!-- Second line on a phone; at `md` it dissolves back into the row. -->
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 md:contents">
            <!-- Card width in pixels is a desktop idea; on a phone you pick columns. -->
            <div class="grid-mode-only shrink-0 items-center gap-2">
              <SegmentedControl
                :model-value="cols"
                :options="COL_OPTIONS"
                label="Per row"
                @update:model-value="setCols"
              />
            </div>

            <NotationToggle class="tight-landscape-hide hidden md:flex" />

            <div class="ml-auto flex items-center gap-1 md:ml-0 md:gap-3">
              <button
                type="button"
                class="px-3 py-2 text-sm transition-colors"
                :class="autoTurning ? 'text-gold' : 'text-parchment-dim hover:text-parchment'"
                :aria-pressed="autoTurning"
                @click="autoTurning = !autoTurning"
              >
                {{ autoTurning ? '❚❚ Turning' : '▶ Auto-turn' }}
              </button>

              <label
                v-if="autoTurning"
                class="flex items-center gap-1 text-xs text-parchment-dim"
              >
                <input
                  v-model.number="prefs.autoTurnSeconds"
                  type="number"
                  min="2"
                  max="120"
                  class="w-14 rounded-sm border border-white/10 bg-stone px-1 py-1 text-center text-parchment"
                  aria-label="Seconds between page turns"
                />
                s
              </label>

              <RouterLink
                :to="`/song/${song.id}/edit`"
                class="px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
              >
                Edit
              </RouterLink>

              <button
                type="button"
                class="tight-landscape-hide px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
                @click="printSheet"
              >
                Print
              </button>

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

        <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-parchment-dim md:mt-4 md:w-full">
          <template v-if="paginated">
            <button type="button" class="px-3 py-2 hover:text-parchment md:px-2 md:py-1" @click="step(-1)">
              ←
            </button>
            <span>Page {{ page + 1 }} of {{ pageCount }}</span>
            <button type="button" class="px-3 py-2 hover:text-parchment md:px-2 md:py-1" @click="step(1)">
              →
            </button>
            <span class="tight-landscape-hide hidden text-parchment-dim/60 md:inline">
              ← → or j / k · space steps a note · s solos · p auto-turns
            </span>
            <span class="text-parchment-dim/60 md:hidden">or swipe</span>
          </template>

          <button
            type="button"
            class="tight-landscape-hide px-2 py-1 text-xs transition-colors"
            :class="prefs.hideLearned ? 'text-kokiri' : 'text-parchment-dim/70 hover:text-parchment'"
            :aria-pressed="prefs.hideLearned"
            @click="prefs.hideLearned = !prefs.hideLearned"
          >
            {{ prefs.hideLearned ? 'Hiding learned phrases' : 'Hide learned phrases' }}
          </button>

          <button
            v-if="solo"
            type="button"
            class="px-2 py-1 text-xs text-gold"
            @click="solo = null"
          >
            Leave solo (esc)
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="paginated" class="mt-4 flex items-center gap-3 text-sm text-parchment-dim opacity-40">
      <button type="button" class="px-3 py-2 hover:text-parchment" @click="step(-1)">←</button>
      <span>Page {{ page + 1 }} of {{ pageCount }}</span>
      <button type="button" class="px-3 py-2 hover:text-parchment" @click="step(1)">→</button>
    </div>

    <section
      class="screen-only tight-landscape-gap relative mt-4 flex flex-col gap-8 md:mt-6"
      :style="{ '--card-size': cardSize, '--card-cols': cols }"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!--
        Fullscreen means both hands are busy. The outer thirds of the notes are
        page-turn targets, so an elbow or a knuckle can do the job a swipe does.
      -->
      <template v-if="chromeless">
        <button
          type="button"
          class="tap-zone left-0"
          aria-label="Previous page"
          @click="onTapZone(-1)"
        />
        <button type="button" class="tap-zone right-0" aria-label="Next page" @click="onTapZone(1)" />
      </template>

      <article
        v-for="entry in visible"
        :key="entry.phrase.id"
        class="print-break-avoid border-l-2 pl-3 md:pl-4"
        :class="entry.phrase.status === 'learned' ? 'border-kokiri/60' : 'border-glaze/40'"
      >
        <h2 class="mb-2 flex flex-wrap items-center gap-2 text-xs tracking-widest text-parchment-dim uppercase">
          <button
            type="button"
            class="hover:text-parchment"
            :title="solo === entry.phrase.id ? 'Back to the whole song' : 'Practise this phrase alone'"
            @click="toggleSolo(entry.phrase.id)"
          >
            {{ entry.phrase.label || `Phrase ${entry.index + 1}` }}
          </button>

          <span v-if="(entry.phrase.repeat ?? 1) > 1" class="text-gold">×{{ entry.phrase.repeat }}</span>

          <button
            type="button"
            class="print-hide rounded-xs border px-1.5 py-0.5 text-[10px] tracking-wider transition-colors"
            :class="
              entry.phrase.status === 'learned'
                ? 'border-kokiri/60 text-kokiri'
                : entry.phrase.status === 'shaky'
                  ? 'border-gold/60 text-gold'
                  : 'border-white/10 text-parchment-dim/70 hover:text-parchment'
            "
            :title="'Mark how solid this phrase feels'"
            @click="cycleStatus(entry.phrase)"
          >
            {{ STATUS_LABEL[entry.phrase.status ?? 'new'] }}
          </button>
        </h2>

        <PhraseView
          v-if="entry.phrase.notes.length"
          :notes="entry.phrase.notes"
          :instrument="song.instrument"
          :cursor="cursor === null ? null : cursor - entry.offset"
        />
        <p v-else class="text-sm text-parchment-dim/70 italic">
          Empty phrase — a breath.
          <RouterLink :to="`/song/${song.id}/edit`" class="text-glaze underline">Add notes</RouterLink>
        </p>
      </article>
    </section>

    <!--
      Paper does not paginate the way the screen does: a printed sheet is the
      whole song, every phrase, in order. Only ever visible to the printer.
    -->
    <section class="print-only mt-4 flex flex-col gap-6" :style="{ '--card-size': '120px', '--card-cols': 6 }">
      <article
        v-for="(phrase, index) in song.phrases"
        :key="`print-${phrase.id}`"
        class="print-break-avoid border-l-2 border-glaze/40 pl-3"
      >
        <h2 class="mb-2 text-xs tracking-widest uppercase">
          {{ phrase.label || `Phrase ${index + 1}` }}
          <span v-if="(phrase.repeat ?? 1) > 1">×{{ phrase.repeat }}</span>
        </h2>
        <PhraseView
          v-if="phrase.notes.length"
          :notes="phrase.notes"
          :instrument="song.instrument"
          :hints="false"
        />
        <p v-else class="text-sm italic">Empty phrase — a breath.</p>
      </article>
    </section>

    <button
      v-if="chromeless"
      type="button"
      class="print-hide fixed right-4 bottom-4 rounded-sm border border-white/10 bg-ink/90 px-4 py-3 text-xs text-parchment-dim hover:text-parchment"
      @click="toggleChromeless"
    >
      Exit fullscreen<span class="hidden md:inline"> (esc)</span>
    </button>
  </main>

  <main v-else class="mx-auto max-w-[900px] px-4 py-8 md:px-6">
    <p class="text-parchment-dim">
      That song is gone — no phrases, not even a breath.
      <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
    </p>
  </main>
</template>

<style scoped>
/*
 * Invisible, full-height targets down each edge. They sit under the cards in
 * stacking order so a deliberate tap on a fingering still hits the fingering.
 */
.tap-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 0;
  width: 28%;
  background: transparent;
}
</style>
