<script setup lang="ts">
/**
 * The app's one toggle shape: a bordered strip of buttons, one of them lit.
 * Density, columns, notation and every filter added since all render as this,
 * so a new control never invents new furniture.
 */
export interface SegmentOption {
  value: string | number
  label: string
  ariaLabel?: string
  title?: string
}

withDefaults(
  defineProps<{
    modelValue: string | number
    options: SegmentOption[]
    /** Which colour the lit segment takes. */
    accent?: 'gold' | 'glaze'
    /** Thumb-sized on phones by default; `tight` for dense header rows. */
    density?: 'comfortable' | 'tight'
    label?: string
  }>(),
  { accent: 'glaze', density: 'comfortable', label: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <div class="flex shrink-0 items-center gap-2">
    <span v-if="label" class="tight-landscape-hide text-xs tracking-wider text-parchment-dim uppercase">
      {{ label }}
    </span>

    <div class="flex items-center gap-1 rounded-sm border border-white/10 p-1" role="group">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="rounded-xs px-3 py-1 text-sm transition-colors"
        :class="[
          density === 'comfortable' ? 'min-h-10 md:min-h-0' : 'min-h-0 py-0.5',
          modelValue === option.value
            ? accent === 'gold'
              ? 'bg-gold/20 text-parchment'
              : 'bg-glaze/25 text-parchment'
            : 'text-parchment-dim hover:text-parchment',
        ]"
        :aria-pressed="modelValue === option.value"
        :aria-label="option.ariaLabel"
        :title="option.title"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
