<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title">商品詳細</h2>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="product">
      <div class="max-w-lg space-y-5">
        <!-- Product Image -->
        <div class="card">
          <div class="aspect-video rounded-xl bg-slate-100 overflow-hidden mb-4">
            <img v-if="product.imageUrl" :src="editing ? (newImagePreview || product.imageUrl) : product.imageUrl" class="w-full h-full object-contain" />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
              <Package :size="48" :stroke-width="1.5" />
            </div>
          </div>
          <div v-if="editing">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
            <button type="button" @click="triggerFileInput" class="btn-secondary btn-sm w-full">
              <ImageIcon :size="16" />
              画像を変更
            </button>
          </div>
        </div>

        <!-- Product Info -->
        <div class="card space-y-4">
          <div v-if="!editing">
            <h3 class="text-xl font-bold text-slate-800">{{ product.name }}</h3>
            <p v-if="product.description" class="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{{ product.description }}</p>
            <p class="text-lg font-semibold text-primary-500 mt-2">¥{{ product.price.toLocaleString() }}</p>
            <p class="text-sm text-slate-500 mt-2">所有者: {{ product.ownerName }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <span :class="product.stock > 0 ? 'badge-green' : 'badge-red'">在庫 {{ product.stock }}個</span>
              <span class="badge-primary">{{ product.category || 'その他' }}</span>
            </div>
            <div v-if="product.tags?.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span v-for="tag in product.tags" :key="tag" class="badge-sub1">{{ tag }}</span>
            </div>
          </div>

          <template v-else>
            <div>
              <label class="label-text">商品名</label>
              <input v-model="editForm.name" type="text" class="input-field" required />
            </div>
            <div>
              <label class="label-text">説明</label>
              <textarea v-model="editForm.description" class="input-field" rows="3" />
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
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-medium text-slate-600">カテゴリ</label>
                <button
                  type="button"
                  @click="handleAiSuggest"
                  class="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-50"
                  :disabled="aiSuggesting || !editForm.name"
                >
                  <Sparkles :size="14" />
                  {{ aiSuggesting ? 'AI分析中...' : 'AIで自動生成' }}
                </button>
              </div>
              <select v-model="editForm.category" class="input-field">
                <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div>
              <label class="label-text">タグ</label>
              <div v-if="editForm.tags.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(tag, i) in editForm.tags" :key="i" class="badge-sub1 flex items-center gap-1">
                  {{ tag }}
                  <button type="button" @click="editForm.tags.splice(i, 1)" class="hover:text-red-500">
                    <X :size="12" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="editTagInput"
                  type="text"
                  class="input-field"
                  placeholder="タグを入力してEnter"
                  @keydown.enter.prevent="addEditTag"
                />
                <button type="button" @click="addEditTag" class="btn-secondary btn-sm shrink-0">追加</button>
              </div>
            </div>
          </template>

          <div class="flex gap-3">
            <template v-if="!editing">
              <button @click="startEdit" class="btn-primary btn-sm flex-1">
                <Pencil :size="16" />
                編集
              </button>
              <button @click="showDeleteConfirm = true" class="btn-danger btn-sm">
                <Trash2 :size="16" />
                削除
              </button>
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
          <div class="flex items-center justify-center gap-3 mb-3">
            <button @click="adjustStock(-1)" class="btn-secondary btn-sm" :disabled="product.stock <= 0">
              <Minus :size="16" />
            </button>
            <span class="text-xl font-bold text-slate-800 w-16 text-center">{{ product.stock }}</span>
            <button @click="adjustStock(1)" class="btn-secondary btn-sm">
              <Plus :size="16" />
            </button>
          </div>
          <div class="flex items-center gap-3">
            <input v-model.number="stockInput" type="number" min="0" class="input-field flex-1" placeholder="数量を直接入力" />
            <button @click="setStock" class="btn-primary btn-sm shrink-0">設定</button>
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
import { ArrowLeft, Package, ImageIcon, Pencil, Trash2, Minus, Plus, Sparkles, X } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { getProduct, updateProduct, updateStock, adjustStock: composableAdjustStock, deleteProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { suggestCategoryAndTags } = useAiSuggestion()
const toast = useToast()
const { currentGroupId } = useCurrentGroup()

const productId = route.params.id as string
const loading = ref(true)
const product = ref<any>(null)
const members = ref<any[]>([])
const editing = ref(false)
const submitting = ref(false)
const aiSuggesting = ref(false)
const showDeleteConfirm = ref(false)
const stockInput = ref<number | null>(null)
const newImageFile = ref<File | null>(null)
const newImagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
const editTagInput = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const editForm = reactive({ name: '', description: '', price: 0, ownerUid: '', category: 'その他', tags: [] as string[] })

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && file.type.startsWith('image/')) {
    if (newImagePreview.value) URL.revokeObjectURL(newImagePreview.value)
    newImageFile.value = file
    newImagePreview.value = URL.createObjectURL(file)
  }
}

const startEdit = () => {
  editForm.name = product.value.name
  editForm.description = product.value.description || ''
  editForm.price = product.value.price
  editForm.ownerUid = product.value.ownerUid
  editForm.category = product.value.category || 'その他'
  editForm.tags = [...(product.value.tags || [])]
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
  newImageFile.value = null
  if (newImagePreview.value) URL.revokeObjectURL(newImagePreview.value)
  newImagePreview.value = null
}

const addEditTag = () => {
  const tag = editTagInput.value.trim()
  if (tag && !editForm.tags.includes(tag)) {
    editForm.tags.push(tag)
  }
  editTagInput.value = ''
}

const handleAiSuggest = async () => {
  if (!editForm.name) return
  aiSuggesting.value = true
  try {
    const result = await suggestCategoryAndTags(editForm.name, editForm.description)
    editForm.category = result.category
    editForm.tags = result.tags
    toast.success('AIがカテゴリとタグを提案しました')
  } catch {
    toast.error('AI提案に失敗しました')
  } finally {
    aiSuggesting.value = false
  }
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
  try {
    const newStock = await composableAdjustStock(productId, delta)
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

onBeforeUnmount(() => {
  if (newImagePreview.value) URL.revokeObjectURL(newImagePreview.value)
})
</script>
