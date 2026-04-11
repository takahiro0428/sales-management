<template>
  <Teleport to="body">
    <div
      v-if="product"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      @click.self="close"
    >
      <div class="absolute inset-0 bg-black/40" @click="close" />
      <div class="relative bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        <!-- Image -->
        <div class="aspect-video bg-slate-50 overflow-hidden rounded-t-3xl md:rounded-t-2xl relative">
          <img
            v-if="product.thumbnailUrl || product.imageUrl"
            :src="(product.thumbnailUrl || product.imageUrl) as string"
            :alt="product.name"
            class="w-full h-full object-contain"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
            <Package :size="64" :stroke-width="1" />
          </div>
          <button
            type="button"
            @click.stop="$emit('toggle-favorite', product.id)"
            class="absolute top-3 left-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            :class="favorite ? 'text-red-500' : 'text-slate-400 hover:text-red-400'"
            :aria-label="favorite ? 'お気に入りから削除' : 'お気に入りに追加'"
          >
            <Heart :size="16" :fill="favorite ? 'currentColor' : 'none'" />
          </button>
          <button
            type="button"
            @click="close"
            class="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700"
            aria-label="閉じる"
          >
            <X :size="18" />
          </button>
          <button
            v-if="product.imageUrl && product.thumbnailUrl"
            type="button"
            @click.stop="showLightbox = true"
            class="absolute bottom-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
            aria-label="画像を拡大"
          >
            <ZoomIn :size="16" />
          </button>
        </div>
        <!-- Body -->
        <div class="p-5">
          <span class="text-xs font-medium text-primary-500 bg-primary-50 px-2.5 py-1 rounded-full">
            {{ product.category || 'その他' }}
          </span>
          <h2 class="text-xl font-bold text-slate-800 mt-3">{{ product.name }}</h2>
          <p class="text-2xl font-bold text-slate-800 mt-2">¥{{ product.price.toLocaleString() }}</p>

          <div class="mt-3">
            <span
              class="text-sm font-medium px-3 py-1 rounded-full"
              :class="stockStatusClass(product.stock)"
            >
              {{ stockStatusText(product.stock) }}
            </span>
          </div>

          <p v-if="product.description" class="text-sm text-slate-600 mt-4 whitespace-pre-wrap leading-relaxed">
            {{ product.description }}
          </p>

          <div v-if="product.tags?.length > 0" class="flex flex-wrap gap-1.5 mt-4">
            <span v-for="tag in product.tags" :key="tag" class="text-xs bg-sub1-100 text-sub1-500 px-2.5 py-1 rounded-full">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Lightbox -->
  <Teleport to="body">
    <div
      v-if="showLightbox && product?.imageUrl"
      class="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="商品画像の拡大表示"
      @click.self="showLightbox = false"
    >
      <div class="absolute inset-0 bg-black/90" @click="showLightbox = false" />
      <button
        type="button"
        @click="showLightbox = false"
        class="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        aria-label="閉じる"
      >
        <X :size="22" />
      </button>
      <img
        :src="product.imageUrl"
        :alt="product.name"
        class="relative max-w-[95vw] max-h-[90vh] object-contain animate-lightbox-in"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Package, X, ZoomIn, Heart } from 'lucide-vue-next'
import type { Product } from '~/composables/useProducts'
import { stockStatusText, stockStatusClass } from '~/utils/productStock'

const props = defineProps<{
  product: Product | null
  favorite: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toggle-favorite', productId: string): void
}>()

const showLightbox = ref(false)

watch(
  () => props.product,
  (val) => {
    if (!val) showLightbox.value = false
  },
)

const close = () => emit('close')

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (showLightbox.value) {
    showLightbox.value = false
  } else if (props.product) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@media (min-width: 768px) {
  .animate-slide-up {
    animation: scaleIn 0.2s ease-out;
  }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-lightbox-in {
  animation: lightboxIn 0.2s ease-out;
}
@keyframes lightboxIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
