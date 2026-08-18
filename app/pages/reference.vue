<script setup lang="ts">
import { computed, ref } from 'vue'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import { ALL_NOTES, isNatural } from '@/data/fingerings'

type Filter = 'all' | 'naturals'

const filter = ref<Filter>('all')

const notes = computed(() =>
  filter.value === 'all' ? ALL_NOTES : ALL_NOTES.filter((n) => isNatural(n.id)),
)
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1500px] px-6 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-3xl text-parchment">Fingering reference</h1>
        <p class="mt-1 text-sm text-parchment-dim">
          12-hole alto C ocarina · 21 notes, A4 to F6 · gold means covered
        </p>
      </div>

      <div class="print-hide flex items-center gap-1 rounded-sm border border-white/10 p-1">
        <button
          v-for="option in (['all', 'naturals'] as Filter[])"
          :key="option"
          type="button"
          class="rounded-xs px-3 py-1.5 text-sm transition-colors"
          :class="
            filter === option
              ? 'bg-glaze/20 text-parchment'
              : 'text-parchment-dim hover:text-parchment'
          "
          :aria-pressed="filter === option"
          @click="filter = option"
        >
          {{ option === 'all' ? 'All notes' : 'Naturals only' }}
        </button>
      </div>
    </div>

    <p
      class="print-surface mt-6 max-w-3xl rounded-sm border-l-2 border-gold/60 bg-stone/60 px-4 py-3 text-sm text-parchment-dim"
    >
      <span class="text-parchment">Accidentals are cross-fingerings and vary by maker.</span>
      C♯6 and D♯6 especially — some makers close the left index instead of the right ring. If the
      chart that came with your ocarina disagrees with this one, use that one.
    </p>

    <div
      class="mt-8 flex flex-wrap gap-4"
      :style="{ '--card-size': '190px' }"
    >
      <FingeringCard v-for="note in notes" :key="note.id" :note="note.id" show-caveat />
    </div>
  </main>
</template>
