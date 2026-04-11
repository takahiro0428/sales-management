<template>
  <div>
    <NuxtLayout name="public" :group-name="groupName">
      <LoadingSpinner v-if="loading" full-page />

      <template v-else>
        <!-- Hero -->
        <ShopHeroBanner
          :group-name="groupName"
          :group-description="group?.description"
          :hero-image-url="group?.heroImageUrl ?? null"
          :hero-title="group?.heroTitle"
          :hero-caption="group?.heroCaption"
        />

        <!-- Quick search entry -->
        <div class="mb-8">
          <NuxtLink
            :to="`/shop/${groupId}/search`"
            class="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all text-slate-500"
          >
            <Search :size="18" class="text-slate-400" />
            <span class="text-sm">商品を検索・絞り込み...</span>
            <ChevronRight :size="18" class="ml-auto text-slate-300" />
          </NuxtLink>
        </div>

        <template v-if="products.length > 0">
          <!-- 新着 -->
          <ShopSection
            title="新着商品"
            :count="products.length"
            :see-all-to="`/shop/${groupId}/search?sort=newest`"
          >
            <template #icon>
              <Sparkles :size="18" class="text-primary-500" />
            </template>

            <ShopProductCard
              v-for="p in newArrivals"
              :key="p.id"
              :product="p"
              :favorite="isFavorite(p.id)"
              class="shop-strip-card"
              @open="openDetail"
              @toggle-favorite="toggleFavorite"
            />
          </ShopSection>

          <!-- カテゴリ別 -->
          <ShopSection
            v-for="section in categorySections"
            :key="section.category"
            :title="section.category"
            :count="section.totalCount"
            :see-all-to="`/shop/${groupId}/search?category=${encodeURIComponent(section.category)}`"
          >
            <template #icon>
              <Tag :size="18" class="text-sub1-500" />
            </template>

            <ShopProductCard
              v-for="p in section.items"
              :key="p.id"
              :product="p"
              :favorite="isFavorite(p.id)"
              class="shop-strip-card"
              @open="openDetail"
              @toggle-favorite="toggleFavorite"
            />
          </ShopSection>
        </template>

        <!-- No products -->
        <div v-else class="text-center py-16">
          <Package :size="64" class="mx-auto text-slate-200 mb-4" :stroke-width="1" />
          <h2 class="text-xl font-semibold text-slate-600">商品はまだありません</h2>
          <p class="text-slate-400 mt-2">準備が整い次第、商品が表示されます。</p>
        </div>
      </template>

      <!-- Detail Modal -->
      <ShopProductDetailModal
        :product="detailProduct"
        :favorite="detailProduct ? isFavorite(detailProduct.id) : false"
        @close="detailProduct = null"
        @toggle-favorite="toggleFavorite"
      />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { Search, ChevronRight, Sparkles, Tag, Package } from 'lucide-vue-next'
import type { Product } from '~/composables/useProducts'
import type { Group } from '~/composables/useGroups'
import { toMillis } from '~/utils/timestamp'

definePageMeta({ layout: false })

const route = useRoute()
const groupId = route.params.groupId as string

const { getPublicProducts, getGroupInfo } = usePublicProducts()
const { toggleFavorite, isFavorite } = useFavorites(groupId)

const loading = ref(true)
const products = ref<Product[]>([])
const group = ref<Group | null>(null)
const detailProduct = ref<Product | null>(null)

const groupName = computed(() => group.value?.name || 'ショップ')

const NEW_ARRIVALS_LIMIT = 8
const CATEGORY_STRIP_LIMIT = 8

const newArrivals = computed(() =>
  [...products.value]
    .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
    .slice(0, NEW_ARRIVALS_LIMIT),
)

const categorySections = computed(() => {
  const grouped = new Map<string, Product[]>()
  // Preserve newest-first order so the strip naturally shows fresh items
  const sorted = [...products.value].sort(
    (a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt),
  )
  for (const p of sorted) {
    const cat = p.category || 'その他'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(p)
  }
  // Sort categories by product count desc (most stocked first)
  return [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([category, items]) => ({
      category,
      totalCount: items.length,
      items: items.slice(0, CATEGORY_STRIP_LIMIT),
    }))
})

const openDetail = (product: Product) => {
  detailProduct.value = product
}

onMounted(async () => {
  try {
    const [productList, groupInfo] = await Promise.all([
      getPublicProducts(groupId),
      getGroupInfo(groupId),
    ])
    products.value = productList
    group.value = groupInfo
  } catch (e) {
    console.error('Failed to load shop top:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Each product card in a horizontal strip gets a fixed width on mobile
   so scrolling feels snappy; on md+ the strip becomes a grid via ShopSection. */
.shop-strip-card {
  width: 160px;
  flex-shrink: 0;
  scroll-snap-align: start;
}
@media (min-width: 768px) {
  .shop-strip-card {
    width: auto;
    flex-shrink: 1;
    scroll-snap-align: none;
  }
}
</style>
