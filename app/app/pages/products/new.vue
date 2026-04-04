<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title">商品を登録</h2>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="card space-y-5 max-w-lg">
      <!-- Image Upload -->
      <div>
        <label class="label-text">商品画像</label>
        <div
          class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-300 transition-colors"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <img v-if="imagePreview" :src="imagePreview" class="mx-auto max-h-48 rounded-lg mb-2" />
          <div v-else class="text-slate-400">
            <Camera :size="36" class="mx-auto mb-2" :stroke-width="1.5" />
            <p class="text-sm text-slate-500">クリックまたはドラッグで画像を追加</p>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
        <button v-if="imagePreview" type="button" @click="clearImage" class="text-sm text-red-500 mt-2">画像を削除</button>
      </div>

      <div>
        <label class="label-text">商品名 <span class="text-red-400">*</span></label>
        <input v-model="form.name" type="text" class="input-field" placeholder="例：手作りアクセサリー" required />
      </div>

      <div>
        <label class="label-text">説明</label>
        <textarea v-model="form.description" class="input-field" rows="3" placeholder="商品の詳しい説明..." />
      </div>

      <div>
        <label class="label-text">価格 <span class="text-red-400">*</span></label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
          <input v-model.number="form.price" type="number" min="0" class="input-field pl-8" placeholder="0" required />
        </div>
      </div>

      <div>
        <label class="label-text">所有者 <span class="text-red-400">*</span></label>
        <select v-model="form.ownerUid" class="input-field" required>
          <option v-for="m in members" :key="m.uid" :value="m.uid">{{ m.displayName }}</option>
        </select>
      </div>

      <div>
        <label class="label-text">初期在庫数</label>
        <input v-model.number="form.stock" type="number" min="0" class="input-field" placeholder="0" />
      </div>

      <!-- Category & Tags -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-medium text-slate-600">カテゴリ</label>
          <button
            type="button"
            @click="handleAiSuggest"
            class="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-50"
            :disabled="aiSuggesting || !form.name"
          >
            <Sparkles :size="14" />
            {{ aiSuggesting ? 'AI分析中...' : 'AIで自動生成' }}
          </button>
        </div>
        <select v-model="form.category" class="input-field">
          <option v-for="cat in PRODUCT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div>
        <label class="label-text">タグ</label>
        <div v-if="form.tags.length > 0" class="flex flex-wrap gap-1.5 mb-2">
          <span
            v-for="(tag, i) in form.tags"
            :key="i"
            class="badge-sub1 flex items-center gap-1"
          >
            {{ tag }}
            <button type="button" @click="removeTag(i)" class="hover:text-red-500">
              <X :size="12" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="tagInput"
            type="text"
            class="input-field"
            placeholder="タグを入力してEnter"
            @keydown.enter.prevent="addTag"
          />
          <button type="button" @click="addTag" class="btn-secondary btn-sm shrink-0">追加</button>
        </div>
      </div>

      <button type="submit" class="btn-primary w-full" :disabled="submitting">
        <LoadingSpinner v-if="submitting" size="sm" />
        {{ submitting ? '登録中...' : '商品を登録' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Camera, Users, Sparkles, X } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

const { userProfile } = useAuth()
const { createProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { suggestCategoryAndTags } = useAiSuggestion()
const toast = useToast()

const { currentGroupId } = useCurrentGroup()
const members = ref<any[]>([])
const submitting = ref(false)
const aiSuggesting = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
const tagInput = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const form = reactive({
  name: '',
  description: '',
  price: 0,
  ownerUid: '',
  stock: 0,
  category: 'その他',
  tags: [] as string[],
})

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setImage(file)
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) setImage(file)
}

const setImage = (file: File) => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

const clearImage = () => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = null
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

const removeTag = (index: number) => {
  form.tags.splice(index, 1)
}

const handleAiSuggest = async () => {
  if (!form.name) return
  aiSuggesting.value = true
  try {
    const result = await suggestCategoryAndTags(form.name, form.description)
    form.category = result.category
    form.tags = result.tags
    toast.success('AIがカテゴリとタグを提案しました')
  } catch {
    toast.error('AI提案に失敗しました')
  } finally {
    aiSuggesting.value = false
  }
}

const handleSubmit = async () => {
  if (!currentGroupId.value) return
  const owner = members.value.find((m) => m.uid === form.ownerUid)
  if (!owner) { toast.error('所有者を選択してください'); return }

  submitting.value = true
  try {
    await createProduct(
      currentGroupId.value,
      form.name,
      form.price,
      form.ownerUid,
      owner.displayName,
      form.stock,
      imageFile.value,
      form.description,
      form.category,
      form.tags,
    )
    toast.success('商品を登録しました')
    navigateTo('/products')
  } catch (e) {
    toast.error('商品の登録に失敗しました')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!currentGroupId.value) return
  members.value = (await getGroupMembers(currentGroupId.value)).filter((m) => m.status === 'active')
  form.ownerUid = userProfile.value?.uid || ''
})

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
})
</script>
