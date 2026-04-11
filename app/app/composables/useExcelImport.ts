import { PRODUCT_CATEGORIES, type ProductStatus } from '~/composables/useProducts'

export interface ExcelMember {
  uid: string
  displayName: string
}

export interface ParsedRow {
  rowNumber: number
  raw: Record<string, any>
  name: string
  price: number
  ownerUid: string
  ownerName: string
  stock: number
  category: string
  description: string
  tags: string[]
  status: ProductStatus
  errors: string[]
  valid: boolean
}

export const EXCEL_COLUMNS = [
  '商品名',
  '価格',
  '所有者',
  '在庫数',
  'カテゴリ',
  '説明',
  'タグ',
  'ステータス',
] as const

const TEMPLATE_FILENAME = '商品インポートテンプレート.xlsx'
const SHEET_NAME = '商品'

const loadXlsx = () => import('xlsx')

const toTrimmedString = (v: any): string => {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

const parseNumber = (v: any): number => {
  if (typeof v === 'number') return v
  const s = String(v ?? '').replace(/,/g, '').replace(/[\u3000\s]/g, '')
  if (s === '') return NaN
  return Number(s)
}

const normalizeRowKeys = (row: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    out[String(key).trim()] = row[key]
  }
  return out
}

const isEmptyRow = (row: Record<string, any>): boolean => {
  return EXCEL_COLUMNS.every((col) => toTrimmedString(row[col]) === '')
}

const parseTags = (raw: any): string[] => {
  const s = toTrimmedString(raw)
  if (!s) return []
  return s
    .split(/[,、／\/]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

const parseStatus = (raw: any): { status: ProductStatus; error?: string } => {
  const s = toTrimmedString(raw)
  if (!s) return { status: 'published' }
  if (s === '公開' || s === 'published') return { status: 'published' }
  if (s === '非公開' || s === 'unpublished') return { status: 'unpublished' }
  return { status: 'published', error: `ステータス「${s}」は無効です（公開/非公開）` }
}

const resolveOwner = (
  raw: any,
  members: ExcelMember[],
): { ownerUid: string; ownerName: string; error?: string } => {
  const s = toTrimmedString(raw)
  if (!s) return { ownerUid: '', ownerName: '', error: '所有者は必須です' }

  const byName = members.filter((m) => m.displayName.trim() === s)
  if (byName.length === 1) {
    return { ownerUid: byName[0]!.uid, ownerName: byName[0]!.displayName }
  }
  if (byName.length > 1) {
    return {
      ownerUid: byName[0]!.uid,
      ownerName: byName[0]!.displayName,
      error: `同名のメンバーが複数います: ${s}（先頭のメンバーを使用）`,
    }
  }

  const byUid = members.find((m) => m.uid === s)
  if (byUid) return { ownerUid: byUid.uid, ownerName: byUid.displayName }

  return {
    ownerUid: '',
    ownerName: '',
    error: `所有者「${s}」がグループメンバーに見つかりません`,
  }
}

const validateRow = (
  rawInput: Record<string, any>,
  rowNumber: number,
  members: ExcelMember[],
): ParsedRow => {
  const raw = normalizeRowKeys(rawInput)
  const errors: string[] = []

  // 商品名
  const name = toTrimmedString(raw['商品名'])
  if (!name) errors.push('商品名は必須です')

  // 価格
  let price = 0
  const priceRaw = raw['価格']
  if (toTrimmedString(priceRaw) === '') {
    errors.push('価格は必須です')
  } else {
    const n = parseNumber(priceRaw)
    if (!Number.isFinite(n) || n < 0) {
      errors.push('価格は0以上の数値で入力してください')
    } else {
      price = n
    }
  }

  // 所有者
  const ownerResult = resolveOwner(raw['所有者'], members)
  if (ownerResult.error) errors.push(ownerResult.error)

  // 在庫数
  let stock = 1
  const stockRaw = raw['在庫数']
  if (toTrimmedString(stockRaw) !== '') {
    const n = parseNumber(stockRaw)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      errors.push('在庫数は0以上の整数で入力してください')
    } else {
      stock = n
    }
  }

  // カテゴリ
  let category = 'その他'
  const categoryRaw = toTrimmedString(raw['カテゴリ'])
  if (categoryRaw !== '') {
    if ((PRODUCT_CATEGORIES as readonly string[]).includes(categoryRaw)) {
      category = categoryRaw
    } else {
      errors.push(`カテゴリ「${categoryRaw}」は無効です`)
    }
  }

  // 説明
  const description = toTrimmedString(raw['説明'])

  // タグ
  const tags = parseTags(raw['タグ'])

  // ステータス
  const statusResult = parseStatus(raw['ステータス'])
  if (statusResult.error) errors.push(statusResult.error)

  // valid: 必須項目が揃っていてエラーがない（同名メンバー警告のみは許容）
  const blockingErrors = errors.filter((e) => !e.startsWith('同名のメンバー'))
  const valid =
    blockingErrors.length === 0 &&
    !!name &&
    Number.isFinite(price) &&
    price >= 0 &&
    !!ownerResult.ownerUid

  return {
    rowNumber,
    raw,
    name,
    price,
    ownerUid: ownerResult.ownerUid,
    ownerName: ownerResult.ownerName,
    stock,
    category,
    description,
    tags,
    status: statusResult.status,
    errors,
    valid,
  }
}

export const useExcelImport = () => {
  const parseProductExcel = async (
    file: File,
    members: ExcelMember[],
  ): Promise<ParsedRow[]> => {
    const XLSX = await loadXlsx()
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return []
    const ws = wb.Sheets[sheetName]
    if (!ws) return []
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

    const result: ParsedRow[] = []
    rows.forEach((raw, idx) => {
      const normalized = normalizeRowKeys(raw)
      if (isEmptyRow(normalized)) return
      result.push(validateRow(normalized, idx + 2, members))
    })
    return result
  }

  const generateProductTemplate = async (): Promise<Blob> => {
    const XLSX = await loadXlsx()
    const sample = [
      {
        商品名: 'サンプル商品',
        価格: 1500,
        所有者: '（メンバーの表示名を入力）',
        在庫数: 10,
        カテゴリ: '雑貨・インテリア',
        説明: '商品の説明文をここに入力します',
        タグ: '新商品,おすすめ',
        ステータス: '公開',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(sample, { header: [...EXCEL_COLUMNS] })
    // 列幅を設定して見やすくする
    ws['!cols'] = [
      { wch: 24 },
      { wch: 10 },
      { wch: 16 },
      { wch: 8 },
      { wch: 16 },
      { wch: 30 },
      { wch: 20 },
      { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    return new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  const downloadTemplate = async () => {
    const blob = await generateProductTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = TEMPLATE_FILENAME
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    parseProductExcel,
    generateProductTemplate,
    downloadTemplate,
    EXCEL_COLUMNS,
  }
}
