<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <span class="text-4xl mb-4">{{ icon }}</span>
    <h3 class="text-lg font-medium text-slate-700 mb-1">{{ title }}</h3>
    <p class="text-sm text-slate-500 mb-4 max-w-xs">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>
