<script setup lang="ts">
import { computed } from 'vue'
import type { HoleId } from '@/types'

/**
 * The signature element. Purely presentational and stateless.
 * Geometry lives entirely in the viewBox so it scales from a 32px picker glyph
 * to a 400px practice card without layout breakage.
 */
const props = withDefaults(
  defineProps<{
    covered: HoleId[]
    /** Explicit width. Omit to fill the container (drives off `--card-size`). */
    size?: 'sm' | 'md' | 'lg' | number
    /** Dim the sub-holes on notes that never use them. */
    dimSubholes?: boolean
    label?: string
  }>(),
  { size: undefined, dimSubholes: false, label: undefined },
)

const NAMED_SIZES = { sm: 48, md: 140, lg: 320 } as const

const width = computed(() => {
  if (props.size === undefined) return '100%'
  if (typeof props.size === 'number') return `${props.size}px`
  return `${NAMED_SIZES[props.size]}px`
})

const isCovered = (hole: HoleId) => props.covered.includes(hole)

/** Below picker size the LH/RH and UNDERSIDE labels are noise, not information. */
const showCues = computed(() => {
  const size = props.size
  if (size === undefined || size === 'lg' || size === 'md') return true
  return typeof size === 'number' ? size >= 100 : false
})

/**
 * Two mirrored 4-hole clusters, one per hand, reading outward from the centre:
 * index, middle, ring, pinky. The gap down the middle is roughly 2.5x the
 * spacing inside a hand, so the two sides never read as one row of dots.
 */
const FRONT_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'lhPinky', cx: 32, cy: 90, r: 8 },
  { id: 'lhRing', cx: 52, cy: 68, r: 10 },
  { id: 'lhMiddle', cx: 76, cy: 52, r: 10.5 },
  { id: 'lhIndex', cx: 102, cy: 50, r: 10.5 },
  { id: 'rhIndex', cx: 162, cy: 50, r: 10.5 },
  { id: 'rhMiddle', cx: 188, cy: 52, r: 10.5 },
  { id: 'rhRing', cx: 212, cy: 68, r: 10 },
  { id: 'rhPinky', cx: 232, cy: 90, r: 8 },
]

/** Noticeably smaller, tucked beside the pinky hole of each hand. */
const SUB_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'subA', cx: 54, cy: 114, r: 5.5 },
  { id: 'subB', cx: 210, cy: 114, r: 5.5 },
]

const THUMB_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'lhThumb', cx: 190, cy: 182, r: 11 },
  { id: 'rhThumb', cx: 234, cy: 182, r: 11 },
]

const title = computed(
  () => props.label ?? `Fingering: ${props.covered.length} of 12 holes covered`,
)
</script>

<template>
  <svg
    :style="{ width }"
    class="fingering-diagram block h-auto"
    viewBox="0 0 316 212"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
  >
    <title>{{ title }}</title>

    <!-- The instrument sits at a slight angle, the way it does in a maker's chart. -->
    <g transform="rotate(-6 132 80)">
      <!-- Mouthpiece / windway, drawn behind the body so the joint is hidden. -->
      <path
        d="M 234,52 L 300,64 Q 306,78 300,92 L 232,102 Z"
        class="ocarina-body"
        stroke-linejoin="round"
      />

      <!-- Transverse "sweet potato" body: fat left end, tapering to the windway. -->
      <path
        d="M 8,88 C 8,44 42,14 100,14 C 165,14 215,26 240,54 C 252,68 256,82 253,95 C 249,114 222,130 184,138 C 138,148 58,146 28,120 C 13,107 8,98 8,88 Z"
        class="ocarina-body"
      />

      <circle
        v-for="hole in FRONT_HOLES"
        :key="hole.id"
        :cx="hole.cx"
        :cy="hole.cy"
        :r="hole.r"
        :class="isCovered(hole.id) ? 'hole-covered' : 'hole-open'"
      />

      <g :class="{ 'opacity-25': dimSubholes }">
        <circle
          v-for="hole in SUB_HOLES"
          :key="hole.id"
          :cx="hole.cx"
          :cy="hole.cy"
          :r="hole.r"
          :class="isCovered(hole.id) ? 'hole-covered' : 'hole-open'"
        />
      </g>

      <!-- Hand cue, sat in the empty band under each cluster. -->
      <g v-if="showCues" class="ocarina-cue">
        <text x="92" y="124" text-anchor="middle">LH</text>
        <text x="172" y="118" text-anchor="middle">RH</text>
      </g>
    </g>

    <!-- Underside: dashed inset panel so the diagram never implies these are front holes. -->
    <g>
      <rect
        x="50"
        y="158"
        width="212"
        height="46"
        rx="4"
        class="underside-panel"
        stroke-dasharray="5 4"
      />
      <circle
        v-for="hole in THUMB_HOLES"
        :key="hole.id"
        :cx="hole.cx"
        :cy="hole.cy"
        :r="hole.r"
        :class="isCovered(hole.id) ? 'hole-covered' : 'hole-open'"
      />
      <text v-if="showCues" x="64" y="188" class="ocarina-cue">UNDERSIDE</text>
    </g>
  </svg>
</template>

<style scoped>
.ocarina-body {
  fill: var(--color-ink);
  stroke: var(--color-glaze);
  stroke-width: 3;
}

.hole-covered {
  fill: var(--color-gold);
  stroke: none;
}

.hole-open {
  fill: none;
  stroke: var(--color-parchment-dim);
  stroke-width: 3.5;
}

.underside-panel {
  fill: none;
  stroke: var(--color-parchment-dim);
  stroke-width: 1.5;
  opacity: 0.45;
}

.ocarina-cue {
  fill: var(--color-parchment-dim);
  font-family: var(--font-body);
  font-size: 13px;
  letter-spacing: 0.08em;
  opacity: 0.6;
}
</style>
