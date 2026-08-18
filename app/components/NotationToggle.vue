<script setup lang="ts">
import SegmentedControl from '@/components/SegmentedControl.vue'
import { prefs } from '@/composables/usePrefs'

/**
 * Diagrams answer "where do my fingers go"; the staff answers "what is this
 * tune doing". Which one is on is a preference, not a per-song setting.
 */
const OPTIONS = [
  { value: 'diagram', label: 'Diagrams', ariaLabel: 'Show fingering diagrams' },
  { value: 'staff', label: 'Staff', ariaLabel: 'Show staff notation' },
  { value: 'both', label: 'Both', ariaLabel: 'Show diagrams and staff notation' },
]

withDefaults(defineProps<{ density?: 'comfortable' | 'tight' }>(), { density: 'comfortable' })
</script>

<template>
  <SegmentedControl
    v-model="prefs.notation"
    :options="OPTIONS"
    :density="density"
    label="Show"
  />
</template>
