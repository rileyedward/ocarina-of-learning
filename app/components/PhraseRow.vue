<script setup lang="ts">
import { computed } from 'vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import { getInstrument, playable, usesGroup } from '@/data/instruments'
import { prefs } from '@/composables/usePrefs'
import { displayLetter } from '@/utils/pitch'
import { getNote } from '@/data/fingerings'
import { formatNoteText } from '@/utils/noteText'
import type { Duration, Phrase, PhraseNote } from '@/types'

/**
 * One phrase in the editor: its label, its notes as chips, and the controls
 * that only make sense next to it. The shell owns the song; this owns nothing.
 */
const props = defineProps<{
  phrase: Phrase
  index: number
  total: number
  focused: boolean
  instrument: string
  /** Which note chip is open for editing, if any. */
  selected: number | null
}>()

const emit = defineEmits<{
  focus: []
  move: [delta: number]
  remove: []
  duplicate: []
  split: [at: number]
  selectNote: [index: number | null]
  removeNote: [index: number]
  patchNote: [index: number, patch: Partial<PhraseNote>]
  setRepeat: [value: number]
  edited: []
  dragNote: [from: { phraseId: string; index: number }]
  dropNote: [at: number]
  dragPhrase: []
  dropPhrase: []
}>()

const DURATIONS: { value: Duration | undefined; label: string }[] = [
  { value: undefined, label: '—' },
  { value: 1, label: '1' },
  { value: 2, label: '½' },
  { value: 4, label: '¼' },
  { value: 8, label: '⅛' },
  { value: 16, label: '¹⁄₁₆' },
]

const instrument = computed(() => getInstrument(props.instrument))

const shorthand = computed(() => formatNoteText(props.phrase.notes))

const label = (entry: PhraseNote) =>
  entry.note ? `${displayLetter(entry.note, prefs.enharmonic)}${getNote(entry.note).octave}` : 'rest'

function onNoteDragStart(event: DragEvent, index: number) {
  event.dataTransfer?.setData(
    'application/x-ocarina-note',
    JSON.stringify({ phraseId: props.phrase.id, index }),
  )
  emit('dragNote', { phraseId: props.phrase.id, index })
}
</script>

<template>
  <article
    :data-phrase="phrase.id"
    class="rounded-sm border bg-stone px-4 py-3 transition-colors"
    :class="focused ? 'border-gold ring-1 ring-gold/40' : 'border-white/5 hover:border-white/20'"
    @click="emit('focus')"
    @dragover.prevent
    @drop.prevent="emit('dropPhrase')"
  >
    <header class="flex flex-wrap items-center gap-3">
      <!-- The grip is the drag handle; the arrows stay for keyboards and thumbs. -->
      <span
        class="cursor-grab px-1 text-parchment-dim/60 select-none"
        draggable="true"
        title="Drag to reorder"
        aria-hidden="true"
        @dragstart="emit('dragPhrase')"
      >
        ⠿
      </span>
      <span class="w-4 text-right text-xs text-parchment-dim">{{ index + 1 }}</span>

      <input
        :value="phrase.label"
        type="text"
        :placeholder="`Phrase ${index + 1}`"
        class="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment-dim/60 focus:outline-none"
        @input="
          phrase.label = ($event.target as HTMLInputElement).value;
          emit('edited')
        "
        @focus="emit('focus')"
      />

      <span v-if="focused" class="text-xs tracking-wider text-gold uppercase">Adding here</span>

      <label class="flex items-center gap-1 text-xs text-parchment-dim" @click.stop>
        <span>×</span>
        <input
          :value="phrase.repeat ?? 1"
          type="number"
          min="1"
          max="99"
          class="w-12 rounded-sm border border-white/10 bg-ink px-1 py-0.5 text-center text-parchment"
          :aria-label="`Play phrase ${index + 1} this many times`"
          @input="emit('setRepeat', Number(($event.target as HTMLInputElement).value))"
        />
      </label>

      <div class="flex items-center gap-1 text-xs text-parchment-dim">
        <button
          type="button"
          class="px-1.5 py-1 hover:text-parchment disabled:opacity-30"
          :disabled="index === 0"
          title="Move up"
          @click.stop="emit('move', -1)"
        >
          ↑
        </button>
        <button
          type="button"
          class="px-1.5 py-1 hover:text-parchment disabled:opacity-30"
          :disabled="index === total - 1"
          title="Move down"
          @click.stop="emit('move', 1)"
        >
          ↓
        </button>
        <button
          type="button"
          class="px-1.5 py-1 hover:text-parchment"
          title="Duplicate phrase"
          @click.stop="emit('duplicate')"
        >
          ⧉
        </button>
        <button
          type="button"
          class="px-1.5 py-1 hover:text-red-300"
          title="Delete phrase"
          @click.stop="emit('remove')"
        >
          ✕
        </button>
      </div>
    </header>

    <div v-if="phrase.notes.length" class="mt-2 flex flex-wrap gap-1.5">
      <div v-for="(entry, noteIndex) in phrase.notes" :key="`${phrase.id}-${noteIndex}`" class="relative">
        <button
          type="button"
          draggable="true"
          class="flex w-[64px] flex-col items-center rounded-sm border px-1 py-1 transition-colors"
          :class="
            selected === noteIndex
              ? 'border-gold bg-gold/10'
              : entry.note && !playable(instrument, entry.note)
                ? 'border-red-400/60'
                : 'border-white/10 hover:border-gold/60'
          "
          :title="`${label(entry)} — click to edit, drag to move`"
          @click.stop="emit('selectNote', selected === noteIndex ? null : noteIndex)"
          @dragstart="onNoteDragStart($event, noteIndex)"
          @dragover.prevent
          @drop.prevent.stop="emit('dropNote', noteIndex)"
        >
          <FingeringDiagram
            v-if="entry.note"
            :note="entry.note"
            :instrument="instrument.id"
            :size="52"
            :dim-subholes="!usesGroup(instrument, entry.note, 'sub')"
          />
          <svg v-else viewBox="0 0 40 40" class="h-[52px] w-[52px]" role="img" aria-hidden="true">
            <path
              d="M 12,8 q 12,8 3,16 q -9,8 3,16"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              class="text-parchment-dim"
            />
          </svg>

          <span class="flex items-baseline gap-0.5 leading-none">
            <span class="font-note text-sm font-bold text-parchment">
              {{ entry.note ? displayLetter(entry.note, prefs.enharmonic) : 'r' }}
            </span>
            <span class="font-body text-[9px] text-parchment-dim">
              {{ entry.note ? getNote(entry.note).octave : '' }}
              <template v-if="entry.dur">/{{ entry.dur }}{{ entry.dotted ? '.' : '' }}</template>
            </span>
          </span>
        </button>

        <!-- Editing one note: its value, its dot, and the two destructive moves. -->
        <div
          v-if="selected === noteIndex"
          class="absolute top-full left-0 z-20 mt-1 w-max rounded-sm border border-white/15 bg-ink/95 p-2 shadow-lg backdrop-blur"
          @click.stop
        >
          <div class="flex items-center gap-1">
            <button
              v-for="option in DURATIONS"
              :key="String(option.value)"
              type="button"
              class="min-w-8 rounded-xs px-1.5 py-1 text-xs transition-colors"
              :class="
                entry.dur === option.value
                  ? 'bg-gold/20 text-parchment'
                  : 'text-parchment-dim hover:text-parchment'
              "
              :title="option.value ? `Note value 1/${option.value}` : 'No note value'"
              @click="emit('patchNote', noteIndex, { dur: option.value })"
            >
              {{ option.label }}
            </button>
            <button
              type="button"
              class="rounded-xs px-1.5 py-1 text-xs transition-colors"
              :class="entry.dotted ? 'bg-gold/20 text-parchment' : 'text-parchment-dim hover:text-parchment'"
              title="Dotted"
              @click="emit('patchNote', noteIndex, { dotted: !entry.dotted })"
            >
              ·
            </button>
          </div>

          <div class="mt-1 flex items-center gap-2 text-xs">
            <button
              type="button"
              class="px-1.5 py-1 text-parchment-dim hover:text-parchment"
              @click="emit('patchNote', noteIndex, { note: null })"
            >
              Make rest
            </button>
            <button
              type="button"
              class="px-1.5 py-1 text-parchment-dim hover:text-parchment"
              title="Start a new phrase here"
              @click="emit('split', noteIndex)"
            >
              Split here
            </button>
            <button
              type="button"
              class="px-1.5 py-1 text-red-300 hover:text-red-200"
              @click="emit('removeNote', noteIndex)"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Dropping past the last chip appends rather than doing nothing. -->
      <div
        class="min-h-[52px] w-8 rounded-sm border border-dashed border-white/10"
        aria-hidden="true"
        @dragover.prevent
        @drop.prevent.stop="emit('dropNote', phrase.notes.length)"
      />
    </div>
    <p v-else class="mt-2 text-sm text-parchment-dim/70 italic">
      Empty — pick notes below, or leave it empty as a breath.
    </p>

    <p v-if="phrase.notes.length" class="mt-2 truncate font-note text-[11px] text-parchment-dim/60">
      {{ shorthand }}
    </p>
  </article>
</template>
