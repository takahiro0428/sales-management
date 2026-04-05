<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title">商品を一括登録</h2>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <div v-else class="max-w-lg space-y-5">
      <!-- Owner Selection -->
      <div class="card">
        <label class="label-text">所有者 <span class="text-red-400">*</span></label>
        <select v-model="ownerUid" class="input-field" required>
          <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
        </select>
      </div>

      <!-- Image Upload Area -->
      <div class="card">
        <label class="label-text">商品画像（複数選択可）</label>
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-primary-300 hover:border-primary-400 bg-primary-50/30"
          @click="fileInput?.click()"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <div class="text-slate-400">
            <ImagePlus :size="36" class="mx-auto mb-2" :stroke-width="1.5" />
            <p class="text-sm text-slate-500">クリックまたはドラッグで画像を追加</p>
            <p class="text-xs text-slate-400 mt-1">写真ごとにAIが商品情報を自動入力します</p>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />
      </div>

      <!-- Queued Items -->
      <div v-if="items.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="section-title">登録予定（{{ items.length }}件）</h3>
          <span v-if="processingCount > 0" class="text-xs text-primary-500 flex items-center gap-1">
            <LoadingSpinner size="sm" />
            AI分析中... {{ processingCount }}件
          </span>
        </div>

        <div v-for="(item, idx) in items" :key="item.id" class="card">
          <div class="flex gap-3">
            <div class="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0">
              <img :src="item.previewUrl" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <div v-if="item.aiStatus === 'analyzing'" class="flex items-center gap-2 text-primary-500">
                <LoadingSpinner size="sm" />
                <span class="text-sm">AI分析中...</span>
              </div>
              <div v-else-if="item.aiStatus === 'error'" class="mb-1">
                <p class="text-xs text-amber-600 mb-1">AI分析失敗 — 手動で入力してください</p>
                <input v-model="item.name" type="text" class="input-field text-sm mb-1" placeholder="商品名" />
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                    <input v-model.number="item.price" type="number" min="0" class="input-field text-sm pl-6" placeholder="価格" />
                  </div>
                  <select v-model="item.category" class="input-field text-sm flex-1">
                    <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>
              </div>
              <template v-else>
                <input v-model="item.name" type="text" class="input-field text-sm mb-1" placeholder="商品名" />
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                    <input v-model.number="item.price" type="number" min="0" class="input-field text-sm pl-6" placeholder="価格" />
                  </div>
                  <select v-model="item.category" class="input-field text-sm flex-1">
                    <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>
              </template>
            </div>
            <button @click="removeItem(idx)" class="text-slate-300 hover:text-red-500 shrink-0 self-start">
              <X :size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <button
        v-if="readyItems.length > 0"
        @click="handleBulkSubmit"
        class="btn-primary w-full"
        :disabled="submitting || processingCount > 0"
      >
        <LoadingSpinner v-if="submitting" size="sm" />
        {{ submitting ? `登録中... (${submittedCount}/${readyItems.length})` : `${readyItems.length}件の商品を登録` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Users, ImagePlus, X } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

interface BulkItem {
  id: number
  file: File
  previewUrl: string
  name: string
  description: string
  price: number
  category: string
  tags: string[]
  aiStatus: 'analyzing' | 'ready' | 'error'
}

let nextItemId = 0
const AI_CONCURRENCY = 3

const { userProfile } = useAuth()
const { createProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { suggestFromImage } = useAiSuggestion()
const toast = useToast()
const { currentGroupId } = useCurrentGroup()

const members = ref<any[]>([])
const ownerUid = ref('')
const items = ref<BulkItem[]>([])
const fileInput = ref<HTMLInputElement>()
const submitting = ref(false)
const submittedCount = ref(0)

const processingCount = computed(() => items.value.filter((i) => i.aiStatus === 'analyzing').length)
const readyItems = computed(() => items.value.filter((i) => i.aiStatus !== 'analyzing' && i.name.trim()))

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files) addFiles(Array.from(files))
  input.value = ''
}

const handleDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files
  if (files) addFiles(Array.from(files).filter((f) => f.type.startsWith('image/')))
}

// Queue for AI analysis with concurrency control (store IDs to avoid reactivity bypass)
const analysisQueue: number[] = []
let activeAnalyses = 0

const processQueue = async () => {
  while (analysisQueue.length > 0 && activeAnalyses < AI_CONCURRENCY) {
    const itemId = analysisQueue.shift()!
    activeAnalyses++
    analyzeItem(itemId).finally(() => {
      activeAnalyses--
      processQueue()
    })
  }
}

const addFiles = (files: File[]) => {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const id = nextItemId++
    items.value.push({
      id,
      file,
      previewUrl: URL.createObjectURL(file),
      name: '',
      description: '',
      price: 0,
      category: 'その他',
      tags: [],
      aiStatus: 'analyzing',
    })
    analysisQueue.push(id)
  }
  processQueue()
}

const analyzeItem = async (itemId: number) => {
  const item = items.value.find((i) => i.id === itemId)
  if (!item) return
  try {
    const result = await suggestFromImage(item.file)
    if (result.name) {
      item.name = result.name
      item.description = result.description
      if (result.price > 0) item.price = result.price
      item.category = result.category
      item.tags = result.tags
    }
    item.aiStatus = 'ready'
  } catch {
    item.aiStatus = 'error'
  }
}

const removeItem = (idx: number) => {
  const item = items.value[idx]
  URL.revokeObjectURL(item.previewUrl)
  // Remove from analysis queue if still pending
  const queueIdx = analysisQueue.indexOf(item.id)
  if (queueIdx !== -1) analysisQueue.splice(queueIdx, 1)
  items.value.splice(idx, 1)
}

const handleBulkSubmit = async () => {
  if (!currentGroupId.value || !ownerUid.value) {
    toast.error('所有者を選択してください')
    return
  }
  const owner = members.value.find((m) => m.uid === ownerUid.value)
  if (!owner) { toast.error('所有者が見つかりません'); return }

  const toRegister = [...readyItems.value]
  submitting.value = true
  submittedCount.value = 0
  let successCount = 0
  let failCount = 0
  const registeredIds = new Set<number>()

  for (const item of toRegister) {
    try {
      await createProduct(
        currentGroupId.value,
        item.name,
        item.price,
        ownerUid.value,
        owner.displayName,
        1,
        item.file,
        item.description,
        item.category,
        [...item.tags],
        'published',
      )
      successCount++
      registeredIds.add(item.id)
    } catch {
      failCount++
    }
    submittedCount.value++
  }

  // Remove successfully registered items (filter instead of splice to avoid index issues)
  const toCleanup = items.value.filter((i) => registeredIds.has(i.id))
  for (const item of toCleanup) URL.revokeObjectURL(item.previewUrl)
  items.value = items.value.filter((i) => !registeredIds.has(i.id))

  submitting.value = false

  if (failCount === 0) {
    toast.success(`${successCount}件の商品を登録しました`)
  } else {
    toast.warning(`${successCount}件登録、${failCount}件失敗しました`)
  }
}

onMounted(async () => {
  if (!currentGroupId.value) return
  members.value = (await getGroupMembers(currentGroupId.value)).filter((m) => m.status === 'active')
  ownerUid.value = userProfile.value?.uid || ''
})

onBeforeUnmount(() => {
  for (const item of items.value) {
    URL.revokeObjectURL(item.previewUrl)
  }
})
</script>
