interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

let toastId = 0

export const useToast = () => {
  const toasts = useState<ToastItem[]>('toasts', () => [])

  const show = (message: string, type: ToastItem['type'] = 'info', duration = 4000) => {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id)
      }, duration)
    }
  }

  return {
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error', 6000),
    warning: (msg: string) => show(msg, 'warning'),
    info: (msg: string) => show(msg, 'info'),
  }
}
