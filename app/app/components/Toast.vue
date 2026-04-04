<template>
  <Teleport to="body">
    <div class="fixed top-4 left-4 right-4 sm:left-auto z-50 space-y-2 sm:max-w-sm sm:w-full pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-xl shadow-lg border px-4 py-3 flex items-start gap-3"
          :class="{
            'bg-white border-slate-200': toast.type === 'info',
            'bg-emerald-50 border-emerald-200': toast.type === 'success',
            'bg-red-50 border-red-200': toast.type === 'error',
            'bg-amber-50 border-amber-200': toast.type === 'warning',
          }"
        >
          <span class="text-lg shrink-0">
            {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️' }}
          </span>
          <p class="text-sm text-slate-700 flex-1 break-words">{{ toast.message }}</p>
          <button @click="removeToast(toast.id)" class="text-slate-400 hover:text-slate-600 shrink-0">&times;</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

const toasts = useState<ToastItem[]>('toasts', () => [])

const removeToast = (id: number) => {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
</script>

<style scoped>
.toast-enter-active { animation: slideIn 0.3s ease-out; }
.toast-leave-active { animation: slideOut 0.2s ease-in; }
.toast-move { transition: transform 0.3s ease; }
@keyframes slideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100%); opacity: 0; } }
</style>
