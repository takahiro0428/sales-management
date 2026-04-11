<template>
  <div>
    <NuxtLayout name="public" :group-name="groupName">
      <LoadingSpinner v-if="loading" full-page />

      <template v-else>
        <!-- Top bar: back link + search + filter button -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <NuxtLink
              :to="`/shop/${groupId}`"
              class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-500"
            >
              <ArrowLeft :size="16" />
              トップへ戻る
            </NuxtLink>
            <span class="text-xs text-slate-400">{{ filteredProducts.length }}件の商品</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                class="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-slate-800 placeholder-slate-400"
                placeholder="商品名・説明・タグを検索..."
              />
            </div>
            <button
              type="button"
              @click="filterSheetOpen = true"
              class="relative shrink-0 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-primary-300 text-slate-700 font-medium inline-flex items-center gap-2"
              :aria-label="activeFilterCount > 0 ? `絞り込み（${activeFilterCount} 件選択中）` : '絞り込み'"
            >
              <SlidersHorizontal :size="18" />
              <span class="hidden sm:inline">絞り込み</span>
              <span
                v-if="activeFilterCount > 0"
                class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Active filter chips -->
        <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 mb-4">
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
            aria-label="検索キーワードをクリア"
          >
            「{{ searchQuery }}」
            <X :size="12" />
          </button>
          <button
            v-if="filters.category"
            type="button"
            @click="clearCategory"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-medium border border-primary-100 hover:bg-primary-100"
          >
            {{ filters.category }}
            <X :size="12" />
          </button>
          <button
            v-for="tag in filters.tags"
            :key="tag"
            type="button"
            @click="removeTag(tag)"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sub1-100 text-sub1-500 text-xs font-medium border border-sub1-200 hover:bg-sub1-200"
          >
            #{{ tag }}
            <X :size="12" />
          </button>
          <span
            v-if="filters.minPrice != null || filters.maxPrice != null"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
          >
            {{ priceRangeLabel }}
            <button type="button" @click="clearPrice" class="hover:text-red-500">
              <X :size="12" />
            </button>
          </span>
          <span
            v-if="filters.favoritesOnly"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100"
          >
            <Heart :size="10" fill="currentColor" />
            お気に入りのみ
            <button type="button" @click="filters.favoritesOnly = false" class="hover:text-red-700">
              <X :size="12" />
            </button>
          </span>
          <span
            v-if="filters.sort !== 'newest'"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
          >
            {{ sortLabel(filters.sort) }}
            <button type="button" @click="filters.sort = 'newest'" class="hover:text-red-500">
              <X :size="12" />
            </button>
          </span>
          <button
            type="button"
            @click="clearAll"
            class="text-xs text-slate-500 hover:text-red-500 underline underline-offset-2 ml-1"
          >
            すべてクリア
          </button>
        </div>

        <!-- Results -->
        <div v-if="filteredProducts.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <ShopProductCard
            v-for="product in filteredProducts"
            :key="product.id"
            :product="product"
            :favorite="isFavorite(product.id)"
            @open="openDetail"
            @toggle-favorite="toggleFavorite"
          />
        </div>
        <div v-else class="text-center py-12">
          <SearchX :size="48" class="mx-auto text-slate-200 mb-3" :stroke-width="1.5" />
          <p class="text-slate-500">条件に一致する商品がありません</p>
          <button
            v-if="activeFilterCount > 0 || searchQuery"
            type="button"
            @click="clearAll"
            class="mt-4 btn-secondary btn-sm"
          >
            条件をクリア
          </button>
        </div>
      </template>

      <!-- Detail Modal -->
      <ShopProductDetailModal
        :product="detailProduct"
        :favorite="detailProduct ? isFavorite(detailProduct.id) : false"
        @close="detailProduct = null"
        @toggle-favorite="toggleFavorite"
      />

      <!-- Filter Sheet -->
      <ShopFilterSheet
        v-model="filterSheetOpen"
        :filters="filters"
        :available-categories="availableCategories"
        :sorted-tags="sortedTags"
        :result-count="draftResultCount"
        @apply="applyFilters"
        @draft-change="onDraftChange"
        @reset="clearFiltersOnly"
      />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Search, SearchX, SlidersHorizontal, X, Heart } from 'lucide-vue-next'
import type { Product } from '~/composables/useProducts'
import type { Group } from '~/composables/useGroups'
import type { ShopFilters, SortKey } from '~/components/ShopFilterSheet.vue'
import { toMillis } from '~/utils/timestamp'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string

const { getPublicProducts, getGroupInfo } = usePublicProducts()
const { toggleFavorite, isFavorite } = useFavorites(groupId)

const loading = ref(true)
const products = ref<Product[]>([])
const group = ref<Group | null>(null)
const detailProduct = ref<Product | null>(null)
const searchQuery = ref('')
const filterSheetOpen = ref(false)

const groupName = computed(() => group.value?.name || 'ショップ')

// ---- Filter state ----
const defaultFilters = (): ShopFilters => ({
  category: '',
  tags: [],
  minPrice: null,
  maxPrice: null,
  sort: 'newest',
  favoritesOnly: false,
})
const filters = reactive<ShopFilters>(defaultFilters())
const draftFilters = ref<ShopFilters>(defaultFilters())

// ---- URL sync (deep links / back button) ----
// Flag that the URL change came from us; when true, the route.query watcher
// will skip re-initialization to avoid a sync loop.
let suppressQueryWatch = false

const initFromQuery = () => {
  const q = route.query
  searchQuery.value = typeof q.q === 'string' ? q.q : ''
  filters.category = typeof q.category === 'string' ? q.category : ''
  filters.tags = typeof q.tags === 'string' && q.tags.length > 0
    ? q.tags.split(',').filter(Boolean)
    : []
  const minP = Number(q.minPrice)
  const maxP = Number(q.maxPrice)
  filters.minPrice = typeof q.minPrice === 'string' && q.minPrice !== '' && Number.isFinite(minP) ? minP : null
  filters.maxPrice = typeof q.maxPrice === 'string' && q.maxPrice !== '' && Number.isFinite(maxP) ? maxP : null
  filters.sort = typeof q.sort === 'string' && ['newest', 'price_asc', 'price_desc', 'stock'].includes(q.sort)
    ? q.sort as SortKey
    : 'newest'
  filters.favoritesOnly = q.favorites === '1'
  draftFilters.value = { ...filters, tags: [...filters.tags] }
}

// Initialize synchronously at setup so the first render already reflects
// any deep-link query parameters (before onMounted fetches products).
initFromQuery()

const buildQuery = (): Record<string, string> => {
  const query: Record<string, string> = {}
  if (searchQuery.value) query.q = searchQuery.value
  if (filters.category) query.category = filters.category
  if (filters.tags.length > 0) query.tags = filters.tags.join(',')
  if (filters.minPrice != null) query.minPrice = String(filters.minPrice)
  if (filters.maxPrice != null) query.maxPrice = String(filters.maxPrice)
  if (filters.sort !== 'newest') query.sort = filters.sort
  if (filters.favoritesOnly) query.favorites = '1'
  return query
}

// Debounced router.replace so rapid search typing doesn't hit the
// browser's history.replaceState throttle (~100 calls / 30 s).
let syncTimer: ReturnType<typeof setTimeout> | null = null
const syncUrl = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    suppressQueryWatch = true
    router.replace({ query: buildQuery(), hash: route.hash })
  }, 250)
}

// Skip the very first watcher flush so the synchronous initFromQuery()
// above does not immediately trigger a redundant router.replace.
let initialSyncDone = false
onMounted(() => { initialSyncDone = true })

// Watch filter state and sync URL (debounced).
watch(
  [
    () => filters.category,
    () => [...filters.tags],
    () => filters.minPrice,
    () => filters.maxPrice,
    () => filters.sort,
    () => filters.favoritesOnly,
    searchQuery,
  ],
  () => {
    if (!initialSyncDone) return
    syncUrl()
  },
)

// Re-initialize filters when the user navigates via browser back/forward,
// which changes route.query without remounting the component. The
// `suppressQueryWatch` flag guards against our own `router.replace` calls
// triggering a re-init loop; we release the flag one-shot inside the
// watcher itself so the release is deterministic regardless of Vue's
// flush ordering (see second-pass review Finding 1).
watch(
  () => route.query,
  () => {
    if (suppressQueryWatch) {
      suppressQueryWatch = false
      return
    }
    initFromQuery()
  },
)

onBeforeUnmount(() => {
  if (syncTimer) clearTimeout(syncTimer)
})

// ---- Derived data ----
const availableCategories = computed(() => {
  const set = new Set<string>()
  for (const p of products.value) set.add(p.category || 'その他')
  return Array.from(set).sort()
})

const sortedTags = computed(() => {
  const m = new Map<string, number>()
  for (const p of products.value) {
    for (const t of p.tags || []) m.set(t, (m.get(t) || 0) + 1)
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
})

const applyFilterLogic = (list: Product[], f: ShopFilters, q: string): Product[] => {
  let result = list
  if (f.favoritesOnly) result = result.filter((p) => isFavorite(p.id))
  if (q) {
    const lower = q.toLowerCase()
    result = result.filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.description || '').toLowerCase().includes(lower) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(lower)),
    )
  }
  if (f.category) {
    result = result.filter((p) => (p.category || 'その他') === f.category)
  }
  if (f.tags.length > 0) {
    result = result.filter((p) =>
      f.tags.some((tag) => (p.tags || []).includes(tag)),
    )
  }
  if (f.minPrice != null) result = result.filter((p) => p.price >= f.minPrice!)
  if (f.maxPrice != null) result = result.filter((p) => p.price <= f.maxPrice!)

  // Sort
  const sorted = [...result]
  switch (f.sort) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'stock':
      sorted.sort((a, b) => {
        const aIn = a.stock > 0 ? 0 : 1
        const bIn = b.stock > 0 ? 0 : 1
        if (aIn !== bIn) return aIn - bIn
        return toMillis(b.updatedAt) - toMillis(a.updatedAt)
      })
      break
    case 'newest':
    default:
      sorted.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
      break
  }
  return sorted
}

const filteredProducts = computed(() => applyFilterLogic(products.value, filters, searchQuery.value))

// Draft result count: compute against current search query + draft filters
const draftResultCount = computed(() =>
  applyFilterLogic(products.value, draftFilters.value, searchQuery.value).length,
)

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.category) n++
  n += filters.tags.length
  if (filters.minPrice != null || filters.maxPrice != null) n++
  if (filters.favoritesOnly) n++
  if (filters.sort !== 'newest') n++
  return n
})

// Whether to show the active-filter chip row above the results.
// This includes the free-text search query (not counted in the
// `絞り込み` button badge because it's already visible in the search input).
const hasActiveFilters = computed(() => activeFilterCount.value > 0 || !!searchQuery.value)

const priceRangeLabel = computed(() => {
  const min = filters.minPrice
  const max = filters.maxPrice
  if (min != null && max != null) return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`
  if (min != null) return `¥${min.toLocaleString()}〜`
  if (max != null) return `〜¥${max.toLocaleString()}`
  return ''
})

const sortLabel = (sort: SortKey): string => ({
  newest: '新着順',
  price_asc: '価格安い順',
  price_desc: '価格高い順',
  stock: '在庫あり優先',
}[sort] || '新着順')

// ---- Handlers ----
const onDraftChange = (f: ShopFilters) => {
  draftFilters.value = f
}

const applyFilters = (f: ShopFilters) => {
  filters.category = f.category
  filters.tags = [...f.tags]
  filters.minPrice = f.minPrice
  filters.maxPrice = f.maxPrice
  filters.sort = f.sort
  filters.favoritesOnly = f.favoritesOnly
}

const clearCategory = () => {
  filters.category = ''
}

const removeTag = (tag: string) => {
  filters.tags = filters.tags.filter((t) => t !== tag)
}

const clearPrice = () => {
  filters.minPrice = null
  filters.maxPrice = null
}

// Clears the filter state only (sort / category / tags / price / favorites).
// Used by the FilterSheet's "リセット" button so it does NOT also wipe the
// top-bar free-text search, which lives outside the sheet.
const clearFiltersOnly = () => {
  Object.assign(filters, defaultFilters())
  draftFilters.value = defaultFilters()
}

// Full clear used by the page-level "すべてクリア" chip and the empty-state
// CTA — also clears the search query since both controls are visible.
const clearAll = () => {
  clearFiltersOnly()
  searchQuery.value = ''
}

const openDetail = (product: Product) => {
  detailProduct.value = product
}

onMounted(async () => {
  // Note: initFromQuery() is called at setup time (above) so the first
  // render already reflects deep-link query params before we fetch.
  try {
    const [productList, groupInfo] = await Promise.all([
      getPublicProducts(groupId),
      getGroupInfo(groupId),
    ])
    products.value = productList
    group.value = groupInfo
  } catch (e) {
    console.error('Failed to load shop search:', e)
  } finally {
    loading.value = false
  }
})
</script>
