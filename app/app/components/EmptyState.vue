<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="mb-4 text-primary-300">
      <component :is="icon" :size="48" :stroke-width="1.5" />
    </div>
    <h3 class="text-lg font-medium text-slate-700 mb-1">{{ title }}</h3>
    <p class="text-sm text-slate-500 mb-4 max-w-xs">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>
