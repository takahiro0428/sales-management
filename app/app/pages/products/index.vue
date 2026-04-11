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
        <div
          v-for="p in filteredProducts" :key="p.id"
          class="card relative hover:shadow-md transition-shadow"
        >
          <NuxtLink :to="`/products/${p.id}`" class="flex gap-3">
            <div class="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
              <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" :alt="p.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                <Package :size="24" :stroke-width="1.5" />
              </div>
            </div>
            <div class="flex-1 min-w-0 pr-12">
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
          </NuxtLink>
          <button
            v-if="canEdit(p)"
            type="button"
            class="absolute top-1 right-1 inline-flex items-center justify-center w-11 h-11 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
            :aria-label="mobileEditingId === p.id ? '編集を閉じる' : '編集'"
            @click="toggleMobileEdit(p.id)"
          >
            <Pencil :size="18" />
          </button>
          <div v-if="mobileEditingId === p.id" class="mt-3 pt-3 border-t border-slate-100 space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">カテゴリ</label>
              <select v-model="mobileDraft.category" class="input-field">
                <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">オーナー</label>
              <select v-model="mobileDraft.ownerUid" class="input-field">
                <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">価格</label>
              <input
                v-model.number="mobileDraft.price"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="input-field"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">ステータス</label>
              <select v-model="mobileDraft.status" class="input-field">
                <option value="published">公開</option>
                <option value="unpublished">非公開</option>
              </select>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="btn-secondary btn-sm" @click="cancelMobileEdit">キャンセル</button>
              <button type="button" class="btn-primary btn-sm" @click="saveMobileEdit(p)">保存</button>
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
              <!-- カテゴリ -->
              <!--
                Inline edit pattern for selects:
                  @change   → commit (commitField clears editing state synchronously,
                              so the subsequent native blur becomes a no-op cancelEdit)
                  @blur     → fallback cancel for "opened then dismissed" with no change
                  @keydown.escape → explicit cancel
              -->
              <td class="py-3 px-4">
                <select
                  v-if="editingRowId === p.id && editingField === 'category'"
                  v-model="draft.category"
                  v-focus
                  class="input-field input-sm py-1 text-xs"
                  @change="commitField(p, 'category')"
                  @blur="cancelEdit"
                  @keydown.escape="cancelEdit"
                >
                  <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                </select>
                <button
                  v-else-if="canEdit(p)"
                  type="button"
                  class="cursor-pointer hover:ring-1 hover:ring-primary-300 rounded-full"
                  @click="beginEdit(p, 'category')"
                >
                  <span class="badge-primary text-[10px]">{{ p.category || 'その他' }}</span>
                </button>
                <span v-else class="badge-primary text-[10px]">{{ p.category || 'その他' }}</span>
              </td>
              <!-- オーナー -->
              <td class="py-3 px-4 text-sm text-slate-600">
                <select
                  v-if="editingRowId === p.id && editingField === 'owner'"
                  v-model="draft.ownerUid"
                  v-focus
                  class="input-field input-sm py-1 text-xs"
                  @change="commitField(p, 'owner')"
                  @blur="cancelEdit"
                  @keydown.escape="cancelEdit"
                >
                  <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
                </select>
                <button
                  v-else-if="canEdit(p)"
                  type="button"
                  class="cursor-pointer hover:underline text-left"
                  @click="beginEdit(p, 'owner')"
                >
                  {{ p.ownerName }}
                </button>
                <span v-else>{{ p.ownerName }}</span>
              </td>
              <!-- 価格 -->
              <td class="py-3 px-4 text-right text-sm font-medium">
                <input
                  v-if="editingRowId === p.id && editingField === 'price'"
                  v-model.number="draft.price"
                  v-focus-select
                  type="number"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  class="input-field input-sm py-1 text-right w-24 text-xs"
                  @blur="commitField(p, 'price')"
                  @keydown.enter.prevent="commitField(p, 'price')"
                  @keydown.escape="cancelEdit"
                />
                <button
                  v-else-if="canEdit(p)"
                  type="button"
                  class="cursor-pointer hover:underline"
                  @click="beginEdit(p, 'price')"
                >
                  ¥{{ p.price.toLocaleString() }}
                </button>
                <span v-else>¥{{ p.price.toLocaleString() }}</span>
              </td>
              <td class="py-3 px-4 text-right">
                <span :class="p.stock > 0 ? 'badge-green' : 'badge-red'">{{ p.stock }}</span>
              </td>
              <!-- ステータス -->
              <td class="py-3 px-4 text-center">
                <select
                  v-if="editingRowId === p.id && editingField === 'status'"
                  v-model="draft.status"
                  v-focus
                  class="input-field input-sm py-1 text-xs"
                  @change="commitField(p, 'status')"
                  @blur="cancelEdit"
                  @keydown.escape="cancelEdit"
                >
                  <option value="published">公開</option>
                  <option value="unpublished">非公開</option>
                </select>
                <button
                  v-else-if="canEdit(p)"
                  type="button"
                  class="cursor-pointer"
                  @click="beginEdit(p, 'status')"
                >
                  <span v-if="(p.status || 'published') === 'published'" class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full hover:ring-1 hover:ring-emerald-300">
                    <Eye :size="10" /> 公開
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full hover:ring-1 hover:ring-slate-300">
                    <EyeOff :size="10" /> 非公開
                  </span>
                </button>
                <template v-else>
                  <span v-if="(p.status || 'published') === 'published'" class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <Eye :size="10" /> 公開
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    <EyeOff :size="10" /> 非公開
                  </span>
                </template>
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
import { PlusCircle, Package, Users, Search, Images, Eye, EyeOff, FileSpreadsheet, Pencil } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES, type Product, type ProductStatus } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

const { getGroupProducts, updateProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { currentUser, isPlatformAdmin } = useAuth()
const toast = useToast()

const { currentGroupId } = useCurrentGroup()
const loading = ref(true)
const products = ref<Product[]>([])
const members = ref<any[]>([])
const searchQuery = ref('')
const filterOwner = ref('')
const filterCategory = ref('')
const filterStatus = ref('')

type EditableField = 'category' | 'owner' | 'price' | 'status'

// Desktop click-to-edit state
const editingRowId = ref<string | null>(null)
const editingField = ref<EditableField | null>(null)
const draft = reactive<{ category: string; ownerUid: string; price: number; status: ProductStatus }>({
  category: '',
  ownerUid: '',
  price: 0,
  status: 'published',
})

// Mobile edit panel state
const mobileEditingId = ref<string | null>(null)
const mobileDraft = reactive<{ category: string; ownerUid: string; price: number; status: ProductStatus }>({
  category: '',
  ownerUid: '',
  price: 0,
  status: 'published',
})

const canEdit = (p: Product) => {
  const uid = currentUser.value?.uid
  if (!uid) return false
  return p.ownerUid === uid || isPlatformAdmin.value
}

// Local directives: autofocus an input/select when it mounts; focus+select for number input.
const vFocus = {
  mounted(el: HTMLElement) {
    el.focus()
  },
}
const vFocusSelect = {
  mounted(el: HTMLInputElement) {
    el.focus()
    el.select()
  },
}

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

// --- Desktop click-to-edit handlers ---

const beginEdit = (p: Product, field: EditableField) => {
  if (!canEdit(p)) return
  editingRowId.value = p.id
  editingField.value = field
  draft.category = p.category || 'その他'
  draft.ownerUid = p.ownerUid
  draft.price = p.price
  draft.status = (p.status || 'published') as ProductStatus
}

const cancelEdit = () => {
  editingRowId.value = null
  editingField.value = null
}

const commitField = async (p: Product, field: EditableField) => {
  // Stale guard: if this row is no longer being edited (e.g. Enter already committed
  // and then blur fired), skip.
  if (editingRowId.value !== p.id || editingField.value !== field) return
  if (!canEdit(p)) { cancelEdit(); return }

  let patch: Partial<Product> = {}
  let prevSnapshot: Partial<Product> = {}

  if (field === 'category') {
    // Normalize against the same fallback used in beginEdit so a no-op edit on
    // a legacy doc with `category === undefined` doesn't trigger a write.
    if (draft.category === (p.category || 'その他')) { cancelEdit(); return }
    patch = { category: draft.category }
    prevSnapshot = { category: p.category }
  } else if (field === 'owner') {
    if (draft.ownerUid === p.ownerUid) { cancelEdit(); return }
    const owner = members.value.find((m) => m.uid === draft.ownerUid)
    if (!owner) {
      toast.error('オーナーが見つかりません')
      cancelEdit()
      return
    }
    patch = { ownerUid: owner.uid, ownerName: owner.displayName }
    prevSnapshot = { ownerUid: p.ownerUid, ownerName: p.ownerName }
  } else if (field === 'price') {
    // v-model.number yields NaN on empty input. Treat empty/NaN as a silent cancel
    // (user backspaced and tabbed away — don't punish with a toast).
    const v = Number(draft.price)
    if (!Number.isFinite(v)) { cancelEdit(); return }
    if (v < 0) {
      toast.error('価格は0以上の数値を入力してください')
      cancelEdit()
      return
    }
    if (v === p.price) { cancelEdit(); return }
    patch = { price: v }
    prevSnapshot = { price: p.price }
  } else if (field === 'status') {
    if (draft.status === (p.status || 'published')) { cancelEdit(); return }
    patch = { status: draft.status }
    prevSnapshot = { status: p.status }
  }

  // Optimistic local update so filter/sort react immediately.
  Object.assign(p, patch)
  const rowId = p.id
  cancelEdit()

  try {
    await updateProduct(rowId, patch)
    toast.success('更新しました')
  } catch (e) {
    // Roll back to the pre-edit snapshot and surface the failure.
    Object.assign(p, prevSnapshot)
    console.error('[products.commitField] update failed', { rowId, field, error: e })
    toast.error('更新に失敗しました')
  }
}

// --- Mobile edit panel handlers ---

const toggleMobileEdit = (pid: string) => {
  if (mobileEditingId.value === pid) {
    mobileEditingId.value = null
    return
  }
  const p = products.value.find((x) => x.id === pid)
  if (!p || !canEdit(p)) return
  mobileDraft.category = p.category || 'その他'
  mobileDraft.ownerUid = p.ownerUid
  mobileDraft.price = p.price
  mobileDraft.status = (p.status || 'published') as ProductStatus
  mobileEditingId.value = pid
}

const cancelMobileEdit = () => {
  mobileEditingId.value = null
}

const saveMobileEdit = async (p: Product) => {
  // Stale guard: ignore if the panel for this row is no longer open (defense in depth).
  if (mobileEditingId.value !== p.id) return
  if (!canEdit(p)) { cancelMobileEdit(); return }

  const v = Number(mobileDraft.price)
  if (!Number.isFinite(v) || v < 0) {
    toast.error('価格は0以上の数値を入力してください')
    return
  }
  const owner = members.value.find((m) => m.uid === mobileDraft.ownerUid)
  if (!owner) {
    toast.error('オーナーが見つかりません')
    return
  }

  // Build patch from CHANGED fields only — avoid pointless writes / updatedAt churn.
  // Equality checks use the same fallbacks as toggleMobileEdit's draft seeding so
  // legacy docs with undefined category/status don't generate spurious writes.
  const patch: Partial<Product> = {}
  const prev: Partial<Product> = {}
  if (mobileDraft.category !== (p.category || 'その他')) {
    patch.category = mobileDraft.category
    prev.category = p.category
  }
  if (owner.uid !== p.ownerUid) {
    patch.ownerUid = owner.uid
    patch.ownerName = owner.displayName
    prev.ownerUid = p.ownerUid
    prev.ownerName = p.ownerName
  }
  if (v !== p.price) {
    patch.price = v
    prev.price = p.price
  }
  if (mobileDraft.status !== (p.status || 'published')) {
    patch.status = mobileDraft.status
    prev.status = p.status
  }

  if (Object.keys(patch).length === 0) {
    mobileEditingId.value = null
    return
  }

  Object.assign(p, patch)
  mobileEditingId.value = null

  try {
    await updateProduct(p.id, patch)
    toast.success('更新しました')
  } catch (e) {
    Object.assign(p, prev)
    console.error('[products.saveMobileEdit] update failed', { id: p.id, error: e })
    toast.error('更新に失敗しました')
  }
}

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
