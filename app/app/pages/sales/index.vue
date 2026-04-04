<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="page-title">売上管理</h2>
      <NuxtLink v-if="currentGroupId" to="/sales/new" class="btn-primary btn-sm">
        <PlusCircle :size="16" />
        売上記録
      </NuxtLink>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        <button
          @click="activeTab = 'summary'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'summary' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          サマリー
        </button>
        <button
          @click="activeTab = 'detail'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'detail' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          明細
        </button>
        <button
          @click="activeTab = 'byOwner'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'byOwner' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          ユーザー別
        </button>
      </div>

      <LoadingSpinner v-if="loading" full-page />

      <template v-else>
        <!-- Summary Tab -->
        <div v-if="activeTab === 'summary'">
          <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="stat-card">
              <span class="stat-value text-emerald-600">¥{{ summary.totalAmount.toLocaleString() }}</span>
              <span class="stat-label">総売上</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ summary.totalSales }}</span>
              <span class="stat-label">取引数</span>
            </div>
          </div>

          <!-- By Product -->
          <div class="card mb-4">
            <h3 class="section-title mb-4">商品別売上</h3>
            <div v-if="Object.keys(summary.byProduct).length === 0" class="text-sm text-slate-400 text-center py-4">データなし</div>
            <div v-else class="space-y-3">
              <div v-for="(data, pid) in sortedByProduct" :key="pid">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-slate-700">{{ data.name }}</span>
                  <span class="text-sm font-semibold text-emerald-600">¥{{ data.amount.toLocaleString() }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-primary-300 rounded-full" :style="{ width: `${(data.amount / maxProductAmount) * 100}%` }" />
                  </div>
                  <span class="text-xs text-slate-400 w-12 text-right">{{ data.quantity }}個</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Tab -->
        <div v-if="activeTab === 'detail'">
          <EmptyState v-if="sales.length === 0" :icon="Coins" title="売上データなし" description="売上を記録しましょう">
            <template #action><NuxtLink to="/sales/new" class="btn-primary btn-sm">売上を記録</NuxtLink></template>
          </EmptyState>

          <!-- Mobile Cards -->
          <div class="md:hidden space-y-3">
            <NuxtLink
              v-for="s in sales" :key="s.id"
              :to="`/sales/${s.id}`"
              class="card block hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-400">{{ formatDate(s.createdAt) }}</span>
                <span class="text-sm font-bold text-emerald-600">¥{{ s.totalAmount.toLocaleString() }}</span>
              </div>
              <p class="text-sm font-medium text-slate-700 truncate">
                {{ s.items.map((i: any) => `${i.productName}×${i.quantity}`).join('、') }}
              </p>
              <p class="text-xs text-slate-400 mt-1">記録: {{ s.createdByName }}</p>
            </NuxtLink>
          </div>

          <!-- Desktop Table -->
          <div class="hidden md:block card overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-slate-100">
                  <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">日時</th>
                  <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">内容</th>
                  <th class="text-left py-3 px-4 text-sm font-medium text-slate-500">記録者</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-slate-500">金額</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in sales" :key="s.id" class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" @click="navigateTo(`/sales/${s.id}`)">
                  <td class="py-3 px-4 text-sm text-slate-600">{{ formatDate(s.createdAt) }}</td>
                  <td class="py-3 px-4 text-sm text-slate-700">{{ s.items.map((i: any) => `${i.productName}×${i.quantity}`).join('、') }}</td>
                  <td class="py-3 px-4 text-sm text-slate-600">{{ s.createdByName }}</td>
                  <td class="py-3 px-4 text-right text-sm font-semibold text-emerald-600">¥{{ s.totalAmount.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- By Owner Tab -->
        <div v-if="activeTab === 'byOwner'">
          <div v-if="Object.keys(summary.byOwner).length === 0" class="text-center py-8 text-slate-400">データなし</div>
          <div v-else class="space-y-4">
            <div v-for="(data, uid) in summary.byOwner" :key="uid" class="card">
              <div class="flex items-center justify-between mb-3" @click="toggleOwner(uid as string)" role="button">
                <div>
                  <h4 class="font-medium text-slate-800">{{ data.name }}</h4>
                  <p class="text-xs text-slate-400">{{ data.sales }}個販売</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-emerald-600">¥{{ data.amount.toLocaleString() }}</p>
                  <span class="text-xs text-primary-500">{{ expandedOwner === uid ? '閉じる' : '詳細を見る' }}</span>
                </div>
              </div>
              <!-- Drill-down detail -->
              <div v-if="expandedOwner === uid" class="border-t border-slate-100 pt-3 space-y-2">
                <div v-for="item in getOwnerItems(uid as string)" :key="item.productId" class="flex items-center justify-between text-sm">
                  <span class="text-slate-600">{{ item.productName }} × {{ item.quantity }}</span>
                  <span class="text-slate-700 font-medium">¥{{ item.amount.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { PlusCircle, Users, Coins } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { getGroupSales, getSalesSummary } = useSales()
const toast = useToast()
const currentGroupId = useState<string | null>('currentGroupId')

const loading = ref(true)
const activeTab = ref('summary')
const sales = ref<any[]>([])
const expandedOwner = ref<string | null>(null)

const summary = computed(() => getSalesSummary(sales.value))

const maxProductAmount = computed(() => {
  const amounts = Object.values(summary.value.byProduct).map((p) => p.amount)
  return Math.max(...amounts, 1)
})

const sortedByProduct = computed(() => {
  const entries = Object.entries(summary.value.byProduct)
  entries.sort((a, b) => b[1].amount - a[1].amount)
  return Object.fromEntries(entries)
})

const toggleOwner = (uid: string) => {
  expandedOwner.value = expandedOwner.value === uid ? null : uid
}

const getOwnerItems = (uid: string) => {
  const items: Record<string, { productName: string; quantity: number; amount: number }> = {}
  for (const sale of sales.value) {
    for (const item of sale.items) {
      if (item.ownerUid === uid) {
        if (!items[item.productId]) {
          items[item.productId] = { productName: item.productName, quantity: 0, amount: 0 }
        }
        items[item.productId].quantity += item.quantity
        items[item.productId].amount += item.subtotal
      }
    }
  }
  return Object.values(items)
}

const loadData = async () => {
  if (!currentGroupId.value) { loading.value = false; return }
  loading.value = true
  try {
    sales.value = await getGroupSales(currentGroupId.value)
  } catch (e) {
    toast.error('売上データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

watch(currentGroupId, loadData)
onMounted(loadData)
</script>
