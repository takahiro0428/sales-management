<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title flex-1">売上詳細</h2>
      <template v-if="sale && canEdit">
        <button v-if="!editing" @click="startEdit" class="btn-secondary btn-sm">
          <Pencil :size="14" />
          編集
        </button>
        <button v-if="!editing" @click="showDeleteConfirm = true" class="btn-danger btn-sm">
          <Trash2 :size="14" />
          削除
        </button>
      </template>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="sale">
      <div class="max-w-lg space-y-4">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-slate-400">{{ formatDateFull(sale.createdAt) }}</span>
            <span class="text-xl font-bold text-emerald-600">¥{{ displayTotalAmount.toLocaleString() }}</span>
          </div>

          <div class="space-y-3">
            <div v-for="(item, idx) in (editing ? editItems : sale.items)" :key="idx" class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800">{{ item.productName }}</p>
                <p class="text-xs text-slate-400">{{ item.ownerName }}</p>
              </div>
              <template v-if="editing">
                <div class="flex items-center gap-1 shrink-0">
                  <button @click="editChangeQty(idx, -1)" class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">−</button>
                  <span class="w-6 text-center text-sm">{{ item.quantity }}</span>
                  <button @click="editChangeQty(idx, 1)" class="w-6 h-6 rounded-full bg-primary-400 text-white flex items-center justify-center text-xs">+</button>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-slate-400 text-xs">¥</span>
                  <input
                    type="number"
                    v-model.number="item.unitPrice"
                    @input="recalcSubtotal(idx)"
                    class="w-20 px-2 py-1 rounded-lg border border-slate-200 text-right text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none"
                    min="0"
                  />
                </div>
                <span class="text-sm font-semibold text-slate-700 shrink-0 w-16 text-right">¥{{ item.subtotal.toLocaleString() }}</span>
              </template>
              <template v-else>
                <span class="text-xs text-slate-400 shrink-0">¥{{ item.unitPrice.toLocaleString() }} × {{ item.quantity }}</span>
                <span class="text-sm font-semibold text-slate-700 shrink-0">¥{{ item.subtotal.toLocaleString() }}</span>
              </template>
            </div>
          </div>

          <div class="border-t border-slate-200 mt-4 pt-4">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-800">合計</span>
              <span class="text-lg font-bold text-emerald-600">¥{{ displayTotalAmount.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <p class="text-sm text-slate-500">記録者: {{ sale.createdByName }}</p>
          <template v-if="editing">
            <label class="label-text mt-2">メモ（任意）</label>
            <input v-model="editNote" type="text" class="input-field" placeholder="例：まとめ買い割引" />
          </template>
          <p v-else-if="sale.note" class="text-sm text-slate-500 mt-1">メモ: {{ sale.note }}</p>
        </div>

        <div v-if="editing" class="flex gap-3">
          <button @click="cancelEdit" class="btn-secondary flex-1">キャンセル</button>
          <button @click="handleUpdate" class="btn-success flex-1" :disabled="submitting">
            <LoadingSpinner v-if="submitting" size="sm" />
            {{ submitting ? '保存中...' : '保存する' }}
          </button>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="売上を削除"
      message="この売上記録を削除しますか？在庫は元に戻ります。"
      confirm-text="削除する"
      danger-mode
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Pencil, Trash2 } from 'lucide-vue-next'
import type { SaleItem } from '~/composables/useSales'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { getSale, updateSale, deleteSale } = useSales()
const { userProfile, isPlatformAdmin } = useAuth()
const { isGroupAdmin } = useGroups()
const toast = useToast()

const saleId = route.params.id as string
const loading = ref(true)
const submitting = ref(false)
const sale = ref<any>(null)
const editing = ref(false)
const editItems = ref<SaleItem[]>([])
const editNote = ref('')
const showDeleteConfirm = ref(false)
const isAdmin = ref(false)

const canEdit = computed(() => {
  if (!sale.value || !userProfile.value) return false
  return sale.value.createdBy === userProfile.value.uid || isPlatformAdmin.value || isAdmin.value
})

const displayTotalAmount = computed(() => {
  if (editing.value) {
    return editItems.value.reduce((sum, i) => sum + i.subtotal, 0)
  }
  return sale.value?.totalAmount ?? 0
})

const startEdit = () => {
  editItems.value = sale.value.items.map((i: SaleItem) => ({ ...i }))
  editNote.value = sale.value.note || ''
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
}

const recalcSubtotal = (idx: number) => {
  const item = editItems.value[idx]
  item.unitPrice = isNaN(item.unitPrice) ? 0 : Math.max(0, item.unitPrice)
  item.subtotal = item.unitPrice * item.quantity
}

const editChangeQty = (idx: number, delta: number) => {
  const item = editItems.value[idx]
  const newQty = item.quantity + delta
  if (newQty <= 0) return
  item.quantity = newQty
  item.subtotal = item.unitPrice * item.quantity
}

const handleUpdate = async () => {
  submitting.value = true
  try {
    await updateSale(saleId, sale.value.items, editItems.value, editNote.value)
    sale.value = await getSale(saleId)
    editing.value = false
    toast.success('売上を更新しました')
  } catch (e: any) {
    toast.error(e.message || '売上の更新に失敗しました')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async () => {
  submitting.value = true
  try {
    await deleteSale(saleId, sale.value.items)
    toast.success('売上を削除しました')
    navigateTo('/sales')
  } catch (e: any) {
    toast.error(e.message || '売上の削除に失敗しました')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    sale.value = await getSale(saleId)
    if (sale.value && userProfile.value) {
      isAdmin.value = await isGroupAdmin(sale.value.groupId, userProfile.value.uid)
    }
  } catch (e) {
    toast.error('売上データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
