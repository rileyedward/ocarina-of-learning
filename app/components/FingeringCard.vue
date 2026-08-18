<script setup lang="ts">
import { computed } from 'vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import { DEFAULT_INSTRUMENT_ID, getInstrument, playable, usesGroup } from '@/data/instruments'
import { prefs } from '@/composables/usePrefs'
import { displayLetter } from '@/utils/pitch'
import { getNote } from '@/data/fingerings'
import type { NoteId, PhraseNote } from '@/types'

/**
 * One event: the diagram, the letter, the octave. Nothing else.
 * Sizes entirely off the `--card-size` custom property of an ancestor, except
 * on narrow screens where the card fills its grid column instead. Either way
 * the type scales off the card's own width via container queries.
 */
const props = withDefaults(
  defineProps<{
    /** A bare note — what the reference and scale screens have. */
    note?: NoteId
    /** A phrase event, which may carry a note value or be a rest. */
    entry?: PhraseNote
    instrument?: string
    /** The note before this one, for the change-of-fingering hints. */
    prev?: NoteId | null
    /** Show the per-note caveat text when the note has one. */
    showCaveat?: boolean
    /** Ring the card — the practice cursor. */
    current?: boolean
  }>(),
  {
    note: undefined,
    entry: undefined,
    instrument: DEFAULT_INSTRUMENT_ID,
    prev: null,
    showCaveat: false,
    current: false,
  },
)

/** Fractions rather than musical glyphs: every font has these. */
const DURATION_LABEL: Record<number, string> = {
  1: '1',
  2: '½',
  4: '¼',
  8: '⅛',
  16: '¹⁄₁₆',
}

const event = computed<PhraseNote>(() => props.entry ?? { note: props.note ?? null })
const noteId = computed(() => event.value.note)
const instrument = computed(() => getInstrument(props.instrument))

const note = computed(() => (noteId.value ? getNote(noteId.value) : null))
const dimSubholes = computed(
  () => !!noteId.value && !usesGroup(instrument.value, noteId.value, 'sub'),
)
const inRange = computed(() => !noteId.value || playable(instrument.value, noteId.value))

const letter = computed(() =>
  noteId.value ? displayLetter(noteId.value, prefs.enharmonic) : '',
)

const caveat = computed(() =>
  noteId.value ? instrument.value.caveats?.[noteId.value] ?? note.value?.note : undefined,
)

const durationLabel = computed(() => {
  const dur = event.value.dur
  if (!dur) return ''
  return `${DURATION_LABEL[dur] ?? dur}${event.value.dotted ? '·' : ''}`
})
</script>

<template>
  <figure
    class="fingering-card print-break-avoid print-surface relative flex flex-col items-center gap-1 rounded-sm border bg-stone px-2 pt-2 pb-1"
    :class="current ? 'border-gold ring-2 ring-gold/50' : 'border-white/5'"
    :aria-current="current ? 'true' : undefined"
  >
    <span v-if="durationLabel" class="duration-badge absolute top-1 right-1.5 text-parchment-dim">
      {{ durationLabel }}
    </span>

    <!-- A rest is a real event, so it gets a real card rather than a gap. -->
    <template v-if="!noteId">
      <div class="flex w-full flex-1 items-center justify-center py-4">
        <svg viewBox="0 0 40 40" class="w-1/2" role="img">
          <title>Rest</title>
          <path
            d="M 12,8 q 12,8 3,16 q -9,8 3,16"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            class="text-parchment-dim"
          />
        </svg>
      </div>
      <figcaption class="note-octave font-body text-parchment-dim">rest</figcaption>
    </template>

    <template v-else>
      <FingeringDiagram
        :note="noteId"
        :instrument="instrument.id"
        :prev="prev"
        :dim-subholes="dimSubholes"
        :label="`${letter}${note?.octave ?? ''}`"
      />

      <figcaption class="flex items-baseline justify-center gap-1 leading-none">
        <span class="note-letter font-note font-bold text-parchment">{{ letter }}</span>
        <span class="note-octave font-body text-parchment-dim">{{ note?.octave }}</span>
      </figcaption>

      <p v-if="!inRange" class="note-caveat text-center text-red-300/90 italic">
        Out of range on the {{ instrument.name }}.
      </p>
      <p
        v-else-if="showCaveat && caveat"
        class="note-caveat text-center text-parchment-dim/80 italic"
      >
        {{ caveat }}
      </p>
    </template>
  </figure>
</template>

<style scoped>
.fingering-card {
  width: var(--card-size, 180px);
  container-type: inline-size;
}

/* In column mode the card fills its track, so type follows the real width. */
@media (max-width: 47.99rem), (max-height: 30rem) and (orientation: landscape) {
  .fingering-card {
    width: 100%;
  }
}

.note-letter {
  font-size: 30cqw;
}

.note-octave {
  font-size: 11cqw;
}

.note-caveat {
  font-size: 6cqw;
  line-height: 1.35;
}

.duration-badge {
  font-family: var(--font-note);
  font-size: 9cqw;
  line-height: 1;
}

/* Same ratios for engines without container queries. */
@supports not (container-type: inline-size) {
  .note-letter {
    font-size: calc(var(--card-size, 180px) * 0.3);
  }

  .note-octave {
    font-size: calc(var(--card-size, 180px) * 0.11);
  }

  .note-caveat {
    font-size: calc(var(--card-size, 180px) * 0.06);
  }

  .duration-badge {
    font-size: calc(var(--card-size, 180px) * 0.09);
  }
}
</style>
