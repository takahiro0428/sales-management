<template>
  <div>
    <h2 class="page-title mb-6">在庫管理</h2>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <template v-else>
      <!-- Filter -->
      <div class="flex items-center gap-3 mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="lowStockOnly" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200" />
          <span class="text-sm text-slate-600">在庫少のみ表示</span>
        </label>
        <span class="text-sm text-slate-400">{{ filteredProducts.length }}件</span>
      </div>

      <LoadingSpinner v-if="loading" full-page />

      <EmptyState v-else-if="filteredProducts.length === 0" :icon="ClipboardList" title="商品がありません" description="商品を登録すると在庫管理ができます" />

      <!-- Mobile Card View -->
      <div v-else class="md:hidden space-y-3">
        <div v-for="p in filteredProducts" :key="p.id" class="card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
              <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                <Package :size="20" :stroke-width="1.5" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-slate-800 truncate text-sm">{{ p.name }}</h3>
              <p class="text-xs text-slate-400">{{ p.ownerName }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button @click="adjust(p, -1)" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center" :disabled="p.stock <= 0">
                <Minus :size="14" />
              </button>
              <span class="w-10 text-center font-bold text-lg" :class="stockColor(p.stock)">{{ p.stock }}</span>
              <button @click="adjust(p, 1)" class="w-8 h-8 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center">
                <Plus :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div v-if="filteredProducts.length > 0" class="hidden md:block card overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">商品</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">オーナー</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-slate-500">価格</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-slate-500">在庫数</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-slate-500">調整</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id" class="border-b border-slate-50">
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                      <Package :size="14" :stroke-width="1.5" />
                    </div>
                  </div>
                  <span class="font-medium text-slate-800 text-sm">{{ p.name }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-sm text-slate-600">{{ p.ownerName }}</td>
              <td class="py-3 px-4 text-right text-sm">¥{{ p.price.toLocaleString() }}</td>
              <td class="py-3 px-4 text-center">
                <span class="font-bold" :class="stockColor(p.stock)">{{ p.stock }}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button @click="adjust(p, -1)" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center" :disabled="p.stock <= 0">
                    <Minus :size="14" />
                  </button>
                  <button @click="adjust(p, 1)" class="w-7 h-7 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center">
                    <Plus :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Users, ClipboardList, Package, Minus, Plus } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { getGroupProducts, adjustStock: composableAdjustStock } = useProducts()
const toast = useToast()
const currentGroupId = useState<string | null>('currentGroupId')

const loading = ref(true)
const products = ref<any[]>([])
const lowStockOnly = ref(false)

const filteredProducts = computed(() => {
  let result = [...products.value]
  if (lowStockOnly.value) {
    result = result.filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
  }
  result.sort((a, b) => a.stock - b.stock)
  return result
})

const stockColor = (stock: number) => {
  if (stock === 0) return 'text-red-500'
  if (stock <= LOW_STOCK_THRESHOLD) return 'text-amber-500'
  return 'text-emerald-600'
}

const adjust = async (product: any, delta: number) => {
  try {
    const newStock = await composableAdjustStock(product.id, delta)
    product.stock = newStock
  } catch (e) {
    toast.error('在庫の更新に失敗しました')
  }
}

const loadData = async () => {
  if (!currentGroupId.value) { loading.value = false; return }
  loading.value = true
  try {
    products.value = await getGroupProducts(currentGroupId.value)
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

watch(currentGroupId, loadData)
onMounted(loadData)
</script>
