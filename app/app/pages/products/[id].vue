<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">← 戻る</button>
      <h2 class="page-title">商品詳細</h2>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="product">
      <div class="max-w-lg space-y-5">
        <!-- Product Image -->
        <div class="card">
          <div class="aspect-video rounded-xl bg-slate-100 overflow-hidden mb-4">
            <img v-if="product.imageUrl" :src="editing ? (newImagePreview || product.imageUrl) : product.imageUrl" class="w-full h-full object-contain" />
            <div v-else class="w-full h-full flex items-center justify-center text-5xl">📦</div>
          </div>
          <div v-if="editing">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
            <button type="button" @click="($refs.fileInput as HTMLInputElement).click()" class="btn-secondary btn-sm w-full">画像を変更</button>
          </div>
        </div>

        <!-- Product Info -->
        <div class="card space-y-4">
          <div v-if="!editing">
            <h3 class="text-xl font-bold text-slate-800">{{ product.name }}</h3>
            <p class="text-lg font-semibold text-blue-600 mt-1">¥{{ product.price.toLocaleString() }}</p>
            <p class="text-sm text-slate-500 mt-2">所有者: {{ product.ownerName }}</p>
            <div class="mt-3">
              <span :class="product.stock > 0 ? 'badge-green' : 'badge-red'">在庫 {{ product.stock }}個</span>
            </div>
          </div>

          <template v-else>
            <div>
              <label class="label-text">商品名</label>
              <input v-model="editForm.name" type="text" class="input-field" required />
            </div>
            <div>
              <label class="label-text">価格</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                <input v-model.number="editForm.price" type="number" min="0" class="input-field pl-8" required />
              </div>
            </div>
            <div>
              <label class="label-text">所有者</label>
              <select v-model="editForm.ownerUid" class="input-field">
                <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
              </select>
            </div>
          </template>

          <div class="flex gap-3">
            <template v-if="!editing">
              <button @click="startEdit" class="btn-primary btn-sm flex-1">編集</button>
              <button @click="showDeleteConfirm = true" class="btn-danger btn-sm">削除</button>
            </template>
            <template v-else>
              <button @click="saveEdit" class="btn-success btn-sm flex-1" :disabled="submitting">保存</button>
              <button @click="cancelEdit" class="btn-secondary btn-sm">キャンセル</button>
            </template>
          </div>
        </div>

        <!-- Stock Adjustment -->
        <div class="card">
          <h3 class="section-title mb-3">在庫調整</h3>
          <div class="flex items-center gap-3">
            <button @click="adjustStock(-1)" class="btn-secondary btn-sm" :disabled="product.stock <= 0">-</button>
            <span class="text-xl font-bold text-slate-800 w-16 text-center">{{ product.stock }}</span>
            <button @click="adjustStock(1)" class="btn-secondary btn-sm">+</button>
            <div class="flex-1">
              <input v-model.number="stockInput" type="number" min="0" class="input-field" placeholder="直接入力" />
            </div>
            <button @click="setStock" class="btn-primary btn-sm">設定</button>
          </div>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="商品を削除"
      message="この商品を削除してもよろしいですか？この操作は取り消せません。"
      confirm-text="削除する"
      danger-mode
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { getProduct, updateProduct, updateStock, deleteProduct } = useProducts()
const { getGroupMembers } = useGroups()
const toast = useToast()
const currentGroupId = useState<string | null>('currentGroupId')

const productId = route.params.id as string
const loading = ref(true)
const product = ref<any>(null)
const members = ref<any[]>([])
const editing = ref(false)
const submitting = ref(false)
const showDeleteConfirm = ref(false)
const stockInput = ref<number | null>(null)
const newImageFile = ref<File | null>(null)
const newImagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const editForm = reactive({ name: '', price: 0, ownerUid: '' })

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    newImageFile.value = file
    newImagePreview.value = URL.createObjectURL(file)
  }
}

const startEdit = () => {
  editForm.name = product.value.name
  editForm.price = product.value.price
  editForm.ownerUid = product.value.ownerUid
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
  newImageFile.value = null
  newImagePreview.value = null
}

const saveEdit = async () => {
  submitting.value = true
  try {
    const owner = members.value.find((m) => m.uid === editForm.ownerUid)
    await updateProduct(productId, {
      ...editForm,
      ownerName: owner?.displayName || product.value.ownerName,
      groupId: currentGroupId.value!,
    } as any, newImageFile.value)
    product.value = { ...product.value, ...editForm, ownerName: owner?.displayName || product.value.ownerName }
    if (newImagePreview.value) product.value.imageUrl = newImagePreview.value
    editing.value = false
    toast.success('商品を更新しました')
  } catch (e) {
    toast.error('更新に失敗しました')
  } finally {
    submitting.value = false
  }
}

const adjustStock = async (delta: number) => {
  const newStock = Math.max(0, product.value.stock + delta)
  try {
    await updateStock(productId, newStock)
    product.value.stock = newStock
  } catch (e) {
    toast.error('在庫の更新に失敗しました')
  }
}

const setStock = async () => {
  if (stockInput.value === null || stockInput.value < 0) return
  try {
    await updateStock(productId, stockInput.value)
    product.value.stock = stockInput.value
    stockInput.value = null
    toast.success('在庫を更新しました')
  } catch (e) {
    toast.error('在庫の更新に失敗しました')
  }
}

const handleDelete = async () => {
  try {
    await deleteProduct(productId)
    toast.success('商品を削除しました')
    navigateTo('/products')
  } catch (e) {
    toast.error('削除に失敗しました')
  }
}

onMounted(async () => {
  try {
    const [p, m] = await Promise.all([
      getProduct(productId),
      currentGroupId.value ? getGroupMembers(currentGroupId.value) : Promise.resolve([]),
    ])
    product.value = p
    members.value = m.filter((m: any) => m.status === 'active')
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
