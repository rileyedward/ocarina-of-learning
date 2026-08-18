<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import InstrumentPicker from '@/components/InstrumentPicker.vue'
import NoteEntryBar from '@/components/NoteEntryBar.vue'
import PhraseRow from '@/components/PhraseRow.vue'
import { createSong, findSong, newId, newPhrase, outOfRange, touch } from '@/composables/useLibrary'
import { useHistory } from '@/composables/useHistory'
import { DEFAULT_INSTRUMENT_ID, getInstrument } from '@/data/instruments'
import { parseNoteText } from '@/utils/noteText'
import { displayName } from '@/utils/pitch'
import type { NoteId, PhraseNote, Song } from '@/types'

const route = useRoute()
const router = useRouter()

/** `/song/new` mints a song and swaps the URL for it — there is no draft state. */
const song = ref<Song | undefined>(
  route.path === '/song/new' ? createSong() : findSong(String(route.params.id)),
)

if (route.path === '/song/new' && song.value) {
  void router.replace(`/song/${song.value.id}/edit`)
}

/** The load-bearing state of this screen: which phrase the picker fills. */
const focusedPhraseId = ref<string | null>(song.value?.phrases[0]?.id ?? null)
/** Which note chip has its editor open. */
const selectedNote = ref<{ phraseId: string; index: number } | null>(null)

const focusedPhrase = computed(() =>
  song.value?.phrases.find((p) => p.id === focusedPhraseId.value),
)

const instrumentId = computed({
  get: () => song.value?.instrument ?? DEFAULT_INSTRUMENT_ID,
  set: (value: string) => {
    if (!song.value) return
    song.value.instrument = value
    edited()
  },
})

const instrument = computed(() => getInstrument(instrumentId.value))
const strays = computed(() => (song.value ? outOfRange(song.value) : []))

const phraseListRef = ref<HTMLElement | null>(null)

/**
 * The picker is fixed to the bottom, so the page has to reserve exactly its
 * height — and that height changes with the viewport and with the sheet being
 * open or shut. Measure it rather than guess.
 */
const pickerOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const pickerHeight = ref(0)
let pickerObserver: ResizeObserver | null = null

/**
 * Undo. The editor autosaves, so this is the only way back from a mis-tap.
 * Restoring replaces the phrase array wholesale, which the library's deep
 * autosave watcher picks up like any other edit.
 */
const history = useHistory<Song | undefined>(
  () => (song.value ? JSON.parse(JSON.stringify(song.value)) : undefined),
  (value) => {
    if (!song.value || !value) return
    song.value.title = value.title
    song.value.subtitle = value.subtitle
    song.value.instrument = value.instrument
    song.value.phrases = value.phrases
    song.value.updatedAt = new Date().toISOString()
  },
)

history.prime()

function edited() {
  if (song.value) touch(song.value)
  history.record()
}

/* ------------------------------------------------------------- phrase edits */

function addPhrase() {
  if (!song.value) return
  const phrase = newPhrase()
  song.value.phrases.push(phrase)
  focusedPhraseId.value = phrase.id
  edited()
}

function deletePhrase(id: string) {
  if (!song.value) return
  const index = song.value.phrases.findIndex((p) => p.id === id)
  if (index === -1) return
  song.value.phrases.splice(index, 1)
  if (focusedPhraseId.value === id) {
    focusedPhraseId.value = song.value.phrases[Math.max(0, index - 1)]?.id ?? null
  }
  edited()
}

function duplicatePhrase(index: number) {
  const source = song.value?.phrases[index]
  if (!song.value || !source) return
  const copy = { ...JSON.parse(JSON.stringify(source)), id: newId() }
  song.value.phrases.splice(index + 1, 0, copy)
  focusedPhraseId.value = copy.id
  edited()
}

function movePhrase(index: number, delta: number) {
  movePhraseTo(index, index + delta)
}

function movePhraseTo(from: number, to: number) {
  if (!song.value) return
  if (to < 0 || to >= song.value.phrases.length || from === to) return
  const [phrase] = song.value.phrases.splice(from, 1)
  if (!phrase) return
  song.value.phrases.splice(to, 0, phrase)
  edited()
}

/** Long runs get typed in one go, then chopped into the bits you rehearse. */
function splitPhrase(phraseId: string, at: number) {
  if (!song.value) return
  const index = song.value.phrases.findIndex((p) => p.id === phraseId)
  const phrase = song.value.phrases[index]
  if (!phrase || at <= 0 || at >= phrase.notes.length) return

  const tail = phrase.notes.splice(at)
  const next = newPhrase()
  next.notes = tail
  song.value.phrases.splice(index + 1, 0, next)
  focusedPhraseId.value = next.id
  selectedNote.value = null
  edited()
}

function setRepeat(phraseId: string, value: number) {
  const phrase = song.value?.phrases.find((p) => p.id === phraseId)
  if (!phrase) return
  const count = Math.min(99, Math.max(1, Math.floor(value || 1)))
  if (count <= 1) delete phrase.repeat
  else phrase.repeat = count
  edited()
}

/* --------------------------------------------------------------- note edits */

function appendNotes(notes: PhraseNote[]) {
  const phrase = focusedPhrase.value
  if (!phrase || !notes.length) return
  phrase.notes.push(...notes)
  edited()
}

function appendNote(noteId: NoteId) {
  appendNotes([{ note: noteId }])
}

function appendRest() {
  appendNotes([{ note: null }])
}

function replacePhraseNotes(notes: PhraseNote[]) {
  const phrase = focusedPhrase.value
  if (!phrase) return
  phrase.notes = notes
  selectedNote.value = null
  edited()
}

function removeNote(phraseId: string, index: number) {
  const phrase = song.value?.phrases.find((p) => p.id === phraseId)
  if (!phrase) return
  phrase.notes.splice(index, 1)
  selectedNote.value = null
  edited()
}

function patchNote(phraseId: string, index: number, patch: Partial<PhraseNote>) {
  const phrase = song.value?.phrases.find((p) => p.id === phraseId)
  const entry = phrase?.notes[index]
  if (!entry) return

  if ('dur' in patch) {
    if (patch.dur === undefined) delete entry.dur
    else entry.dur = patch.dur
  }
  if ('dotted' in patch) {
    if (patch.dotted) entry.dotted = true
    else delete entry.dotted
  }
  if ('note' in patch) entry.note = patch.note ?? null
  edited()
}

/* ------------------------------------------------------------ drag and drop */

const draggingPhrase = ref<string | null>(null)
const draggingNote = ref<{ phraseId: string; index: number } | null>(null)

function onDropPhrase(targetId: string) {
  if (!song.value || !draggingPhrase.value || draggingPhrase.value === targetId) return
  const from = song.value.phrases.findIndex((p) => p.id === draggingPhrase.value)
  const to = song.value.phrases.findIndex((p) => p.id === targetId)
  draggingPhrase.value = null
  if (from === -1 || to === -1) return
  movePhraseTo(from, to)
}

/** Splitting a phrase by hand usually means moving a few notes, not retyping. */
function onDropNote(targetPhraseId: string, at: number) {
  const source = draggingNote.value
  draggingNote.value = null
  if (!song.value || !source) return

  const fromPhrase = song.value.phrases.find((p) => p.id === source.phraseId)
  const toPhrase = song.value.phrases.find((p) => p.id === targetPhraseId)
  if (!fromPhrase || !toPhrase) return

  const [entry] = fromPhrase.notes.splice(source.index, 1)
  if (!entry) return

  const adjusted =
    fromPhrase === toPhrase && source.index < at ? Math.max(0, at - 1) : at
  toPhrase.notes.splice(adjusted, 0, entry)
  selectedNote.value = null
  edited()
}

/* ---------------------------------------------------------------- keyboard */

/** The octave a bare letter lands in. Follows whatever you typed last. */
const typingOctave = ref(5)

function appendLetter(letter: string) {
  const notes = parseNoteText(`${letter}${typingOctave.value}`)
  if (!notes.length) return
  appendNotes(notes)
}

/** `#` and `b` reshape the note you just entered rather than adding another. */
function alterLast(direction: 'sharp' | 'flat') {
  const phrase = focusedPhrase.value
  const entry = phrase?.notes[phrase.notes.length - 1]
  if (!entry?.note) return

  const shifted = shiftNote(entry.note, direction === 'sharp' ? 1 : -1)
  if (shifted) {
    entry.note = shifted
    edited()
  }
}

/** Semitone neighbours, using the fingering table's own ordering. */
function shiftNote(note: NoteId, delta: number): NoteId | null {
  const range = instrument.value.range
  const index = range.indexOf(note)
  if (index === -1) return null
  return range[index + delta] ?? null
}

function shiftLastOctave(delta: number) {
  const phrase = focusedPhrase.value
  const entry = phrase?.notes[phrase.notes.length - 1]
  if (!entry?.note) return

  const shifted = shiftNote(entry.note, delta * 12)
  if (!shifted) return
  entry.note = shifted
  typingOctave.value = Math.min(6, Math.max(4, typingOctave.value + delta))
  edited()
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  const meta = event.metaKey || event.ctrlKey

  if (meta && event.key.toLowerCase() === 'z') {
    if (event.shiftKey) history.redo()
    else history.undo()
    event.preventDefault()
    return
  }

  if (event.key === 'Backspace') {
    const phrase = focusedPhrase.value
    if (!phrase || phrase.notes.length === 0) return
    phrase.notes.pop()
    edited()
    event.preventDefault()
    return
  }

  if (event.key === 'Enter') {
    addPhrase()
    event.preventDefault()
    return
  }

  if (/^[a-g]$/i.test(event.key)) {
    appendLetter(event.key.toLowerCase())
    event.preventDefault()
    return
  }

  if (event.key === '#') {
    alterLast('sharp')
    event.preventDefault()
    return
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    shiftLastOctave(event.key === 'ArrowUp' ? 1 : -1)
    event.preventDefault()
    return
  }

  if (event.key === 'r') {
    appendRest()
    event.preventDefault()
  }
}

// Keep the newly added phrase in view without any animation.
watch(focusedPhraseId, async (id) => {
  if (!id) return
  await Promise.resolve()
  phraseListRef.value?.querySelector(`[data-phrase="${id}"]`)?.scrollIntoView({ block: 'nearest' })
})

function measurePicker() {
  pickerHeight.value = pickerRef.value?.getBoundingClientRect().height ?? 0
}

// Opening the sheet changes the height; so does rotating the phone.
watch(pickerOpen, () => void nextTick(measurePicker))

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', measurePicker)
  measurePicker()
  if (typeof ResizeObserver === 'undefined' || !pickerRef.value) return
  pickerObserver = new ResizeObserver(measurePicker)
  pickerObserver.observe(pickerRef.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measurePicker)
  pickerObserver?.disconnect()
})

const focusedLabel = computed(() => {
  const phrase = focusedPhrase.value
  if (!phrase || !song.value) return 'no phrase selected'
  return phrase.label || `Phrase ${song.value.phrases.indexOf(phrase) + 1}`
})
</script>

<template>
  <AppNav />

  <template v-if="song">
    <main
      class="mx-auto max-w-[1100px] px-4 pt-6 md:px-6"
      :style="{ paddingBottom: `${pickerHeight + 24}px` }"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <RouterLink to="/" class="text-sm text-parchment-dim hover:text-parchment">
          ← All songs
        </RouterLink>

        <div class="flex items-center gap-1 text-sm">
          <button
            type="button"
            class="px-2 py-2 text-parchment-dim hover:text-parchment disabled:opacity-30"
            :disabled="!history.canUndo.value"
            title="Undo (⌘Z)"
            @click="history.undo()"
          >
            ↺ Undo
          </button>
          <button
            type="button"
            class="px-2 py-2 text-parchment-dim hover:text-parchment disabled:opacity-30"
            :disabled="!history.canRedo.value"
            title="Redo (⇧⌘Z)"
            @click="history.redo()"
          >
            ↻ Redo
          </button>
          <RouterLink
            :to="`/song/${song.id}`"
            class="bg-glaze/20 px-4 py-2 text-parchment transition-colors hover:bg-glaze/30"
          >
            Practise this →
          </RouterLink>
        </div>
      </div>

      <!-- A. Song metadata -->
      <section class="mt-4 flex flex-col gap-2">
        <input
          v-model="song.title"
          type="text"
          placeholder="Song title"
          class="w-full border-b border-white/10 bg-transparent pb-1 font-display text-2xl text-parchment placeholder:text-parchment-dim/50 focus:border-glaze focus:outline-none md:text-3xl"
          @input="edited"
        />
        <input
          v-model="song.subtitle"
          type="text"
          placeholder="Arrangement source, difficulty, anything"
          class="w-full bg-transparent text-sm text-parchment-dim placeholder:text-parchment-dim/50 focus:outline-none"
          @input="edited"
        />

        <div class="mt-2 flex flex-wrap items-center gap-4">
          <InstrumentPicker v-model="instrumentId" />

          <p v-if="strays.length" class="text-xs text-red-300">
            {{ strays.map((n) => displayName(n, 'flat')).join(', ') }} out of range on the
            {{ instrument.name }} — kept, but unplayable there.
          </p>
        </div>
      </section>

      <!-- B. Phrase list -->
      <section ref="phraseListRef" class="mt-8 flex flex-col gap-3">
        <PhraseRow
          v-for="(phrase, index) in song.phrases"
          :key="phrase.id"
          :phrase="phrase"
          :index="index"
          :total="song.phrases.length"
          :focused="focusedPhraseId === phrase.id"
          :instrument="instrumentId"
          :selected="selectedNote?.phraseId === phrase.id ? selectedNote.index : null"
          @focus="focusedPhraseId = phrase.id"
          @move="movePhrase(index, $event)"
          @remove="deletePhrase(phrase.id)"
          @duplicate="duplicatePhrase(index)"
          @split="splitPhrase(phrase.id, $event)"
          @select-note="selectedNote = $event === null ? null : { phraseId: phrase.id, index: $event }"
          @remove-note="removeNote(phrase.id, $event)"
          @patch-note="(i, patch) => patchNote(phrase.id, i, patch)"
          @set-repeat="setRepeat(phrase.id, $event)"
          @edited="edited"
          @drag-note="draggingNote = $event"
          @drop-note="onDropNote(phrase.id, $event)"
          @drag-phrase="draggingPhrase = phrase.id"
          @drop-phrase="onDropPhrase(phrase.id)"
        />

        <button
          type="button"
          class="self-start px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
          @click="addPhrase"
        >
          + Add phrase
        </button>

        <p class="mt-2 text-xs text-parchment-dim/60">
          Keyboard: a–g add a note · r a rest · ↑ ↓ shift the last note an octave · # sharpens ·
          backspace drops the last · enter starts a phrase · ⌘Z undoes.
        </p>
      </section>
    </main>

    <!-- C. Note entry: fixed, so "add phrase" never scrolls it away. -->
    <div
      ref="pickerRef"
      class="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <NoteEntryBar
        v-model:open="pickerOpen"
        :disabled="!focusedPhrase"
        :layout="pickerOpen ? 'grid' : 'row'"
        :instrument="instrumentId"
        :target-label="focusedLabel"
        @pick="appendNote"
        @rest="appendRest"
        @append="appendNotes"
        @replace="replacePhraseNotes"
      />
    </div>
  </template>

  <main v-else class="mx-auto max-w-[900px] px-4 py-8 md:px-6">
    <p class="text-parchment-dim">
      That song is gone — no phrases, not even a breath.
      <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
    </p>
  </main>
</template>
