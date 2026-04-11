<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <h2 class="page-title">Excelで商品を一括インポート</h2>
    </div>

    <div v-if="!currentGroupId">
      <EmptyState :icon="Users" title="グループを選択してください" description="ホーム画面でグループを選択してください">
        <template #action><NuxtLink to="/" class="btn-primary btn-sm">ホームへ</NuxtLink></template>
      </EmptyState>
    </div>

    <div v-else class="max-w-5xl space-y-5">
      <!-- 手順 / テンプレート -->
      <div class="card">
        <h3 class="section-title mb-2">使い方</h3>
        <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside mb-3">
          <li>テンプレートをダウンロードして商品情報を入力します</li>
          <li>「所有者」列にはグループメンバーの表示名を入力してください</li>
          <li>ファイルをアップロードして内容を確認します</li>
          <li>有効な行のみを登録します（無効な行はスキップされます）</li>
        </ol>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-secondary btn-sm"
            :disabled="downloadingTemplate"
            @click="handleDownloadTemplate"
          >
            <LoadingSpinner v-if="downloadingTemplate" size="sm" />
            <Download v-else :size="16" />
            テンプレートをダウンロード
          </button>
          <span v-if="members.length > 0" class="text-xs text-slate-500">
            所有者に指定可能: {{ members.map((m) => m.displayName).join('、') }}
          </span>
        </div>
      </div>

      <!-- アップロード -->
      <div class="card">
        <label class="label-text">Excelファイル（.xlsx / .xls / .csv）</label>
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
          :class="
            membersLoading
              ? 'border-slate-200 cursor-not-allowed opacity-60'
              : 'border-primary-300 hover:border-primary-400 bg-primary-50/30 cursor-pointer'
          "
          @click="!membersLoading && fileInput?.click()"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <div class="text-slate-400">
            <FileSpreadsheet :size="36" class="mx-auto mb-2" :stroke-width="1.5" />
            <p class="text-sm text-slate-500">クリックまたはドラッグでファイルを選択</p>
            <p class="text-xs text-slate-400 mt-1">ヘッダー行 + データ行のExcelまたはCSV</p>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="handleFileSelect"
        />
        <div v-if="parsing" class="mt-3 flex items-center gap-2 text-primary-500 text-sm">
          <LoadingSpinner size="sm" />
          解析中...
        </div>
        <div v-else-if="fileName" class="mt-3 flex items-center justify-between text-sm">
          <span class="text-slate-600 truncate">📄 {{ fileName }}</span>
          <button type="button" class="text-primary-500 hover:text-primary-600" @click="resetParsed">
            再選択
          </button>
        </div>
      </div>

      <!-- サマリー -->
      <div v-if="parsedRows.length > 0" class="card">
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="font-medium text-slate-700">{{ parsedRows.length }}件中</span>
          <span class="badge-green">有効 {{ validRows.length }}件</span>
          <span v-if="invalidCount > 0" class="badge-red">エラー {{ invalidCount }}件</span>
        </div>
      </div>

      <!-- プレビュー (デスクトップ) -->
      <div v-if="parsedRows.length > 0" class="hidden md:block card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-2 px-2 text-xs font-medium text-slate-500 w-10">行</th>
              <th class="text-left py-2 px-2 text-xs font-medium text-slate-500">商品名</th>
              <th class="text-right py-2 px-2 text-xs font-medium text-slate-500">価格</th>
              <th class="text-left py-2 px-2 text-xs font-medium text-slate-500">所有者</th>
              <th class="text-left py-2 px-2 text-xs font-medium text-slate-500">カテゴリ</th>
              <th class="text-right py-2 px-2 text-xs font-medium text-slate-500">在庫</th>
              <th class="text-center py-2 px-2 text-xs font-medium text-slate-500">状態</th>
              <th class="text-left py-2 px-2 text-xs font-medium text-slate-500">エラー</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in parsedRows"
              :key="row.rowNumber"
              class="border-b border-slate-50"
              :class="row.valid ? 'hover:bg-slate-50' : 'bg-red-50/40 opacity-80'"
            >
              <td class="py-2 px-2 text-slate-400">{{ row.rowNumber }}</td>
              <td class="py-2 px-2 font-medium text-slate-800 max-w-[12rem] truncate">
                {{ row.name || '—' }}
              </td>
              <td class="py-2 px-2 text-right">
                {{ Number.isFinite(row.price) ? `¥${row.price.toLocaleString()}` : '—' }}
              </td>
              <td class="py-2 px-2 text-slate-600 max-w-[8rem] truncate">
                {{ row.ownerName || String(row.raw['所有者'] || '—') }}
              </td>
              <td class="py-2 px-2">
                <span class="badge-primary text-[10px]">{{ row.category }}</span>
              </td>
              <td class="py-2 px-2 text-right">{{ row.stock }}</td>
              <td class="py-2 px-2 text-center">
                <CheckCircle2 v-if="row.valid" :size="16" class="inline text-emerald-500" />
                <XCircle v-else :size="16" class="inline text-red-400" />
              </td>
              <td class="py-2 px-2">
                <p
                  v-for="(e, i) in row.errors"
                  :key="i"
                  class="text-xs text-red-500 leading-tight"
                >
                  {{ e }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- プレビュー (モバイル) -->
      <div v-if="parsedRows.length > 0" class="md:hidden space-y-3">
        <div
          v-for="row in parsedRows"
          :key="row.rowNumber"
          class="card"
          :class="row.valid ? '' : 'bg-red-50/40 opacity-80'"
        >
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">行 {{ row.rowNumber }}</span>
              <CheckCircle2 v-if="row.valid" :size="14" class="text-emerald-500" />
              <XCircle v-else :size="14" class="text-red-400" />
            </div>
            <span class="text-sm font-semibold text-primary-500">
              {{ Number.isFinite(row.price) ? `¥${row.price.toLocaleString()}` : '—' }}
            </span>
          </div>
          <p class="font-medium text-slate-800 truncate">{{ row.name || '—' }}</p>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-xs text-slate-500">{{ row.ownerName || row.raw['所有者'] || '所有者なし' }}</span>
            <span class="badge-primary text-[10px]">{{ row.category }}</span>
            <span class="text-xs text-slate-500">在庫 {{ row.stock }}</span>
          </div>
          <div v-if="row.errors.length > 0" class="mt-2">
            <p
              v-for="(e, i) in row.errors"
              :key="i"
              class="text-xs text-red-500 leading-tight"
            >
              {{ e }}
            </p>
          </div>
        </div>
      </div>

      <!-- 何も読み込まれていない（解析後・件数 0） -->
      <div v-else-if="hasParsed" class="card text-center text-sm text-slate-500">
        有効な行がありません。テンプレートを参考にデータを入力してください。
      </div>

      <!-- 登録ボタン -->
      <button
        v-if="parsedRows.length > 0"
        class="btn-primary w-full"
        :disabled="!canSubmit"
        @click="handleImport"
      >
        <LoadingSpinner v-if="submitting" size="sm" />
        {{
          submitting
            ? `登録中... (${submittedCount}/${validRows.length})`
            : `${validRows.length}件を登録`
        }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  Users,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-vue-next'
import type { ParsedRow, ExcelMember } from '~/composables/useExcelImport'

definePageMeta({ middleware: 'auth' })

const { createProduct } = useProducts()
const { getGroupMembers } = useGroups()
const { parseProductExcel, downloadTemplate } = useExcelImport()
const { currentGroupId } = useCurrentGroup()
const toast = useToast()

const members = ref<ExcelMember[]>([])
const membersLoading = ref(true)
const fileInput = ref<HTMLInputElement>()
const fileName = ref('')
const parsing = ref(false)
const hasParsed = ref(false)
const parsedRows = ref<ParsedRow[]>([])
const submitting = ref(false)
const submittedCount = ref(0)
const downloadingTemplate = ref(false)

const validRows = computed(() => parsedRows.value.filter((r) => r.valid))
const invalidCount = computed(() => parsedRows.value.length - validRows.value.length)
const canSubmit = computed(
  () => !submitting.value && !parsing.value && validRows.value.length > 0,
)

const resetParsed = () => {
  parsedRows.value = []
  fileName.value = ''
  hasParsed.value = false
  if (fileInput.value) fileInput.value.value = ''
}

const handleDownloadTemplate = async () => {
  downloadingTemplate.value = true
  try {
    await downloadTemplate()
  } catch (e) {
    toast.error('テンプレートの生成に失敗しました')
  } finally {
    downloadingTemplate.value = false
  }
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
  input.value = ''
}

const handleDrop = (e: DragEvent) => {
  if (membersLoading.value) return
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    toast.error('Excel または CSV ファイルを選択してください')
    return
  }
  processFile(file)
}

const processFile = async (file: File) => {
  parsing.value = true
  parsedRows.value = []
  hasParsed.value = false
  fileName.value = file.name
  try {
    const rows = await parseProductExcel(file, members.value)
    parsedRows.value = rows
    hasParsed.value = true
    if (rows.length === 0) {
      toast.warning('有効な行が見つかりませんでした')
    }
  } catch (e: any) {
    toast.error(`ファイルの解析に失敗しました: ${e?.message || '不明なエラー'}`)
    fileName.value = ''
  } finally {
    parsing.value = false
  }
}

const handleImport = async () => {
  if (!currentGroupId.value || validRows.value.length === 0) return

  submitting.value = true
  submittedCount.value = 0
  let successCount = 0
  let failCount = 0
  const successfulRowNumbers = new Set<number>()

  const toRegister = [...validRows.value]
  for (const row of toRegister) {
    try {
      await createProduct(
        currentGroupId.value,
        row.name,
        row.price,
        row.ownerUid,
        row.ownerName,
        row.stock,
        null,
        row.description,
        row.category,
        [...row.tags],
        row.status,
      )
      successCount++
      successfulRowNumbers.add(row.rowNumber)
    } catch {
      failCount++
    }
    submittedCount.value++
  }

  // 登録成功した行をリストから除去
  parsedRows.value = parsedRows.value.filter((r) => !successfulRowNumbers.has(r.rowNumber))
  if (parsedRows.value.length === 0) {
    fileName.value = ''
    hasParsed.value = false
  }

  submitting.value = false

  if (failCount === 0) {
    toast.success(`${successCount}件の商品を登録しました`)
  } else {
    toast.warning(`${successCount}件登録、${failCount}件失敗しました`)
  }
}

onMounted(async () => {
  if (!currentGroupId.value) {
    membersLoading.value = false
    return
  }
  try {
    const list = await getGroupMembers(currentGroupId.value)
    members.value = list
      .filter((m: any) => m.status === 'active')
      .map((m: any) => ({ uid: m.uid, displayName: m.displayName }))
  } catch {
    toast.error('メンバー情報の取得に失敗しました')
  } finally {
    membersLoading.value = false
  }
})
</script>
