<template>
  <div>
    <NuxtLayout name="public" :group-name="groupName">
      <LoadingSpinner v-if="loading" full-page />

      <template v-else-if="products.length > 0">
        <!-- Hero -->
        <div class="text-center mb-8">
          <h1 class="text-2xl md:text-3xl font-bold text-slate-800">{{ groupName }}</h1>
          <p class="text-slate-500 mt-2">全 {{ products.length }} 商品</p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 max-w-xs mx-auto">
          <button
            @click="activeTab = 'all'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'all' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
          >
            すべて
          </button>
          <button
            @click="activeTab = 'favorites'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1"
            :class="activeTab === 'favorites' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-500'"
          >
            <Heart :size="14" :fill="activeTab === 'favorites' ? 'currentColor' : 'none'" />
            お気に入り
          </button>
        </div>

        <!-- Search -->
        <div class="mb-6">
          <div class="relative max-w-md mx-auto">
            <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              class="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-slate-800 placeholder-slate-400"
              placeholder="商品を検索..."
            />
          </div>
        </div>

        <!-- Category Chips -->
        <div class="mb-4 overflow-x-auto pb-2 -mx-4 px-4">
          <div class="flex gap-2 min-w-max">
            <button
              @click="selectedCategory = ''"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              :class="selectedCategory === '' ? 'bg-primary-300 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-200'"
            >
              すべて
            </button>
            <button
              v-for="cat in availableCategories"
              :key="cat"
              @click="selectedCategory = cat"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              :class="selectedCategory === cat ? 'bg-primary-300 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-200'"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Tag Chips -->
        <div v-if="availableTags.length > 0" class="mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          <div class="flex gap-1.5 min-w-max">
            <button
              v-for="tag in availableTags"
              :key="tag"
              @click="toggleTag(tag)"
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
              :class="selectedTags.includes(tag) ? 'bg-sub1-100 text-sub1-500 border border-sub1-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:border-sub1-200'"
            >
              #{{ tag }}
            </button>
          </div>
        </div>

        <!-- Results count -->
        <p v-if="searchQuery || selectedCategory || selectedTags.length > 0" class="text-sm text-slate-400 mb-4">
          {{ filteredProducts.length }}件の商品
        </p>

        <!-- Product Grid -->
        <div v-if="filteredProducts.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            @click="openDetail(product)"
          >
            <!-- Image -->
            <div class="aspect-square bg-slate-50 overflow-hidden relative">
              <img
                v-if="product.thumbnailUrl"
                :src="product.thumbnailUrl"
                :alt="product.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
                <Package :size="40" :stroke-width="1" />
              </div>
              <button
                @click.stop="toggleFavorite(product.id)"
                class="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                :class="isFavorite(product.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-400'"
                :aria-label="isFavorite(product.id) ? 'お気に入りから削除' : 'お気に入りに追加'"
              >
                <Heart :size="16" :fill="isFavorite(product.id) ? 'currentColor' : 'none'" />
              </button>
            </div>
            <!-- Info -->
            <div class="p-3">
              <span class="text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">{{ product.category || 'その他' }}</span>
              <h3 class="font-medium text-slate-800 text-sm mt-1.5 line-clamp-2 leading-snug">{{ product.name }}</h3>
              <p v-if="product.description" class="text-xs text-slate-400 mt-1 line-clamp-1">{{ product.description }}</p>
              <div class="flex items-center justify-between mt-2">
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
        </div>

        <!-- No results -->
        <div v-else class="text-center py-12">
          <Heart v-if="activeTab === 'favorites'" :size="48" class="mx-auto text-slate-200 mb-3" :stroke-width="1.5" />
          <SearchX v-else :size="48" class="mx-auto text-slate-200 mb-3" :stroke-width="1.5" />
          <p class="text-slate-500">{{ activeTab === 'favorites' ? 'お気に入りの商品がありません' : '条件に一致する商品がありません' }}</p>
        </div>
      </template>

      <!-- No products at all -->
      <div v-else-if="!loading" class="text-center py-16">
        <Package :size="64" class="mx-auto text-slate-200 mb-4" :stroke-width="1" />
        <h2 class="text-xl font-semibold text-slate-600">商品はまだありません</h2>
        <p class="text-slate-400 mt-2">準備が整い次第、商品が表示されます。</p>
      </div>

      <!-- Detail Modal -->
      <Teleport to="body">
        <div v-if="detailProduct" class="fixed inset-0 z-50 flex items-end md:items-center justify-center" @click.self="detailProduct = null">
          <div class="absolute inset-0 bg-black/40" @click="detailProduct = null" />
          <div class="relative bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
            <!-- Modal Image -->
            <div class="aspect-video bg-slate-50 overflow-hidden rounded-t-3xl md:rounded-t-2xl relative">
              <img
                v-if="detailProduct.thumbnailUrl || detailProduct.imageUrl"
                :src="detailProduct.thumbnailUrl || detailProduct.imageUrl"
                :alt="detailProduct.name"
                class="w-full h-full object-contain"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
                <Package :size="64" :stroke-width="1" />
              </div>
              <button
                @click.stop="toggleFavorite(detailProduct.id)"
                class="absolute top-3 left-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                :class="isFavorite(detailProduct.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-400'"
                :aria-label="isFavorite(detailProduct.id) ? 'お気に入りから削除' : 'お気に入りに追加'"
              >
                <Heart :size="16" :fill="isFavorite(detailProduct.id) ? 'currentColor' : 'none'" />
              </button>
              <button @click="detailProduct = null" class="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700">
                <X :size="18" />
              </button>
              <button
                v-if="detailProduct.imageUrl && detailProduct.thumbnailUrl"
                @click.stop="showLightbox = true"
                class="absolute bottom-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                aria-label="画像を拡大"
              >
                <ZoomIn :size="16" />
              </button>
            </div>
            <!-- Modal Body -->
            <div class="p-5">
              <span class="text-xs font-medium text-primary-500 bg-primary-50 px-2.5 py-1 rounded-full">{{ detailProduct.category || 'その他' }}</span>
              <h2 class="text-xl font-bold text-slate-800 mt-3">{{ detailProduct.name }}</h2>
              <p class="text-2xl font-bold text-slate-800 mt-2">¥{{ detailProduct.price.toLocaleString() }}</p>

              <div class="mt-3">
                <span
                  class="text-sm font-medium px-3 py-1 rounded-full"
                  :class="stockStatusClass(detailProduct.stock)"
                >
                  {{ stockStatusText(detailProduct.stock) }}
                </span>
              </div>

              <p v-if="detailProduct.description" class="text-sm text-slate-600 mt-4 whitespace-pre-wrap leading-relaxed">{{ detailProduct.description }}</p>

              <div v-if="detailProduct.tags?.length > 0" class="flex flex-wrap gap-1.5 mt-4">
                <span v-for="tag in detailProduct.tags" :key="tag" class="text-xs bg-sub1-100 text-sub1-500 px-2.5 py-1 rounded-full">
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
          v-if="showLightbox && detailProduct?.imageUrl"
          class="fixed inset-0 z-[60] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="商品画像の拡大表示"
          @click.self="showLightbox = false"
        >
          <div class="absolute inset-0 bg-black/90" @click="showLightbox = false" />
          <button
            @click="showLightbox = false"
            class="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X :size="22" />
          </button>
          <img
            :src="detailProduct.imageUrl"
            :alt="detailProduct.name"
            class="relative max-w-[95vw] max-h-[90vh] object-contain animate-lightbox-in"
          />
        </div>
      </Teleport>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { Search, SearchX, Package, X, ZoomIn, Heart } from 'lucide-vue-next'
import type { Product } from '~/composables/useProducts'

definePageMeta({ layout: false })

const route = useRoute()
const groupId = route.params.groupId as string

const { getPublicProducts, getGroupInfo } = usePublicProducts()
const { toggleFavorite, isFavorite } = useFavorites(groupId)

const loading = ref(true)
const products = ref<Product[]>([])
const groupName = ref('')
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedTags = ref<string[]>([])
const activeTab = ref('all')
const detailProduct = ref<Product | null>(null)
const showLightbox = ref(false)

watch(detailProduct, (val) => {
  if (!val) showLightbox.value = false
})

const availableCategories = computed(() => {
  const cats = new Set(products.value.map((p) => p.category || 'その他'))
  return Array.from(cats).sort()
})

const availableTags = computed(() => {
  const tags = new Set<string>()
  for (const p of products.value) {
    if (p.tags) {
      for (const t of p.tags) tags.add(t)
    }
  }
  return Array.from(tags).sort()
})

const filteredProducts = computed(() => {
  let result = products.value
  if (activeTab.value === 'favorites') {
    result = result.filter((p) => isFavorite(p.id))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q)),
    )
  }
  if (selectedCategory.value) {
    result = result.filter((p) => (p.category || 'その他') === selectedCategory.value)
  }
  if (selectedTags.value.length > 0) {
    result = result.filter((p) =>
      selectedTags.value.some((tag) => (p.tags || []).includes(tag)),
    )
  }
  return result
})

const toggleTag = (tag: string) => {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

const openDetail = (product: Product) => {
  detailProduct.value = product
}

const stockStatusText = (stock: number) => {
  if (stock === 0) return '売り切れ'
  if (stock <= 3) return '残りわずか'
  return '在庫あり'
}

const stockStatusClass = (stock: number) => {
  if (stock === 0) return 'bg-slate-100 text-slate-400'
  if (stock <= 3) return 'bg-amber-50 text-amber-600'
  return 'bg-sub2-100 text-sub2-500'
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showLightbox.value) {
      showLightbox.value = false
    } else if (detailProduct.value) {
      detailProduct.value = null
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    const [productList, groupInfo] = await Promise.all([
      getPublicProducts(groupId),
      getGroupInfo(groupId),
    ])
    products.value = productList
    groupName.value = groupInfo?.name || 'ショップ'
  } catch (e) {
    console.error('Failed to load public products:', e)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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
