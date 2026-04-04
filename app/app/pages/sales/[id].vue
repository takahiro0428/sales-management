<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">← 戻る</button>
      <h2 class="page-title">売上詳細</h2>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="sale">
      <div class="max-w-lg space-y-4">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-slate-400">{{ formatDateFull(sale.createdAt) }}</span>
            <span class="text-xl font-bold text-emerald-600">¥{{ sale.totalAmount.toLocaleString() }}</span>
          </div>

          <div class="space-y-3">
            <div v-for="(item, idx) in sale.items" :key="idx" class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p class="text-sm font-medium text-slate-800">{{ item.productName }}</p>
                <p class="text-xs text-slate-400">{{ item.ownerName }} · ¥{{ item.unitPrice.toLocaleString() }} × {{ item.quantity }}</p>
              </div>
              <span class="text-sm font-semibold text-slate-700">¥{{ item.subtotal.toLocaleString() }}</span>
            </div>
          </div>

          <div class="border-t border-slate-200 mt-4 pt-4">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-800">合計</span>
              <span class="text-lg font-bold text-emerald-600">¥{{ sale.totalAmount.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <p class="text-sm text-slate-500">記録者: {{ sale.createdByName }}</p>
          <p v-if="sale.note" class="text-sm text-slate-500 mt-1">メモ: {{ sale.note }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { getSale } = useSales()
const toast = useToast()

const saleId = route.params.id as string
const loading = ref(true)
const sale = ref<any>(null)

onMounted(async () => {
  try {
    sale.value = await getSale(saleId)
  } catch (e) {
    toast.error('売上データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
