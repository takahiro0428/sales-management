<template>
  <div>
    <div class="mb-6">
      <h2 class="page-title">こんにちは、{{ userProfile?.displayName }}さん</h2>
      <p class="text-sm text-slate-500 mt-1">{{ todayString }}</p>
    </div>

    <!-- Group Selector -->
    <div v-if="groups.length > 1" class="mb-6">
      <label class="label-text">グループ</label>
      <select v-model="selectedGroupId" class="input-field" @change="onGroupChange">
        <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
    </div>

    <div v-if="groups.length === 0 && !loading" class="mt-8">
      <EmptyState
        :icon="Users"
        title="グループがありません"
        description="グループを作成するか、招待を受けてグループに参加しましょう"
      >
        <template #action>
          <NuxtLink to="/groups" class="btn-primary">グループを管理</NuxtLink>
        </template>
      </EmptyState>
    </div>

    <template v-if="selectedGroupId">
      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="stat-card">
          <span class="stat-value">{{ stats.productCount }}</span>
          <span class="stat-label">商品数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalStock }}</span>
          <span class="stat-label">総在庫数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.todaySalesCount }}</span>
          <span class="stat-label">本日の販売数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value text-emerald-600">¥{{ stats.todaySalesAmount.toLocaleString() }}</span>
          <span class="stat-label">本日の売上</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <NuxtLink to="/sales/new" class="card text-center hover:shadow-md transition-shadow py-4">
          <div class="flex justify-center mb-1 text-primary-400">
            <Coins :size="28" :stroke-width="1.5" />
          </div>
          <span class="text-xs font-medium text-slate-600">売上を記録</span>
        </NuxtLink>
        <NuxtLink to="/products/new" class="card text-center hover:shadow-md transition-shadow py-4">
          <div class="flex justify-center mb-1 text-sub1-400">
            <Package :size="28" :stroke-width="1.5" />
          </div>
          <span class="text-xs font-medium text-slate-600">商品を登録</span>
        </NuxtLink>
        <NuxtLink to="/inventory" class="card text-center hover:shadow-md transition-shadow py-4">
          <div class="flex justify-center mb-1 text-sub2-400">
            <ClipboardList :size="28" :stroke-width="1.5" />
          </div>
          <span class="text-xs font-medium text-slate-600">在庫を確認</span>
        </NuxtLink>
      </div>

      <!-- Recent Sales -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">最近の売上</h3>
          <NuxtLink to="/sales" class="text-sm text-primary-500 hover:text-primary-600">すべて見る →</NuxtLink>
        </div>
        <div v-if="recentSales.length === 0" class="text-center py-6 text-sm text-slate-400">
          売上データはまだありません
        </div>
        <div v-else class="space-y-3">
          <div v-for="sale in recentSales" :key="sale.id" class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div>
              <p class="text-sm font-medium text-slate-700">
                {{ sale.items.map((i: any) => i.productName).join(', ') }}
              </p>
              <p class="text-xs text-slate-400">{{ formatDate(sale.createdAt) }} · {{ sale.createdByName }}</p>
            </div>
            <span class="text-sm font-semibold text-emerald-600">¥{{ sale.totalAmount.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <LoadingSpinner v-if="loading" full-page />
  </div>
</template>

<script setup lang="ts">
import { Users, Coins, Package, ClipboardList } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { userProfile, isPlatformAdmin } = useAuth()
const { getMyGroups } = useGroups()
const { getGroupProducts } = useProducts()
const { getGroupSales } = useSales()
const toast = useToast()

const loading = ref(true)
const groups = ref<any[]>([])
const selectedGroupId = useState<string | null>('currentGroupId', () => null)
const currentGroupName = useState<string | null>('currentGroupName', () => null)
const products = ref<any[]>([])
const sales = ref<any[]>([])

const todayString = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const stats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todaySales = sales.value.filter((s) => {
    const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt)
    return d >= today
  })
  return {
    productCount: products.value.length,
    totalStock: products.value.reduce((sum: number, p: any) => sum + (p.stock || 0), 0),
    todaySalesCount: todaySales.reduce((sum: number, s: any) => sum + s.items.reduce((is: number, i: any) => is + i.quantity, 0), 0),
    todaySalesAmount: todaySales.reduce((sum: number, s: any) => sum + s.totalAmount, 0),
  }
})

const recentSales = computed(() => sales.value.slice(0, 5))

const loadGroupData = async () => {
  if (!selectedGroupId.value) return
  try {
    const [p, s] = await Promise.all([
      getGroupProducts(selectedGroupId.value),
      getGroupSales(selectedGroupId.value),
    ])
    products.value = p
    sales.value = s
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  }
}

const onGroupChange = () => {
  const g = groups.value.find((g) => g.id === selectedGroupId.value)
  currentGroupName.value = g?.name || null
  loadGroupData()
}

onMounted(async () => {
  try {
    groups.value = await getMyGroups(userProfile.value!.uid, isPlatformAdmin.value)
    if (groups.value.length > 0) {
      if (!selectedGroupId.value || !groups.value.find((g) => g.id === selectedGroupId.value)) {
        selectedGroupId.value = groups.value[0].id
      }
      currentGroupName.value = groups.value.find((g) => g.id === selectedGroupId.value)?.name || null
      await loadGroupData()
    }
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
