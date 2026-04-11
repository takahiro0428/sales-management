<template>
  <section class="mb-10">
    <div class="flex items-end justify-between mb-3 px-1">
      <div class="flex items-center gap-2 min-w-0">
        <slot name="icon" />
        <h2 class="text-lg md:text-xl font-bold text-slate-800 truncate">{{ title }}</h2>
        <span v-if="count != null" class="text-xs text-slate-400 ml-1">{{ count }}</span>
      </div>
      <NuxtLink
        v-if="seeAllTo"
        :to="seeAllTo"
        class="text-sm text-primary-500 hover:text-primary-600 font-medium inline-flex items-center gap-0.5 shrink-0"
      >
        すべて見る
        <ChevronRight :size="16" />
      </NuxtLink>
    </div>

    <!-- Mobile: horizontal scroll strip. md+: responsive grid. -->
    <div class="shop-section-scroller -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
  title: string
  count?: number
  seeAllTo?: string
}>()
</script>

<style scoped>
.shop-section-scroller {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding-bottom: 0.25rem;
}
.shop-section-scroller::-webkit-scrollbar {
  display: none;
}
@media (min-width: 768px) {
  .shop-section-scroller {
    display: grid;
    overflow: visible;
    scroll-snap-type: none;
    padding-bottom: 0;
  }
}
</style>
