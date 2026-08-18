<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import InstrumentPicker from '@/components/InstrumentPicker.vue'
import NotationToggle from '@/components/NotationToggle.vue'
import NotePicker from '@/components/NotePicker.vue'
import PhraseView from '@/components/PhraseView.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { findScale, useLibrary } from '@/composables/useLibrary'
import { prefs } from '@/composables/usePrefs'
import { getInstrument } from '@/data/instruments'
import type { NoteId } from '@/types'

const route = useRoute()
useLibrary()

const scale = computed(() => findScale(String(route.params.id)))
const editing = ref(route.query.edit === '1')

const ORDERS = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up & down' },
  { value: 'shuffle', label: 'Shuffled' },
]

const order = ref<'up' | 'down' | 'updown' | 'shuffle'>('up')

/**
 * The same notes, in the order that makes the fingers work. Shuffled is the
 * one that catches the notes you only know as part of a run.
 */
const notes = computed<NoteId[]>(() => {
  const base = scale.value?.notes ?? []
  if (order.value === 'down') return [...base].reverse()
  if (order.value === 'updown') return [...base, ...[...base].reverse().slice(1)]
  if (order.value === 'shuffle') {
    const shuffled = [...base]
    let seed = shuffled.length * 2654435761
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1))
      const a = shuffled[i]
      const b = shuffled[j]
      if (a && b) {
        shuffled[i] = b
        shuffled[j] = a
      }
    }
    return shuffled
  }
  return [...base]
})

const entries = computed(() => notes.value.map((id) => ({ note: id })))

/** Long runs get smaller cards so the whole scale still fits without pagination. */
const cardSize = computed(() => {
  const count = notes.value.length
  if (count > 16) return '150px'
  if (count > 10) return '175px'
  return '200px'
})

/** The same idea on a phone, where columns matter and pixel widths do not. */
const cols = computed(() => (notes.value.length > 10 ? 4 : 3))

function addNote(id: NoteId) {
  scale.value?.notes.push(id)
}

function removeNote(index: number) {
  scale.value?.notes.splice(index, 1)
}
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1500px] px-4 py-6 md:px-6 md:py-8">
    <template v-if="scale">
      <RouterLink to="/scales" class="text-sm text-parchment-dim hover:text-parchment">
        ← All scales
      </RouterLink>

      <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <input
            v-if="editing"
            v-model="scale.name"
            type="text"
            class="w-full border-b border-white/10 bg-transparent pb-1 font-display text-2xl text-parchment focus:border-glaze focus:outline-none md:text-3xl"
          />
          <h1 v-else class="font-display text-2xl text-parchment md:text-3xl">{{ scale.name }}</h1>
          <p class="mt-1 text-sm text-parchment-dim">
            {{ scale.notes.length }} notes<span v-if="scale.seeded"> · shipped with the app</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <SegmentedControl v-model="order" :options="ORDERS" density="tight" />
          <NotationToggle density="tight" />
          <InstrumentPicker v-model="prefs.defaultInstrument" />
          <button
            type="button"
            class="px-3 py-2 text-sm transition-colors"
            :class="editing ? 'text-gold' : 'text-parchment-dim hover:text-parchment'"
            :aria-pressed="editing"
            @click="editing = !editing"
          >
            {{ editing ? 'Done' : 'Edit' }}
          </button>
        </div>
      </div>

      <div
        class="mt-8"
        :style="{ '--card-size': cardSize, '--card-cols': cols }"
      >
        <PhraseView
          v-if="notes.length"
          :notes="entries"
          :instrument="prefs.defaultInstrument"
          :hints="order !== 'shuffle'"
        />
        <p v-else class="text-sm text-parchment-dim/70 italic">
          No notes yet — add some below.
        </p>
      </div>

      <section v-if="editing" class="mt-10 rounded-sm border border-white/10 bg-stone/60 p-4">
        <h2 class="text-xs tracking-widest text-parchment-dim uppercase">Notes in this scale</h2>

        <div v-if="scale.notes.length" class="mt-2 flex flex-wrap gap-1.5">
          <button
            v-for="(id, index) in scale.notes"
            :key="`${id}-${index}`"
            type="button"
            class="rounded-sm border border-white/10 px-2 py-1 font-note text-sm text-parchment transition-colors hover:border-red-400/60"
            title="Click to remove"
            @click="removeNote(index)"
          >
            {{ id }}
          </button>
        </div>

        <h2 class="mt-6 text-xs tracking-widest text-parchment-dim uppercase">Add a note</h2>
        <div class="mt-2">
          <NotePicker :instrument="getInstrument(prefs.defaultInstrument).id" :allow-rest="false" @pick="addNote" />
        </div>
      </section>
    </template>

    <template v-else>
      <p class="text-parchment-dim">
        No such scale — the case is empty.
        <RouterLink to="/scales" class="text-glaze underline">Back to scales</RouterLink>
      </p>
    </template>
  </main>
</template>
