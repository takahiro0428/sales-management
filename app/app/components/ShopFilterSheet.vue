<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="絞り込み"
    >
      <div class="absolute inset-0 bg-black/40" @click="close" />
      <div
        class="relative bg-white w-full md:max-w-md md:h-full max-h-[90vh] md:max-h-none rounded-t-3xl md:rounded-none shadow-2xl overflow-hidden flex flex-col animate-slide-up md:animate-slide-right"
      >
        <!-- Header -->
        <header class="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 class="text-lg font-bold text-slate-800">絞り込み</h2>
          <button
            type="button"
            @click="close"
            class="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
            aria-label="閉じる"
          >
            <X :size="20" />
          </button>
        </header>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <!-- Sort -->
          <section>
            <h3 class="label-text">並び順</h3>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                type="button"
                @click="draft.sort = opt.value"
                class="py-2 px-3 rounded-xl text-sm font-medium border transition-colors"
                :class="draft.sort === opt.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200'"
              >
                {{ opt.label }}
              </button>
            </div>
          </section>

          <!-- Category -->
          <section v-if="availableCategories.length > 0">
            <h3 class="label-text">カテゴリー</h3>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="draft.category = ''"
                class="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                :class="draft.category === '' ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-200'"
              >
                すべて
              </button>
              <button
                v-for="cat in availableCategories"
                :key="cat"
                type="button"
                @click="draft.category = cat"
                class="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                :class="draft.category === cat ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-200'"
              >
                {{ cat }}
              </button>
            </div>
          </section>

          <!-- Tags -->
          <section v-if="sortedTags.length > 0">
            <div class="flex items-center justify-between mb-1.5">
              <h3 class="label-text !mb-0">タグ</h3>
              <span v-if="draft.tags.length > 0" class="text-xs text-slate-400">{{ draft.tags.length }} 選択中</span>
            </div>
            <div class="relative mb-2">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="tagQuery"
                type="text"
                class="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white"
                placeholder="タグを検索..."
              />
            </div>

            <div
              class="flex flex-wrap gap-1.5"
              :class="tagsExpanded ? 'max-h-64 overflow-y-auto' : ''"
            >
              <button
                v-for="tag in visibleTags"
                :key="tag"
                type="button"
                @click="toggleTag(tag)"
                class="px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                :class="draft.tags.includes(tag) ? 'bg-sub1-100 text-sub1-500 border border-sub1-300' : 'bg-slate-50 text-slate-600 border border-slate-100 hover:border-sub1-200'"
              >
                #{{ tag }}
              </button>
              <span v-if="visibleTags.length === 0" class="text-xs text-slate-400 py-2">該当するタグがありません</span>
            </div>

            <button
              v-if="!tagsExpanded && hiddenTagCount > 0"
              type="button"
              @click="tagsExpanded = true"
              class="mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium inline-flex items-center gap-1"
            >
              もっと見る (+{{ hiddenTagCount }})
              <ChevronDown :size="14" />
            </button>
            <button
              v-if="tagsExpanded && sortedTags.length > TAGS_COLLAPSED_LIMIT"
              type="button"
              @click="tagsExpanded = false"
              class="mt-3 text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1"
            >
              折りたたむ
              <ChevronUp :size="14" />
            </button>
          </section>

          <!-- Price range -->
          <section>
            <h3 class="label-text">価格帯</h3>
            <div class="flex items-center gap-2">
              <input
                :value="draft.minPrice ?? ''"
                type="number"
                min="0"
                class="input-field flex-1 !py-2"
                placeholder="最低"
                @input="onPriceInput($event, 'min')"
              />
              <span class="text-slate-400">〜</span>
              <input
                :value="draft.maxPrice ?? ''"
                type="number"
                min="0"
                class="input-field flex-1 !py-2"
                placeholder="最高"
                @input="onPriceInput($event, 'max')"
              />
              <span class="text-sm text-slate-400">円</span>
            </div>
            <p
              v-if="draft.minPrice != null && draft.maxPrice != null && draft.minPrice > draft.maxPrice"
              class="text-xs text-red-500 mt-1"
            >
              最低価格が最高価格を上回っています
            </p>
          </section>

          <!-- Favorites only -->
          <section>
            <label class="flex items-center justify-between py-1 cursor-pointer">
              <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Heart :size="16" class="text-red-400" :fill="draft.favoritesOnly ? 'currentColor' : 'none'" />
                お気に入りのみ表示
              </span>
              <span
                class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
                :class="draft.favoritesOnly ? 'bg-primary-500' : 'bg-slate-200'"
              >
                <input v-model="draft.favoritesOnly" type="checkbox" class="peer sr-only" />
                <span
                  class="inline-block h-5 w-5 transform bg-white rounded-full shadow transition-transform translate-x-0.5 translate-y-0.5"
                  :class="draft.favoritesOnly ? 'translate-x-[22px]' : ''"
                />
              </span>
            </label>
          </section>
        </div>

        <!-- Footer -->
        <footer class="flex items-center gap-3 px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
          <button
            type="button"
            @click="handleReset"
            class="btn-secondary flex-1"
          >
            リセット
          </button>
          <button
            type="button"
            @click="handleApply"
            class="btn-primary flex-1"
          >
            適用 ({{ resultCount }}件)
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X, Search, ChevronDown, ChevronUp, Heart } from 'lucide-vue-next'

export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'stock'

export interface ShopFilters {
  category: string
  tags: string[]
  minPrice: number | null
  maxPrice: number | null
  sort: SortKey
  favoritesOnly: boolean
}

const props = defineProps<{
  modelValue: boolean
  filters: ShopFilters
  availableCategories: string[]
  sortedTags: string[]     // pre-sorted by frequency desc
  resultCount: number       // live preview of applied-draft count
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'apply', filters: ShopFilters): void
  (e: 'draft-change', filters: ShopFilters): void
  (e: 'reset'): void
}>()

const TAGS_COLLAPSED_LIMIT = 12

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'newest', label: '新着' },
  { value: 'price_asc', label: '価格安い順' },
  { value: 'price_desc', label: '価格高い順' },
  { value: 'stock', label: '在庫あり優先' },
]

const emptyFilters = (): ShopFilters => ({
  category: '',
  tags: [],
  minPrice: null,
  maxPrice: null,
  sort: 'newest',
  favoritesOnly: false,
})

const draft = reactive<ShopFilters>({ ...emptyFilters(), ...props.filters })
const tagQuery = ref('')
const tagsExpanded = ref(false)

// When the sheet opens, re-sync draft from incoming filters
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.assign(draft, emptyFilters(), props.filters)
      tagQuery.value = ''
      tagsExpanded.value = false
    }
  },
)

// Emit live draft changes so parent can show result count preview
watch(
  draft,
  (val) => {
    emit('draft-change', { ...val, tags: [...val.tags] })
  },
  { deep: true },
)

const filteredTagPool = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  if (!q) return props.sortedTags
  return props.sortedTags.filter((t) => t.toLowerCase().includes(q))
})

// Selected tags always come first (pinned) REGARDLESS of the tag search
// query, so users can always see and un-select what they've picked even if
// their current search text would otherwise hide the selected chip.
const orderedTags = computed(() => {
  const selected = [...draft.tags]
  const rest = filteredTagPool.value.filter((t) => !draft.tags.includes(t))
  return [...selected, ...rest]
})

const visibleTags = computed(() => {
  if (tagsExpanded.value) return orderedTags.value
  return orderedTags.value.slice(0, TAGS_COLLAPSED_LIMIT)
})

const hiddenTagCount = computed(() =>
  Math.max(0, orderedTags.value.length - TAGS_COLLAPSED_LIMIT),
)

const toggleTag = (tag: string) => {
  const i = draft.tags.indexOf(tag)
  if (i >= 0) draft.tags.splice(i, 1)
  else draft.tags.push(tag)
}

// Price input handler. Empty string → null (so optional filter is dropped);
// negative values are clamped to 0.
const onPriceInput = (e: Event, which: 'min' | 'max') => {
  const raw = (e.target as HTMLInputElement).value
  let val: number | null
  if (raw === '') {
    val = null
  } else {
    const n = Number(raw)
    val = Number.isFinite(n) ? Math.max(0, n) : null
  }
  if (which === 'min') draft.minPrice = val
  else draft.maxPrice = val
}

const close = () => emit('update:modelValue', false)

// Escape key closes the sheet (keyboard a11y)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) close()
}
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleApply = () => {
  emit('apply', { ...draft, tags: [...draft.tags] })
  close()
}

const handleReset = () => {
  Object.assign(draft, emptyFilters())
  emit('reset')
}
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@media (min-width: 768px) {
  .animate-slide-up,
  .animate-slide-right {
    animation: slideRight 0.25s ease-out;
  }
}
@keyframes slideRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
