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

/** Below picker size the LH/RH labels are noise, not information. */
const showCues = computed(() => {
  const size = props.size
  if (size === undefined || size === 'lg' || size === 'md') return true
  return typeof size === 'number' ? size >= 100 : false
})

/**
 * Maker's-chart convention: two arced rows marching toward the beak, the holes
 * shrinking as they go. Left hand takes the upper row, right hand the lower.
 */
const FRONT_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'lhIndex', cx: 80, cy: 66, r: 11.5 },
  { id: 'lhMiddle', cx: 110, cy: 58, r: 11.5 },
  { id: 'lhRing', cx: 140, cy: 60, r: 10.5 },
  { id: 'lhPinky', cx: 167, cy: 68, r: 9.5 },
  { id: 'rhIndex', cx: 126, cy: 102, r: 9.5 },
  { id: 'rhMiddle', cx: 154, cy: 106, r: 9 },
  { id: 'rhRing', cx: 180, cy: 110, r: 8.5 },
  { id: 'rhPinky', cx: 204, cy: 112, r: 7.5 },
]

/** The two tiny ones, trailing off toward the neck. */
const SUB_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'subA', cx: 222, cy: 96, r: 5.5 },
  { id: 'subB', cx: 240, cy: 104, r: 5 },
]

/**
 * Underside holes, drawn free-floating off the body the way printed charts do
 * it: left thumb beside the bulb, right thumb below it.
 */
const THUMB_HOLES: { id: HoleId; cx: number; cy: number; r: number }[] = [
  { id: 'lhThumb', cx: 16, cy: 100, r: 13 },
  { id: 'rhThumb', cx: 120, cy: 180, r: 13 },
]

const title = computed(
  () => props.label ?? `Fingering: ${props.covered.length} of 12 holes covered`,
)
</script>

<template>
  <svg
    :style="{ width }"
    class="fingering-diagram block h-auto"
    viewBox="0 0 300 210"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
  >
    <title>{{ title }}</title>

    <!-- The instrument sits at a slight angle, the way it does in a maker's chart. -->
    <g transform="rotate(-4 140 95)">
      <!-- Mouthpiece / windway, drawn behind the body so the joint is hidden. -->
      <path
        d="M 226,84 L 284,100 Q 289,109 283,118 L 230,126 Z"
        class="ocarina-body"
        stroke-linejoin="round"
      />

      <!-- Transverse "sweet potato" body: fat left bulb, tapering to the beak. -->
      <path
        d="M 36,100 C 36,68 62,42 106,36 C 152,30 196,46 226,74 C 240,88 249,98 251,108 C 254,118 246,127 232,132 C 198,144 140,148 100,141 C 66,134 44,120 38,108 Z"
        class="ocarina-body"
      />

      <!-- Seam along the top edge: keeps the silhouette from reading as a blob. -->
      <path d="M 52,92 C 58,64 84,50 112,50 C 148,50 192,66 222,90" class="ocarina-seam" />

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

      <!-- Hand cue, sat in the empty band under each row. -->
      <g v-if="showCues" class="ocarina-cue">
        <text x="86" y="132" text-anchor="middle">LH</text>
        <text x="176" y="138" text-anchor="middle">RH</text>
      </g>
    </g>

    <circle
      v-for="hole in THUMB_HOLES"
      :key="hole.id"
      :cx="hole.cx"
      :cy="hole.cy"
      :r="hole.r"
      :class="isCovered(hole.id) ? 'hole-covered' : 'hole-open'"
    />
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

.ocarina-cue {
  fill: var(--color-parchment-dim);
  font-family: var(--font-body);
  font-size: 13px;
  letter-spacing: 0.08em;
  opacity: 0.6;
}
</style>
