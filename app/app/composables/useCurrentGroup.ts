const STORAGE_KEY_ID = 'currentGroupId'
const STORAGE_KEY_NAME = 'currentGroupName'

export const useCurrentGroup = () => {
  const currentGroupId = useState<string | null>('currentGroupId', () => null)
  const currentGroupName = useState<string | null>('currentGroupName', () => null)

  const restoreFromStorage = () => {
    if (import.meta.server) return
    if (currentGroupId.value) return // Already set in this session
    try {
      const storedId = localStorage.getItem(STORAGE_KEY_ID)
      const storedName = localStorage.getItem(STORAGE_KEY_NAME)
      if (storedId) {
        currentGroupId.value = storedId
        currentGroupName.value = storedName
      }
    } catch {
      // Ignore storage errors
    }
  }

  const setCurrentGroup = (groupId: string | null, groupName: string | null) => {
    currentGroupId.value = groupId
    currentGroupName.value = groupName
    if (import.meta.server) return
    try {
      if (groupId) {
        localStorage.setItem(STORAGE_KEY_ID, groupId)
        localStorage.setItem(STORAGE_KEY_NAME, groupName || '')
      } else {
        localStorage.removeItem(STORAGE_KEY_ID)
        localStorage.removeItem(STORAGE_KEY_NAME)
      }
    } catch {
      // Ignore storage errors
    }
  }

  return {
    currentGroupId,
    currentGroupName,
    restoreFromStorage,
    setCurrentGroup,
  }
}
