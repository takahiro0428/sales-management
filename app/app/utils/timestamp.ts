/**
 * Convert a value that may be a Firestore Timestamp, a Date, a number of
 * milliseconds, an ISO string, or a pending serverTimestamp() sentinel to
 * a millisecond epoch. Returns 0 on unparseable input so that sorts
 * consistently place unknown values at the bottom.
 */
export const toMillis = (ts: unknown): number => {
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  // Firestore Timestamp
  const anyTs = ts as { toMillis?: () => number; seconds?: number }
  if (typeof anyTs.toMillis === 'function') return anyTs.toMillis()
  if (typeof anyTs.seconds === 'number') return anyTs.seconds * 1000
  // Date / ISO string
  const d = new Date(ts as string | number | Date)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}
