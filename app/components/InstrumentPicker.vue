<script setup lang="ts">
import { INSTRUMENTS } from '@/data/instruments'

/**
 * Which ocarina the chart is for. A plain select rather than another segmented
 * strip: five options with long names, and it can grow without reflowing a row.
 */
defineProps<{ modelValue: string; label?: string }>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="flex shrink-0 items-center gap-2 text-sm">
    <span class="tight-landscape-hide text-xs tracking-wider text-parchment-dim uppercase">
      {{ label ?? 'Instrument' }}
    </span>
    <select
      class="min-h-10 rounded-sm border border-white/10 bg-stone px-2 py-1 text-sm text-parchment md:min-h-0"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="instrument in INSTRUMENTS" :key="instrument.id" :value="instrument.id">
        {{ instrument.name }}
      </option>
    </select>
  </label>
</template>
