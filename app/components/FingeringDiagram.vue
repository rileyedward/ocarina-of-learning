<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_INSTRUMENT_ID, coveredFor, describeFingering, getInstrument, transition } from '@/data/instruments'
import { prefs } from '@/composables/usePrefs'
import type { HoleKey, NoteId } from '@/types'

/**
 * The signature element. Purely presentational and stateless.
 * Geometry comes from the instrument, so a new ocarina is a data change rather
 * than a component change, and the viewBox carries all of it — the same
 * component serves a 52px chip and a 340px practice card.
 */
const props = withDefaults(
  defineProps<{
    /** Either a note on an instrument, or an explicit hole set (reverse lookup). */
    note?: NoteId | null
    covered?: HoleKey[]
    instrument?: string
    /** The note before this one. Drives the change-of-fingering hints. */
    prev?: NoteId | null
    /** Explicit width. Omit to fill the container (drives off `--card-size`). */
    size?: 'sm' | 'md' | 'lg' | number
    /** Dim the sub-holes on notes that never use them. */
    dimSubholes?: boolean
    label?: string
    /** Paint each hole's short name beside it. */
    showLabels?: boolean
    /** Suppress the change hints even when `prev` is given. */
    noHints?: boolean
    /** Hole ids the viewer may click. Reverse lookup only. */
    interactive?: boolean
  }>(),
  {
    note: null,
    covered: undefined,
    instrument: DEFAULT_INSTRUMENT_ID,
    prev: null,
    size: undefined,
    dimSubholes: false,
    label: undefined,
    showLabels: false,
    noHints: false,
    interactive: false,
  },
)

const emit = defineEmits<{ toggle: [hole: HoleKey] }>()

const NAMED_SIZES = { sm: 48, md: 140, lg: 320 } as const

const instrument = computed(() => getInstrument(props.instrument))

const width = computed(() => {
  if (props.size === undefined) return '100%'
  if (typeof props.size === 'number') return `${props.size}px`
  return `${NAMED_SIZES[props.size]}px`
})

const coveredSet = computed(() => {
  const holes = props.covered ?? (props.note ? coveredFor(instrument.value, props.note) : [])
  return new Set<HoleKey>(holes)
})

const isCovered = (hole: HoleKey) => coveredSet.value.has(hole)

/** Hints only earn their pixels where the diagram is big enough to read them. */
const hintable = computed(() => {
  if (props.noHints || !prefs.transitionHints || !props.prev || !props.note) return false
  const size = props.size
  if (size === undefined || size === 'lg' || size === 'md') return true
  return typeof size === 'number' ? size >= 90 : false
})

const changes = computed(() =>
  hintable.value && props.note
    ? transition(instrument.value, props.prev, props.note)
    : { lift: new Set<HoleKey>(), press: new Set<HoleKey>() },
)

/** Below picker size the LH/RH labels are noise, not information. */
const showCues = computed(() => {
  const size = props.size
  if (size === undefined || size === 'lg' || size === 'md') return true
  return typeof size === 'number' ? size >= 100 : false
})

const showHoleText = computed(
  () => (props.showLabels || prefs.showHoleLabels) && showCues.value,
)

const frontHoles = computed(() => instrument.value.holes.filter((h) => h.group === 'front'))
const subHoles = computed(() => instrument.value.holes.filter((h) => h.group === 'sub'))
const thumbHoles = computed(() => instrument.value.holes.filter((h) => h.group === 'thumb'))

const title = computed(() => {
  if (props.label && props.note) return describeFingering(instrument.value, props.note, props.label)
  if (props.note) return describeFingering(instrument.value, props.note, props.note)
  return props.label ?? `Fingering: ${coveredSet.value.size} of ${instrument.value.holes.length} holes covered`
})

const holeClass = (hole: HoleKey) => [
  isCovered(hole) ? 'hole-covered' : 'hole-open',
  changes.value.lift.has(hole) ? 'hole-lift' : '',
  changes.value.press.has(hole) ? 'hole-press' : '',
  props.interactive ? 'hole-interactive' : '',
]

const bodyTransform = computed(() => {
  const { rotate, rotateAbout } = instrument.value
  if (!rotate || !rotateAbout) return undefined
  return `rotate(${rotate} ${rotateAbout[0]} ${rotateAbout[1]})`
})
</script>

<template>
  <svg
    :style="{ width }"
    class="fingering-diagram block h-auto"
    :viewBox="instrument.viewBox"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
  >
    <title>{{ title }}</title>

    <!-- The instrument sits at a slight angle, the way it does in a maker's chart. -->
    <g :transform="bodyTransform">
      <path
        v-for="(path, i) in instrument.bodyPaths"
        :key="`body-${i}`"
        :d="path"
        class="ocarina-body"
        stroke-linejoin="round"
      />

      <!-- Seam along the top edge: keeps the silhouette from reading as a blob. -->
      <path v-if="instrument.seamPath" :d="instrument.seamPath" class="ocarina-seam" />

      <circle
        v-for="hole in frontHoles"
        :key="hole.id"
        :cx="hole.cx"
        :cy="hole.cy"
        :r="hole.r"
        :class="holeClass(hole.id)"
        @click="interactive && emit('toggle', hole.id)"
      >
        <title>{{ hole.label }}</title>
      </circle>

      <g :class="{ 'opacity-25': dimSubholes }">
        <circle
          v-for="hole in subHoles"
          :key="hole.id"
          :cx="hole.cx"
          :cy="hole.cy"
          :r="hole.r"
          :class="holeClass(hole.id)"
          @click="interactive && emit('toggle', hole.id)"
        >
          <title>{{ hole.label }}</title>
        </circle>
      </g>

      <!-- Hand cue, sat in the empty band under each row. -->
      <g v-if="showCues && instrument.cues" class="ocarina-cue">
        <text v-for="cue in instrument.cues" :key="cue.text" :x="cue.x" :y="cue.y" text-anchor="middle">
          {{ cue.text }}
        </text>
      </g>
    </g>

    <circle
      v-for="hole in thumbHoles"
      :key="hole.id"
      :cx="hole.cx"
      :cy="hole.cy"
      :r="hole.r"
      :class="holeClass(hole.id)"
      @click="interactive && emit('toggle', hole.id)"
    >
      <title>{{ hole.label }}</title>
    </circle>

    <!-- Names beside each hole, for anyone still learning which finger is which. -->
    <g v-if="showHoleText" class="hole-label">
      <text
        v-for="hole in instrument.holes"
        :key="`label-${hole.id}`"
        :x="hole.cx"
        :y="hole.cy - hole.r - 4"
        text-anchor="middle"
      >
        {{ hole.short }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.ocarina-body {
  fill: var(--color-clay);
  stroke: var(--color-clay-edge);
  stroke-width: 2.5;
}

.ocarina-seam {
  fill: none;
  stroke: var(--color-clay-edge);
  stroke-width: 1.5;
  opacity: 0.35;
}

.hole-covered {
  fill: var(--color-gold);
  stroke: none;
}

/* Solid fill, not transparent: open rings have to pop off the body. */
.hole-open {
  fill: var(--color-ink);
  stroke: var(--color-parchment-dim);
  stroke-width: 2.5;
}

/*
 * The change from the previous note — the part that is actually hard to play.
 * A hole you must lift keeps a dashed ghost of its old covered state; a hole
 * you must press gets a ring around it. Both read at a glance without
 * changing what the covered/open fill means.
 */
.hole-lift {
  stroke: var(--color-glaze);
  stroke-width: 3;
  stroke-dasharray: 4 3;
}

.hole-press {
  stroke: var(--color-kokiri);
  stroke-width: 3.5;
  paint-order: stroke;
}

.hole-interactive {
  cursor: pointer;
}

.ocarina-cue {
  fill: var(--color-parchment-dim);
  font-family: var(--font-body);
  font-size: 13px;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.hole-label {
  fill: var(--color-parchment-dim);
  font-family: var(--font-body);
  font-size: 11px;
  opacity: 0.75;
}
</style>
