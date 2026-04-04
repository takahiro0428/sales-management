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
      <!-- AI Auto Mode Toggle -->
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            :aria-checked="aiAutoMode"
            @click="aiAutoMode = !aiAutoMode"
            class="relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
            :class="aiAutoMode ? 'bg-primary-500' : 'bg-slate-200'"
          >
            <span class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform" :class="aiAutoMode ? 'translate-x-4' : ''" />
          </button>
          <span class="text-sm font-medium text-slate-600">AI自動入力モード</span>
        </label>
        <Sparkles v-if="aiAutoMode" :size="16" class="text-primary-500" />
      </div>
      <p v-if="aiAutoMode" class="text-xs text-slate-400 -mt-3">写真から商品名・説明・カテゴリ・タグを自動入力します</p>

      <!-- Image Upload -->
      <div>
        <label class="label-text">商品画像</label>
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
          :class="aiAutoMode ? 'border-primary-300 hover:border-primary-400 bg-primary-50/30' : 'border-slate-200 hover:border-primary-300'"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <div v-if="aiSuggesting" class="text-primary-500">
            <LoadingSpinner size="lg" class="mx-auto mb-2" />
            <p class="text-sm">AI分析中...</p>
          </div>
          <img v-else-if="imagePreview" :src="imagePreview" class="mx-auto max-h-48 rounded-lg mb-2" />
          <div v-else class="text-slate-400">
            <Camera :size="36" class="mx-auto mb-2" :stroke-width="1.5" />
            <p class="text-sm text-slate-500">{{ aiAutoMode ? '写真を追加するとAIが自動入力します' : 'クリックまたはドラッグで画像を追加' }}</p>
          </div>
        </div>
        <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileSelect" />
        <input ref="galleryInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
        <button v-if="imagePreview && !aiSuggesting" type="button" @click="clearImage" class="text-sm text-red-500 mt-2">画像を削除</button>
      </div>

      <!-- Image Source Action Sheet -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showImagePicker" class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" @click.self="showImagePicker = false">
            <Transition name="slide-up">
              <div v-if="showImagePicker" class="bg-white w-full sm:w-80 sm:rounded-xl rounded-t-xl overflow-hidden safe-bottom">
                <div class="px-4 pt-4 pb-2 text-center text-sm font-medium text-slate-500">画像を追加</div>
                <button type="button" @click="selectCamera" class="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100">
                  <Camera :size="20" class="text-primary-500" />
                  <span class="text-sm font-medium text-slate-700">カメラで撮影</span>
                </button>
                <button type="button" @click="selectGallery" class="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100">
                  <ImageIcon :size="20" class="text-primary-500" />
                  <span class="text-sm font-medium text-slate-700">ライブラリから選択</span>
                </button>
                <div class="border-t border-slate-100">
                  <button type="button" @click="showImagePicker = false" class="w-full px-4 py-3 text-center text-sm font-medium text-slate-400 hover:bg-slate-50 active:bg-slate-100">
                    キャンセル
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>

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
import { ArrowLeft, Camera, Users, Sparkles, X, Image as ImageIcon } from 'lucide-vue-next'
import { PRODUCT_CATEGORIES } from '~/composables/useProducts'

definePageMeta({ middleware: 'auth' })

const { userProfile } = useAuth()
const { createProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { suggestCategoryAndTags, suggestFromImage } = useAiSuggestion()
const toast = useToast()

const { currentGroupId } = useCurrentGroup()
const members = ref<any[]>([])
const submitting = ref(false)
const aiSuggesting = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const cameraInput = ref<HTMLInputElement>()
const galleryInput = ref<HTMLInputElement>()
const showImagePicker = ref(false)
const tagInput = ref('')
const aiAutoMode = ref(false)
let aiAutoFillGeneration = 0

const triggerFileInput = () => {
  showImagePicker.value = true
}

const selectCamera = () => {
  showImagePicker.value = false
  nextTick(() => cameraInput.value?.click())
}

const selectGallery = () => {
  showImagePicker.value = false
  nextTick(() => galleryInput.value?.click())
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
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && file.type.startsWith('image/')) setImage(file)
  input.value = ''
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) setImage(file)
}

const setImage = (file: File) => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  if (aiAutoMode.value) {
    handleAiAutoFill(file)
  }
}

const handleAiAutoFill = async (file: File) => {
  const generation = ++aiAutoFillGeneration
  aiSuggesting.value = true
  try {
    const result = await suggestFromImage(file)
    if (generation !== aiAutoFillGeneration) return // stale result
    if (result.name) {
      form.name = result.name
      form.description = result.description
      form.category = result.category
      form.tags = result.tags
      toast.success('AIが商品情報を入力しました')
    } else {
      toast.warning('AIが商品情報を判定できませんでした。手動で入力してください')
    }
  } catch {
    if (generation === aiAutoFillGeneration) {
      toast.error('AI自動入力に失敗しました')
    }
  } finally {
    if (generation === aiAutoFillGeneration) {
      aiSuggesting.value = false
    }
  }
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
      [...form.tags],
    )
    toast.success('商品を登録しました')
    form.name = ''
    form.description = ''
    form.price = 0
    form.ownerUid = userProfile.value?.uid || ''
    form.stock = 0
    form.category = 'その他'
    form.tags = []
    tagInput.value = ''
    clearImage()
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-up-enter-active {
  transition: transform 0.25s ease-out;
}
.slide-up-leave-active {
  transition: transform 0.2s ease-in;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
