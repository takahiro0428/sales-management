/**
 * Format a Firestore timestamp or Date to a short date string (M/D H:MM)
 */
export const formatDate = (ts: any): string => {
  if (!ts) return '--'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (isNaN(d.getTime())) return '--'
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Format a Firestore timestamp or Date to a full date string (YYYY/M/D H:MM)
 */
export const formatDateFull = (ts: any): string => {
  if (!ts) return '--'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (isNaN(d.getTime())) return '--'
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Format a currency amount in Yen
 */
export const formatYen = (amount: number): string => {
  return `¥${amount.toLocaleString()}`
}

/**
 * Map role to display name in Japanese
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  platformAdmin: 'プラットフォーム管理者',
  groupAdmin: 'グループ管理者',
  user: 'メンバー',
}

/**
 * Map role to badge CSS class
 */
export const ROLE_BADGE_CLASS: Record<string, string> = {
  platformAdmin: 'badge-blue',
  groupAdmin: 'badge-green',
  user: 'badge-gray',
}

/**
 * Low stock threshold constant
 */
export const LOW_STOCK_THRESHOLD = 3
