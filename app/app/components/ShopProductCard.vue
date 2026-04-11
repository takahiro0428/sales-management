<template>
  <div
    class="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col"
    @click="$emit('open', product)"
  >
    <!-- Image -->
    <div class="aspect-square bg-slate-50 overflow-hidden relative">
      <img
        v-if="product.thumbnailUrl"
        :src="product.thumbnailUrl"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
        <Package :size="40" :stroke-width="1" />
      </div>
      <button
        type="button"
        @click.stop="$emit('toggle-favorite', product.id)"
        class="absolute top-1.5 right-1.5 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
        :class="favorite ? 'text-red-500' : 'text-slate-400 hover:text-red-400'"
        :aria-label="favorite ? 'お気に入りから削除' : 'お気に入りに追加'"
      >
        <Heart :size="18" :fill="favorite ? 'currentColor' : 'none'" />
      </button>
    </div>
    <!-- Info -->
    <div class="p-3 flex-1 flex flex-col">
      <span class="self-start text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
        {{ product.category || 'その他' }}
      </span>
      <h3 class="font-medium text-slate-800 text-sm mt-1.5 line-clamp-2 leading-snug">{{ product.name }}</h3>
      <p v-if="product.description" class="text-xs text-slate-400 mt-1 line-clamp-1">{{ product.description }}</p>
      <div class="flex items-center justify-between mt-auto pt-2">
        <span class="text-base font-bold text-slate-800">¥{{ product.price.toLocaleString() }}</span>
        <span
          class="text-[10px] font-medium px-2 py-0.5 rounded-full"
          :class="stockStatusClass(product.stock)"
        >
          {{ stockStatusText(product.stock) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Package, Heart } from 'lucide-vue-next'
import type { Product } from '~/composables/useProducts'
import { stockStatusText, stockStatusClass } from '~/utils/productStock'

defineProps<{
  product: Product
  favorite: boolean
}>()

defineEmits<{
  (e: 'open', product: Product): void
  (e: 'toggle-favorite', productId: string): void
}>()
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
