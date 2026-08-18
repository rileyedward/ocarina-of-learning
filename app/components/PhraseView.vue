<script setup lang="ts">
import { computed } from 'vue'
import FingeringCard from '@/components/FingeringCard.vue'
import StaffLine from '@/components/StaffLine.vue'
import { prefs } from '@/composables/usePrefs'
import type { PhraseNote } from '@/types'

/**
 * A phrase's notes, drawn whichever way the reader has asked for. Practice,
 * scales and the print sheet all go through here so the notation toggle only
 * has to be honoured in one place.
 */
const props = withDefaults(
  defineProps<{
    notes: PhraseNote[]
    instrument?: string
    /** Index of the note the practice cursor is on. */
    cursor?: number | null
    /** Draw the change-of-fingering hints against the preceding note. */
    hints?: boolean
  }>(),
  { instrument: undefined, cursor: null, hints: true },
)

const showDiagrams = computed(() => prefs.notation !== 'staff')
const showStaff = computed(() => prefs.notation !== 'diagram')

/** The note before each event, skipping rests — rests do not move fingers. */
const previous = computed(() =>
  props.notes.map((_, index) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = props.notes[i]?.note
      if (candidate) return candidate
    }
    return null
  }),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="showStaff" class="staff-wrap overflow-x-auto">
      <StaffLine :notes="notes" :cursor="cursor" />
    </div>

    <div v-if="showDiagrams" class="note-grid">
      <FingeringCard
        v-for="(entry, i) in notes"
        :key="i"
        :entry="entry"
        :instrument="instrument"
        :prev="hints ? previous[i] : null"
        :current="cursor === i"
      />
    </div>
  </div>
</template>

<style scoped>
/* A long phrase scrolls its staff rather than shrinking it past legibility. */
.staff-wrap :deep(svg) {
  min-width: 32rem;
}
</style>
