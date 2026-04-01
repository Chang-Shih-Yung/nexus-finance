<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
    <p class="text-sm text-gray-500 mb-1">{{ title }}</p>
    <p class="text-3xl font-bold" :class="valueColor">{{ displayValue }}</p>
    <p v-if="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: number | string
  subtitle?: string
  format?: 'number' | 'percent' | 'plain'
  warn?: boolean
}>()

const displayValue = computed(() => {
  if (props.format === 'percent') return `${props.value}%`
  if (props.format === 'number' && typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const valueColor = computed(() =>
  props.warn ? 'text-red-600' : 'text-gray-900'
)
</script>
