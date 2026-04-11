<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="page-title">商品管理</h2>
      <div v-if="currentGroupId" class="flex flex-wrap gap-2">
        <NuxtLink to="/products/import" class="btn-secondary btn-sm">
          <FileSpreadsheet :size="16" />
          Excelインポート
        </NuxtLink>
        <NuxtLink to="/products/bulk-new" class="btn-secondary btn-sm">
          <Images :size="16" />
          一括登録
        </NuxtLink>
        <NuxtLink to="/products/new" class="btn-primary btn-sm">
          <PlusCircle :size="16" />
          追加
        </NuxtLink>
      </div>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="card mb-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <div class="relative">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input v-model="searchQuery" type="text" class="input-field pl-9" placeholder="商品名で検索..." />
            </div>
          </div>
          <div class="sm:w-40">
            <select v-model="filterCategory" class="input-field">
              <option value="">すべてのカテゴリ</option>
              <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="sm:w-40">
            <select v-model="filterOwner" class="input-field">
              <option value="">すべてのオーナー</option>
              <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
            </select>
          </div>
          <div class="sm:w-36">
            <select v-model="filterStatus" class="input-field">
              <option value="">すべてのステータス</option>
              <option value="published">公開</option>
              <option value="unpublished">非公開</option>
            </select>
          </div>
        </div>
      </div>

      <LoadingSpinner v-if="loading" full-page />

      <EmptyState v-else-if="filteredProducts.length === 0" :icon="Package" title="商品がありません" description="新しい商品を登録しましょう">
        <template #action><NuxtLink to="/products/new" class="btn-primary btn-sm">商品を登録</NuxtLink></template>
      </EmptyState>

      <!-- Mobile Card View -->
      <div v-else class="md:hidden space-y-3">
        <NuxtLink
          v-for="p in filteredProducts" :key="p.id"
          :to="`/products/${p.id}`"
          class="card block hover:shadow-md transition-shadow"
        >
          <div class="flex gap-3">
            <div class="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
              <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" :alt="p.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                <Package :size="24" :stroke-width="1.5" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-slate-800 truncate">{{ p.name }}</h3>
              <p class="text-sm text-slate-500">{{ p.ownerName }}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-sm font-semibold text-primary-500">¥{{ p.price.toLocaleString() }}</span>
                <span :class="p.stock > 0 ? 'badge-green' : 'badge-red'">在庫 {{ p.stock }}</span>
                <span class="badge-primary text-[10px]">{{ p.category || 'その他' }}</span>
                <span v-if="(p.status || 'published') === 'unpublished'" class="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  <EyeOff :size="10" /> 非公開
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Desktop Table View -->
      <div v-if="filteredProducts.length > 0" class="hidden md:block card overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">商品</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">カテゴリ</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">オーナー</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-slate-500">価格</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-slate-500">在庫</th>
              <th class="text-center py-3 px-4 text-sm font-medium text-slate-500">ステータス</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-slate-500"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id" class="border-b border-slate-50 hover:bg-slate-50">
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" :alt="p.name" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                      <Package :size="18" :stroke-width="1.5" />
                    </div>
                  </div>
                  <span class="font-medium text-slate-800">{{ p.name }}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="badge-primary text-[10px]">{{ p.category || 'その他' }}</span>
              </td>
              <td class="py-3 px-4 text-sm text-slate-600">{{ p.ownerName }}</td>
              <td class="py-3 px-4 text-right text-sm font-medium">¥{{ p.price.toLocaleString() }}</td>
              <td class="py-3 px-4 text-right">
                <span :class="p.stock > 0 ? 'badge-green' : 'badge-red'">{{ p.stock }}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span v-if="(p.status || 'published') === 'published'" class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <Eye :size="10" /> 公開
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  <EyeOff :size="10" /> 非公開
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <NuxtLink :to="`/products/${p.id}`" class="text-primary-500 hover:text-primary-600 text-sm">詳細</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { PlusCircle, Package, Users, Search, Images, Eye, EyeOff, FileSpreadsheet } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

const { getGroupProducts } = useProducts()
const { getGroupMembers } = useGroups()
const toast = useToast()

const { currentGroupId } = useCurrentGroup()
const loading = ref(true)
const products = ref<any[]>([])
const members = ref<any[]>([])
const searchQuery = ref('')
const filterOwner = ref('')
const filterCategory = ref('')
const filterStatus = ref('')

const filteredProducts = computed(() => {
  let result = products.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((p) => p.name.toLowerCase().includes(q))
  }
  if (filterOwner.value) {
    result = result.filter((p) => p.ownerUid === filterOwner.value)
  }
  if (filterCategory.value) {
    result = result.filter((p) => (p.category || 'その他') === filterCategory.value)
  }
  if (filterStatus.value) {
    result = result.filter((p) => (p.status || 'published') === filterStatus.value)
  }
  return result
})

const loadData = async () => {
  if (!currentGroupId.value) { loading.value = false; return }
  loading.value = true
  try {
    const [p, m] = await Promise.all([
      getGroupProducts(currentGroupId.value),
      getGroupMembers(currentGroupId.value),
    ])
    products.value = p
    members.value = m.filter((m) => m.status === 'active')
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

watch(currentGroupId, loadData)
onMounted(loadData)
</script>
