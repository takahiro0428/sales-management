const STORAGE_KEY_PREFIX = 'favorites_'

export const useFavorites = (groupId: string) => {
  const favorites = useState<Set<string>>(`favorites_${groupId}`, () => new Set())

  const loadFavorites = () => {
    if (import.meta.server) return
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${groupId}`)
      if (stored) {
        favorites.value = new Set(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
  }

  const saveFavorites = () => {
    if (import.meta.server) return
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${groupId}`,
        JSON.stringify([...favorites.value]),
      )
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }

  const toggleFavorite = (productId: string) => {
    const next = new Set(favorites.value)
    if (next.has(productId)) {
      next.delete(productId)
    } else {
      next.add(productId)
    }
    favorites.value = next
    saveFavorites()
  }

  const isFavorite = (productId: string) => {
    return favorites.value.has(productId)
  }

  // Load on first use
  loadFavorites()

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  }
}
