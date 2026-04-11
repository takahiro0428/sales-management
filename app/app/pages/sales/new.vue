<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title">売上を記録</h2>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください" />
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="products.length > 0">
      <div class="max-w-lg space-y-5">
        <!-- Sale Mode Toggle -->
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="section-title">セット売り</h3>
              <p class="text-xs text-slate-400 mt-0.5">複数商品をまとめて販売金額を設定</p>
            </div>
            <button
              @click="bundleMode = !bundleMode"
              role="switch"
              :aria-checked="bundleMode"
              aria-label="セット売りモード"
              class="relative w-11 h-6 rounded-full transition-colors"
              :class="bundleMode ? 'bg-primary-400' : 'bg-slate-200'"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                :class="bundleMode ? 'translate-x-5' : ''"
              />
            </button>
          </div>
        </div>

        <!-- Product Selection -->
        <div class="card">
          <h3 class="section-title mb-3">商品を選択</h3>

          <!-- 検索 -->
          <div class="mb-3">
            <div class="relative">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                class="input-field pl-9"
                placeholder="商品名・オーナー・カテゴリ・タグで検索..."
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="検索クリア"
                @click="searchQuery = ''"
              >
                <X :size="16" />
              </button>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{{ filteredProducts.length }} / {{ products.length }}件</span>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input v-model="hideOutOfStock" type="checkbox" class="w-3.5 h-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-200" />
                <span>在庫切れを除く</span>
              </label>
            </div>
          </div>

          <div v-if="filteredProducts.length === 0" class="text-center text-sm text-slate-400 py-6">
            該当する商品がありません
          </div>

          <div v-else class="space-y-3">
            <div v-for="product in filteredProducts" :key="product.id"
              class="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer"
              :class="isSelected(product.id) ? 'border-primary-300 bg-primary-50' : 'border-slate-100 hover:border-slate-200'"
              @click="toggleProduct(product)"
            >
              <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                <img v-if="product.thumbnailUrl" :src="product.thumbnailUrl" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                  <Package :size="18" :stroke-width="1.5" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">{{ product.name }}</p>
                <p class="text-xs text-slate-400">{{ product.ownerName }} · ¥{{ product.price.toLocaleString() }} · 在庫{{ product.stock }}</p>
              </div>
              <div v-if="isSelected(product.id)" class="shrink-0" @click.stop>
                <div class="flex items-center gap-2">
                  <button @click="changeQty(product.id, -1)" class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-sm">−</button>
                  <span class="w-8 text-center font-medium">{{ getQty(product.id) }}</span>
                  <button @click="changeQty(product.id, 1)" class="w-7 h-7 rounded-full bg-primary-400 text-white flex items-center justify-center text-sm disabled:opacity-50" :disabled="getQty(product.id) >= product.stock">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 選択済みで絞り込みから外れた商品の表示 -->
          <div v-if="hiddenSelectedItems.length > 0" class="mt-4 pt-3 border-t border-slate-100">
            <p class="text-xs font-medium text-slate-500 mb-2">
              選択中で絞り込み対象外の商品({{ hiddenSelectedItems.length }})
            </p>
            <div class="space-y-2">
              <div
                v-for="item in hiddenSelectedItems"
                :key="item.productId"
                class="flex items-center justify-between gap-2 text-xs bg-primary-50 border border-primary-200 rounded-lg p-2"
              >
                <span class="flex-1 min-w-0 truncate text-slate-700">
                  {{ item.productName }} × {{ item.quantity }}
                </span>
                <button
                  type="button"
                  class="text-slate-400 hover:text-red-500 shrink-0"
                  aria-label="選択解除"
                  @click="removeFromCart(item.productId)"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Items Summary (normal mode) -->
        <div v-if="selectedItems.length > 0 && !bundleMode" class="card">
          <h3 class="section-title mb-3">販売内容</h3>
          <div class="space-y-2 mb-4">
            <div v-for="item in selectedItems" :key="item.productId" class="flex items-center justify-between text-sm gap-2">
              <span class="text-slate-600 flex-1 min-w-0 truncate">{{ item.productName }} × {{ item.quantity }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-slate-400 text-xs">¥</span>
                <input
                  type="number"
                  :value="item.unitPrice"
                  @input="changeUnitPrice(item.productId, Number(($event.target as HTMLInputElement).value))"
                  class="w-20 px-2 py-1 rounded-lg border border-slate-200 text-right text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none"
                  min="0"
                />
              </div>
              <span class="font-medium shrink-0 w-20 text-right">¥{{ item.subtotal.toLocaleString() }}</span>
            </div>
            <div class="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span class="font-semibold text-slate-800">合計</span>
              <span class="text-lg font-bold text-emerald-600">¥{{ totalAmount.toLocaleString() }}</span>
            </div>
          </div>

          <div class="mb-4">
            <label class="label-text">メモ（任意）</label>
            <input v-model="note" type="text" class="input-field" placeholder="例：まとめ買い割引" />
          </div>

          <button @click="handleSubmit" class="btn-success w-full" :disabled="submitting">
            <LoadingSpinner v-if="submitting" size="sm" />
            {{ submitting ? '記録中...' : '売上を記録する' }}
          </button>
        </div>

        <!-- Selected Items Summary (bundle mode) -->
        <div v-if="selectedItems.length > 0 && bundleMode" class="card">
          <h3 class="section-title mb-3">
            <span class="inline-flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-600 rounded">セット</span>
              販売内容
            </span>
          </h3>
          <div class="space-y-2 mb-4">
            <div v-for="item in selectedItems" :key="item.productId" class="flex items-center justify-between text-sm gap-2">
              <span class="text-slate-600 flex-1 min-w-0 truncate">{{ item.productName }}</span>
              <span class="text-slate-400 shrink-0">× {{ item.quantity }}</span>
            </div>
            <div class="border-t border-slate-100 pt-3">
              <label class="label-text mb-1">セット売上金額</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                <input
                  v-model.number="bundleTotalAmount"
                  type="number"
                  min="0"
                  class="input-field pl-8 text-lg font-bold text-emerald-600"
                  placeholder="売上金額を入力"
                />
              </div>
            </div>
          </div>

          <div class="mb-4">
            <label class="label-text">メモ（任意）</label>
            <input v-model="note" type="text" class="input-field" placeholder="例：3点セット割引" />
          </div>

          <button @click="handleSubmit" class="btn-success w-full" :disabled="submitting || !bundleTotalAmount || bundleTotalAmount <= 0">
            <LoadingSpinner v-if="submitting" size="sm" />
            {{ submitting ? '記録中...' : '売上を記録する' }}
          </button>
        </div>
      </div>
    </template>

    <EmptyState v-else-if="!loading" :icon="Package" title="商品がありません" description="先に商品を登録してください">
      <template #action><NuxtLink to="/products/new" class="btn-primary btn-sm">商品を登録</NuxtLink></template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Users, Package, Search, X } from 'lucide-vue-next'
import { distributeBundleAmount } from '~/composables/useSales'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { userProfile } = useAuth()
const { getGroupProducts } = useProducts()
const { createSale } = useSales()
const toast = useToast()
const { currentGroupId } = useCurrentGroup()

const loading = ref(true)
const submitting = ref(false)
const products = ref<any[]>([])
const cart = ref<Map<string, { quantity: number; unitPrice: number }>>(new Map())
const note = ref('')
const bundleMode = ref(false)
const bundleTotalAmount = ref<number>(0)
const searchQuery = ref('')
const hideOutOfStock = ref(false)

const isSelected = (id: string) => cart.value.has(id)
const getQty = (id: string) => cart.value.get(id)?.quantity || 0

// 商品名・オーナー名・カテゴリ・タグでの部分一致(大文字小文字・全半角無視)。
// 商品一覧 (products/index.vue) の検索仕様を拡張し、タグ/カテゴリも対象。
const normalize = (s: string) => (s || '').toLowerCase().trim()

const filteredProducts = computed(() => {
  const q = normalize(searchQuery.value)
  return products.value.filter((p: any) => {
    if (hideOutOfStock.value && (p.stock || 0) <= 0) return false
    if (!q) return true
    if (normalize(p.name).includes(q)) return true
    if (normalize(p.ownerName).includes(q)) return true
    if (normalize(p.category || '').includes(q)) return true
    const tags: string[] = Array.isArray(p.tags) ? p.tags : []
    if (tags.some((t) => normalize(t).includes(q))) return true
    return false
  })
})

const removeFromCart = (id: string) => {
  if (!cart.value.has(id)) return
  cart.value.delete(id)
  cart.value = new Map(cart.value)
}

const toggleProduct = (product: any) => {
  if (cart.value.has(product.id)) {
    cart.value.delete(product.id)
  } else if (product.stock > 0) {
    cart.value.set(product.id, { quantity: 1, unitPrice: product.price })
  } else {
    toast.warning('在庫がありません')
  }
  cart.value = new Map(cart.value)
}

const changeQty = (id: string, delta: number) => {
  const entry = cart.value.get(id)
  if (!entry) return
  const product = products.value.find((p) => p.id === id)
  const newQty = entry.quantity + delta
  if (newQty <= 0) {
    cart.value.delete(id)
  } else if (product && newQty <= product.stock) {
    cart.value.set(id, { ...entry, quantity: newQty })
  }
  cart.value = new Map(cart.value)
}

const changeUnitPrice = (id: string, price: number) => {
  const entry = cart.value.get(id)
  if (!entry) return
  const safePrice = isNaN(price) ? 0 : Math.max(0, price)
  cart.value.set(id, { ...entry, unitPrice: safePrice })
  cart.value = new Map(cart.value)
}

const selectedItems = computed(() => {
  const items: any[] = []
  for (const [productId, entry] of cart.value) {
    const product = products.value.find((p) => p.id === productId)
    if (product) {
      items.push({
        productId,
        productName: product.name,
        ownerUid: product.ownerUid,
        ownerName: product.ownerName,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        subtotal: entry.unitPrice * entry.quantity,
      })
    }
  }
  return items
})

const totalAmount = computed(() => selectedItems.value.reduce((sum, i) => sum + i.subtotal, 0))

// 絞り込みから外れた「選択中の商品」。検索で非表示になっても選択が
// 黙って消えないよう、選択解除用の UI を別枠で表示する。
const hiddenSelectedItems = computed(() => {
  const visibleIds = new Set(filteredProducts.value.map((p: any) => p.id))
  return selectedItems.value.filter((i) => !visibleIds.has(i.productId))
})

const handleSubmit = async () => {
  if (selectedItems.value.length === 0) return
  submitting.value = true
  try {
    let itemsToSubmit = selectedItems.value
    let isBundle = false

    if (bundleMode.value) {
      const total = bundleTotalAmount.value
      if (!total || total <= 0) {
        toast.error('売上金額を入力してください')
        submitting.value = false
        return
      }
      itemsToSubmit = distributeBundleAmount(selectedItems.value, total)
      isBundle = true
    }

    await createSale(
      currentGroupId.value!,
      itemsToSubmit,
      note.value,
      userProfile.value!.uid,
      userProfile.value!.displayName,
      isBundle,
    )
    toast.success('売上を記録しました！')
    navigateTo('/sales')
  } catch (e: any) {
    toast.error(e.message || '売上の記録に失敗しました')
  } finally {
    submitting.value = false
  }
}

// クエリパラメータで商品を事前選択する(例: 商品一覧からの「売上記録」導線)。
// ?productId=<id> で指定された商品が在庫ありならカートに追加する。
const preselectFromQuery = () => {
  const raw = route.query.productId
  const ids: string[] = Array.isArray(raw)
    ? (raw.filter((v): v is string => typeof v === 'string'))
    : typeof raw === 'string' && raw
      ? [raw]
      : []
  if (ids.length === 0) return
  let added = 0
  for (const id of ids) {
    const product = products.value.find((p) => p.id === id)
    if (!product) continue
    if ((product.stock || 0) <= 0) continue
    if (cart.value.has(id)) continue
    cart.value.set(id, { quantity: 1, unitPrice: product.price })
    added++
  }
  if (added > 0) cart.value = new Map(cart.value)
}

onMounted(async () => {
  if (!currentGroupId.value) { loading.value = false; return }
  try {
    products.value = await getGroupProducts(currentGroupId.value)
    preselectFromQuery()
  } catch (e) {
    toast.error('商品データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
