<template>
  <section
    class="relative overflow-hidden rounded-3xl mb-8"
    :class="[heroImageUrl ? 'bg-slate-900' : 'bg-gradient-to-br from-primary-100 via-primary-50 to-sub1-100']"
  >
    <!-- Image -->
    <div class="relative aspect-[16/9] md:aspect-[21/9]">
      <img
        v-if="heroImageUrl"
        :src="heroImageUrl"
        :alt="resolvedTitle"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <!-- Overlay for legibility when image is present -->
      <div
        v-if="heroImageUrl"
        class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
      />

      <!-- Text -->
      <div class="absolute inset-0 flex flex-col justify-end p-5 md:p-10">
        <h1
          class="text-2xl md:text-4xl font-bold leading-tight"
          :class="heroImageUrl ? 'text-white drop-shadow' : 'text-slate-800'"
        >
          {{ resolvedTitle }}
        </h1>
        <p
          v-if="resolvedCaption"
          class="mt-2 text-sm md:text-base max-w-2xl leading-relaxed"
          :class="heroImageUrl ? 'text-white/90 drop-shadow' : 'text-slate-600'"
        >
          {{ resolvedCaption }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  groupName: string
  groupDescription?: string
  heroImageUrl?: string | null
  heroTitle?: string
  heroCaption?: string
}>()

const resolvedTitle = computed(() => {
  const t = (props.heroTitle || '').trim()
  return t || props.groupName || 'ショップ'
})

const CAPTION_FALLBACK_MAX = 120

const resolvedCaption = computed(() => {
  const c = (props.heroCaption || '').trim()
  if (c) return c
  // The hero form caps `heroCaption` at 120 chars. Legacy groups may have a
  // long `description` (used as fallback); truncate to match so the hero
  // overlay does not overflow on mobile.
  const desc = (props.groupDescription || '').trim()
  if (!desc) return ''
  return desc.length > CAPTION_FALLBACK_MAX
    ? desc.slice(0, CAPTION_FALLBACK_MAX).trimEnd() + '…'
    : desc
})
</script>
