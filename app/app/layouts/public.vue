<template>
  <div class="min-h-screen bg-gradient-to-b from-primary-50/50 to-white">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-primary-100">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Store :size="24" class="text-primary-400" :stroke-width="1.8" />
          <span class="text-lg font-bold text-primary-500">{{ groupName || 'ショップ' }}</span>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-6">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-100 py-6 mt-12">
      <p class="text-center text-xs text-slate-400">Powered by フリマ売上管理</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Store } from 'lucide-vue-next'

defineProps<{
  groupName?: string
}>()
</script>
