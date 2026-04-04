<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">← 戻る</button>
      <h2 class="page-title">売上を記録</h2>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState icon="👥" title="グループを選択してください" description="ホーム画面でグループを選択してください" />
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="products.length > 0">
      <div class="max-w-lg space-y-5">
        <!-- Product Selection -->
        <div class="card">
          <h3 class="section-title mb-3">商品を選択</h3>
          <div class="space-y-3">
            <div v-for="product in products" :key="product.id"
              class="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer"
              :class="isSelected(product.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200'"
              @click="toggleProduct(product)"
            >
              <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                <img v-if="product.thumbnailUrl" :src="product.thumbnailUrl" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center">📦</div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">{{ product.name }}</p>
                <p class="text-xs text-slate-400">{{ product.ownerName }} · ¥{{ product.price.toLocaleString() }} · 在庫{{ product.stock }}</p>
              </div>
              <div v-if="isSelected(product.id)" class="shrink-0" @click.stop>
                <div class="flex items-center gap-2">
                  <button @click="changeQty(product.id, -1)" class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-sm">−</button>
                  <span class="w-8 text-center font-medium">{{ getQty(product.id) }}</span>
                  <button @click="changeQty(product.id, 1)" class="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm disabled:opacity-50" :disabled="getQty(product.id) >= product.stock">＋</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Items Summary -->
        <div v-if="selectedItems.length > 0" class="card">
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
                  class="w-20 px-2 py-1 rounded-lg border border-slate-200 text-right text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
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
      </div>
    </template>

    <EmptyState v-else-if="!loading" icon="📦" title="商品がありません" description="先に商品を登録してください">
      <template #action><NuxtLink to="/products/new" class="btn-primary btn-sm">商品を登録</NuxtLink></template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { userProfile } = useAuth()
const { getGroupProducts } = useProducts()
const { createSale } = useSales()
const toast = useToast()
const currentGroupId = useState<string | null>('currentGroupId')

const loading = ref(true)
const submitting = ref(false)
const products = ref<any[]>([])
const cart = ref<Map<string, { quantity: number; unitPrice: number }>>(new Map())
const note = ref('')

const isSelected = (id: string) => cart.value.has(id)
const getQty = (id: string) => cart.value.get(id)?.quantity || 0

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

const handleSubmit = async () => {
  if (selectedItems.value.length === 0) return
  submitting.value = true
  try {
    await createSale(
      currentGroupId.value!,
      selectedItems.value,
      note.value,
      userProfile.value!.uid,
      userProfile.value!.displayName,
    )
    toast.success('売上を記録しました！')
    navigateTo('/sales')
  } catch (e: any) {
    toast.error(e.message || '売上の記録に失敗しました')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!currentGroupId.value) { loading.value = false; return }
  try {
    products.value = await getGroupProducts(currentGroupId.value)
  } catch (e) {
    toast.error('商品データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
