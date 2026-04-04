<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div class="animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" :class="sizeClass" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}>(), {
  size: 'md',
  fullPage: false,
})

const sizeClass = computed(() => ({
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
})[props.size])

const containerClass = computed(() => props.fullPage ? 'min-h-[50vh]' : '')
</script>
