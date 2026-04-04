<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="cancel" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in">
        <h3 class="text-lg font-semibold text-slate-800 mb-2">{{ title }}</h3>
        <p class="text-sm text-slate-600 mb-6">{{ message }}</p>
        <div class="flex gap-3 justify-end">
          <button @click="cancel" class="btn-secondary btn-sm">キャンセル</button>
          <button @click="confirm" :class="dangerMode ? 'btn-danger btn-sm' : 'btn-primary btn-sm'">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  dangerMode?: boolean
}>(), {
  confirmText: '確認',
  dangerMode: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const cancel = () => emit('update:modelValue', false)
const confirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
