<template>
  <div class="flex flex-col items-center gap-4">
    <canvas ref="canvasRef" class="rounded-xl border border-slate-100" />
    <p class="text-xs text-slate-500 break-all text-center max-w-[280px]">{{ url }}</p>
    <div class="flex gap-2">
      <button @click="downloadQr" class="btn-primary btn-sm">
        <Download :size="16" />
        ダウンロード
      </button>
      <button @click="copyUrl" class="btn-secondary btn-sm">
        <Copy :size="16" />
        URLをコピー
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { Download, Copy } from 'lucide-vue-next'

const props = defineProps<{
  url: string
  size?: number
  groupName?: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
const toast = useToast()

const renderQr = async () => {
  if (!canvasRef.value) return
  await QRCode.toCanvas(canvasRef.value, props.url, {
    width: props.size || 240,
    margin: 2,
    color: { dark: '#334155', light: '#ffffff' },
  })
}

const downloadQr = () => {
  if (!canvasRef.value) return
  const link = document.createElement('a')
  link.download = `qr-${props.groupName || 'shop'}.png`
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.url)
    toast.success('URLをコピーしました')
  } catch {
    toast.error('コピーに失敗しました')
  }
}

onMounted(renderQr)
watch(() => props.url, renderQr)
</script>
