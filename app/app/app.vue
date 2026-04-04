<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toast />
  </div>
</template>

<script setup lang="ts">
const { initAuth, authReady } = useAuth()

onMounted(async () => {
  if (!authReady.value) {
    await initAuth()
  }
})
</script>
