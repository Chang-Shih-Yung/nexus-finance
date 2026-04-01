<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <h3 class="text-sm font-medium text-gray-600 mb-4">{{ title }}</h3>
    <div class="relative" :style="{ height: height + 'px' }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  height?: number
}>()
</script>
