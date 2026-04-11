<template>
  <div class="card">
    <h3 class="section-title mb-1">ショップトップページ設定</h3>
    <p class="text-xs text-slate-500 mb-5">
      お客様が最初に目にするヒーロー画像・見出し・キャプションを設定できます。
    </p>

    <!-- Hero preview / uploader -->
    <div class="mb-5">
      <label class="label-text">ヒーロー画像</label>
      <div
        class="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-primary-100 to-sub1-100 flex items-center justify-center"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="ヒーロー画像プレビュー"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div v-else class="text-slate-400 flex flex-col items-center gap-2">
          <ImageIcon :size="36" :stroke-width="1.5" />
          <span class="text-xs">画像が未設定です</span>
        </div>

        <!-- Overlay controls -->
        <div class="absolute top-2 right-2 flex gap-2">
          <button
            v-if="previewUrl"
            type="button"
            @click="handleClearImage"
            :disabled="saving"
            class="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm text-slate-600 hover:text-red-500 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="画像を削除"
          >
            <Trash2 :size="16" />
          </button>
          <label
            class="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm text-slate-600 hover:text-primary-500 flex items-center justify-center shadow-sm"
            :class="saving ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'"
            aria-label="画像を選択"
          >
            <Upload :size="16" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              :disabled="saving"
              @change="handleFileChange"
            />
          </label>
        </div>
      </div>
      <p class="text-xs text-slate-400 mt-2">
        推奨: 横長（16:9 ～ 21:9）、10MB 以下。アップロード時に自動で縮小されます。
      </p>
    </div>

    <!-- Title -->
    <div class="mb-4">
      <label class="label-text">見出し</label>
      <input
        v-model="form.heroTitle"
        type="text"
        maxlength="40"
        class="input-field"
        :placeholder="groupName || 'ショップ名を入力'"
      />
      <p class="text-xs text-slate-400 mt-1">未入力の場合はグループ名が表示されます（最大 40 文字）</p>
    </div>

    <!-- Caption -->
    <div class="mb-5">
      <label class="label-text">キャプション</label>
      <textarea
        v-model="form.heroCaption"
        rows="2"
        maxlength="120"
        class="input-field resize-none"
        placeholder="例: 毎週金曜更新・手作りアクセサリーの専門ショップ"
      />
      <p class="text-xs text-slate-400 mt-1">120 文字まで。未入力の場合はグループ説明が表示されます。</p>
    </div>

    <div class="flex gap-3">
      <button
        type="button"
        @click="handleReset"
        class="btn-secondary flex-1"
        :disabled="saving || !isDirty"
      >
        変更を取消
      </button>
      <button
        type="button"
        @click="handleSave"
        class="btn-primary flex-1"
        :disabled="saving || !isDirty"
      >
        <Save :size="16" />
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Image as ImageIcon, Upload, Trash2, Save } from 'lucide-vue-next'
import type { Group } from '~/composables/useGroups'

const props = defineProps<{
  groupId: string
  group: Group
}>()

const emit = defineEmits<{
  (e: 'updated', patch: { heroImageUrl?: string | null; heroTitle?: string; heroCaption?: string }): void
}>()

const { uploadGroupHeroImage, updateGroupShopSettings, deleteGroupHeroImage } = useGroups()
const toast = useToast()

const groupName = computed(() => props.group?.name || '')

// Form state
interface InitialState {
  heroImageUrl: string | null
  heroTitle: string
  heroCaption: string
}
const initial = reactive<InitialState>({
  heroImageUrl: props.group?.heroImageUrl ?? null,
  heroTitle: props.group?.heroTitle ?? '',
  heroCaption: props.group?.heroCaption ?? '',
})
const form = reactive({
  heroTitle: initial.heroTitle,
  heroCaption: initial.heroCaption,
})

// Pending local image (selected but not yet saved)
const pendingFile = ref<File | null>(null)
const pendingObjectUrl = ref<string | null>(null)
// Pending delete flag (user clicked trash)
const pendingDelete = ref(false)

const saving = ref(false)

// What the user currently sees as the hero preview
const previewUrl = computed(() => {
  if (pendingObjectUrl.value) return pendingObjectUrl.value
  if (pendingDelete.value) return null
  return initial.heroImageUrl || null
})

const isDirty = computed(() => {
  if (pendingFile.value) return true
  if (pendingDelete.value) return true
  if ((form.heroTitle || '') !== (initial.heroTitle || '')) return true
  if ((form.heroCaption || '') !== (initial.heroCaption || '')) return true
  return false
})

// Keep form in sync if parent updates the group doc
watch(
  () => props.group,
  (g) => {
    if (!g) return
    initial.heroImageUrl = g.heroImageUrl ?? null
    initial.heroTitle = g.heroTitle ?? ''
    initial.heroCaption = g.heroCaption ?? ''
    // Reset dirty state
    form.heroTitle = initial.heroTitle
    form.heroCaption = initial.heroCaption
    clearPendingFile()
    pendingDelete.value = false
  },
)

const clearPendingFile = () => {
  if (pendingObjectUrl.value) {
    URL.revokeObjectURL(pendingObjectUrl.value)
  }
  pendingFile.value = null
  pendingObjectUrl.value = null
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error('JPEG / PNG / WebP 形式の画像を選択してください')
    input.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('ファイルサイズは 10MB 以下にしてください')
    input.value = ''
    return
  }
  clearPendingFile()
  pendingFile.value = file
  pendingObjectUrl.value = URL.createObjectURL(file)
  pendingDelete.value = false
  // Clear the input so selecting the same file again still fires change
  input.value = ''
}

const handleClearImage = () => {
  if (pendingFile.value) {
    // User had staged a new image; just drop it
    clearPendingFile()
    return
  }
  // Mark the existing image for deletion on save
  pendingDelete.value = true
}

const handleReset = () => {
  form.heroTitle = initial.heroTitle
  form.heroCaption = initial.heroCaption
  clearPendingFile()
  pendingDelete.value = false
}

const handleSave = async () => {
  if (!isDirty.value || saving.value) return
  saving.value = true

  // Track a newly-uploaded image separately so we can roll it back from
  // Storage if the subsequent Firestore write fails.
  let newlyUploadedUrl: string | null = null
  try {
    const patch: { heroImageUrl?: string | null; heroTitle?: string; heroCaption?: string } = {}

    // 1) Upload new image if staged
    if (pendingFile.value) {
      newlyUploadedUrl = await uploadGroupHeroImage(props.groupId, pendingFile.value)
      patch.heroImageUrl = newlyUploadedUrl
    } else if (pendingDelete.value) {
      patch.heroImageUrl = null
    }

    // 2) Text fields
    if ((form.heroTitle || '') !== (initial.heroTitle || '')) {
      patch.heroTitle = form.heroTitle.trim()
    }
    if ((form.heroCaption || '') !== (initial.heroCaption || '')) {
      patch.heroCaption = form.heroCaption.trim()
    }

    try {
      await updateGroupShopSettings(props.groupId, patch)
    } catch (persistErr) {
      // Firestore write failed after a successful upload: roll back the
      // orphan object from Storage so SoT and Storage stay in sync.
      if (newlyUploadedUrl) {
        void deleteGroupHeroImage(newlyUploadedUrl)
      }
      throw persistErr
    }

    // 3) Best-effort cleanup of the PREVIOUS image from Storage (non-blocking)
    if ((pendingFile.value || pendingDelete.value) && initial.heroImageUrl) {
      void deleteGroupHeroImage(initial.heroImageUrl)
    }

    // Emit so parent can update its local group doc ref
    emit('updated', patch)

    // Update initial snapshot to match saved state
    if ('heroImageUrl' in patch) initial.heroImageUrl = patch.heroImageUrl ?? null
    if ('heroTitle' in patch) initial.heroTitle = patch.heroTitle ?? ''
    if ('heroCaption' in patch) initial.heroCaption = patch.heroCaption ?? ''
    clearPendingFile()
    pendingDelete.value = false

    toast.success('ショップ設定を保存しました')
  } catch (e) {
    console.error('[ShopHeroSettingsForm] save failed:', e)
    toast.error('ショップ設定の保存に失敗しました')
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  clearPendingFile()
})
</script>
