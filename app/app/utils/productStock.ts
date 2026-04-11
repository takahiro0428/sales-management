/**
 * Shared helpers for rendering product stock status on the public shop UI.
 * Kept as a plain util so multiple components (cards, modals, strips) can
 * reuse the same mapping without duplicating the thresholds.
 */
export const stockStatusText = (stock: number): string => {
  if (stock === 0) return '売り切れ'
  if (stock <= 3) return '残りわずか'
  return '在庫あり'
}

export const stockStatusClass = (stock: number): string => {
  if (stock === 0) return 'bg-slate-100 text-slate-400'
  if (stock <= 3) return 'bg-amber-50 text-amber-600'
  return 'bg-sub2-100 text-sub2-500'
}
