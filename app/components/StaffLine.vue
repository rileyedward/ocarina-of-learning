<script setup lang="ts">
import { computed } from 'vue'
import { diatonicStep, toPitch } from '@/utils/pitch'
import type { PhraseNote } from '@/types'

/**
 * A phrase on a treble staff, drawn by hand in SVG for the same reason the
 * fingering diagram is: it is a handful of shapes, and a notation library
 * would arrive with a font, a layout engine and opinions about rhythm the
 * data model does not have.
 *
 * What is deliberately absent: bar lines, time signatures and beaming. The
 * model stores note values but no meter, so drawing bars would imply a
 * structure that is not there. Notes without a value get a plain head — pitch
 * only, no rhythmic claim.
 */
const props = withDefaults(
  defineProps<{ notes: PhraseNote[]; cursor?: number | null }>(),
  { cursor: null },
)

/** Staff geometry: 10 units between lines, so one diatonic step is 5. */
const LINES = [40, 50, 60, 70, 80]
const STEP = 5
/** E4 sits on the bottom line; everything else is counted from there. */
const E4_STEP = 4 * 7 + 2
const E4_Y = 80

const SLOT = 30
const LEFT = 46

const y = (step: number) => E4_Y - (step - E4_STEP) * STEP

interface Glyph {
  key: string
  x: number
  y: number
  rest: boolean
  /** Filled head. Hollow for semibreve and minim. */
  filled: boolean
  stem: boolean
  stemUp: boolean
  flags: number
  dotted: boolean
  accidental: string
  ledgers: number[]
  dur: number | undefined
  index: number
}

const glyphs = computed<Glyph[]>(() =>
  props.notes.map((entry, index) => {
    const x = LEFT + index * SLOT + SLOT / 2
    const dur = entry.dur

    if (!entry.note) {
      return {
        key: `rest-${index}`,
        x,
        y: 60,
        rest: true,
        filled: true,
        stem: false,
        stemUp: false,
        flags: 0,
        dotted: entry.dotted === true,
        accidental: '',
        ledgers: [],
        dur,
        index,
      }
    }

    const step = diatonicStep(entry.note)
    const noteY = y(step)
    const { alter } = toPitch(entry.note)

    // Ledger lines march outward from the staff in tens, never past the head.
    const ledgers: number[] = []
    for (let line = 30; line >= noteY - 1; line -= 10) ledgers.push(line)
    for (let line = 90; line <= noteY + 1; line += 10) ledgers.push(line)

    return {
      key: `n-${index}`,
      x,
      y: noteY,
      rest: false,
      filled: dur === undefined ? true : dur >= 4,
      stem: dur !== undefined && dur !== 1,
      stemUp: noteY > 60,
      flags: dur === 8 ? 1 : dur === 16 ? 2 : 0,
      dotted: entry.dotted === true,
      accidental: alter === -1 ? '♭' : alter === 1 ? '♯' : '',
      ledgers,
      dur,
      index,
    }
  }),
)

const width = computed(() => LEFT + Math.max(props.notes.length, 1) * SLOT + 16)

const stemX = (g: Glyph) => (g.stemUp ? g.x + 5.2 : g.x - 5.2)
const stemY2 = (g: Glyph) => (g.stemUp ? g.y - 30 : g.y + 30)
</script>

<template>
  <svg
    class="staff-line block h-auto w-full"
    :viewBox="`0 0 ${width} 120`"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
  >
    <title>{{ notes.length }} notes on a treble staff</title>

    <line v-for="line in LINES" :key="line" :x1="8" :y1="line" :x2="width - 8" :y2="line" class="staff-rule" />

    <!--
      Treble clef, traced rather than typed: a webfont glyph would be one more
      thing to load and one more thing to fail.
    -->
    <path
      class="staff-clef"
      d="M 26,92 C 18,86 18,74 26,70 C 34,66 40,72 40,78 C 40,86 32,90 24,86 C 16,82 14,70 20,60 C 26,50 34,44 34,34 C 34,26 30,22 27,26 C 24,30 25,40 30,48 L 30,96 C 30,104 24,106 20,102"
    />

    <g v-for="g in glyphs" :key="g.key" :class="{ 'staff-current': cursor === g.index }">
      <line
        v-for="ledger in g.ledgers"
        :key="`${g.key}-l-${ledger}`"
        :x1="g.x - 10"
        :y1="ledger"
        :x2="g.x + 10"
        :y2="ledger"
        class="staff-rule"
      />

      <template v-if="g.rest">
        <!-- Rests: a bar for the long ones, a hooked stroke for the short. -->
        <rect
          v-if="g.dur === 1 || g.dur === 2 || g.dur === undefined"
          :x="g.x - 7"
          :y="g.dur === 2 ? 55 : 50"
          width="14"
          height="5"
          class="staff-ink"
        />
        <path
          v-else
          :d="`M ${g.x - 5},${g.y - 12} q 8,6 2,12 q -6,6 2,12`"
          class="staff-rest-stroke"
        />
      </template>

      <template v-else>
        <text v-if="g.accidental" :x="g.x - 14" :y="g.y + 4" class="staff-accidental">
          {{ g.accidental }}
        </text>

        <ellipse
          :cx="g.x"
          :cy="g.y"
          rx="6"
          ry="4.4"
          transform-origin="center"
          :class="g.filled ? 'staff-ink' : 'staff-hollow'"
          :transform="`rotate(-18 ${g.x} ${g.y})`"
        />

        <line
          v-if="g.stem"
          :x1="stemX(g)"
          :y1="g.y"
          :x2="stemX(g)"
          :y2="stemY2(g)"
          class="staff-stem"
        />

        <path
          v-for="flag in g.flags"
          :key="`${g.key}-f-${flag}`"
          :d="
            g.stemUp
              ? `M ${stemX(g)},${stemY2(g) + (flag - 1) * 8} q 10,4 8,14`
              : `M ${stemX(g)},${stemY2(g) - (flag - 1) * 8} q 10,-4 8,-14`
          "
          class="staff-flag"
        />
      </template>

      <circle v-if="g.dotted" :cx="g.x + 12" :cy="g.y - 2" r="1.8" class="staff-ink" />
    </g>
  </svg>
</template>

<style scoped>
.staff-rule {
  stroke: var(--color-parchment-dim);
  stroke-width: 1.1;
  opacity: 0.55;
}

.staff-clef {
  fill: none;
  stroke: var(--color-parchment);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.staff-ink {
  fill: var(--color-parchment);
}

.staff-hollow {
  fill: none;
  stroke: var(--color-parchment);
  stroke-width: 2;
}

.staff-stem {
  stroke: var(--color-parchment);
  stroke-width: 1.8;
}

.staff-flag {
  fill: none;
  stroke: var(--color-parchment);
  stroke-width: 1.8;
}

.staff-rest-stroke {
  fill: none;
  stroke: var(--color-parchment);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.staff-accidental {
  fill: var(--color-parchment);
  font-family: var(--font-note);
  font-size: 15px;
}

/* The practice cursor, so staff view can follow along like the cards do. */
.staff-current .staff-ink,
.staff-current .staff-rest-stroke {
  fill: var(--color-gold);
}

.staff-current .staff-hollow,
.staff-current .staff-stem,
.staff-current .staff-flag,
.staff-current .staff-rest-stroke {
  stroke: var(--color-gold);
}
</style>
