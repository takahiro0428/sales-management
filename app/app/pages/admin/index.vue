<template>
  <div>
    <h2 class="page-title mb-6">プラットフォーム管理</h2>

    <!-- Stats Overview -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      <div class="stat-card">
        <span class="stat-value">{{ groups.length }}</span>
        <span class="stat-label">グループ数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ totalMembers }}</span>
        <span class="stat-label">総ユーザー数</span>
      </div>
      <div class="stat-card col-span-2 md:col-span-1">
        <span class="stat-value">{{ totalInvitations }}</span>
        <span class="stat-label">招待中</span>
      </div>
    </div>

    <!-- Groups List -->
    <div class="card">
      <h3 class="section-title mb-4">全グループ</h3>
      <LoadingSpinner v-if="loading" />
      <div v-else-if="groups.length === 0" class="text-center py-4 text-sm text-slate-400">グループなし</div>
      <div v-else class="space-y-3">
        <NuxtLink v-for="g in groups" :key="g.id" :to="`/groups/${g.id}`"
          class="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium text-slate-800">{{ g.name }}</h4>
              <p class="text-xs text-slate-400">{{ g.description || '説明なし' }}</p>
            </div>
            <span class="text-slate-300">→</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const { getMyGroups } = useGroups()
const { isPlatformAdmin, userProfile } = useAuth()
const toast = useToast()

const loading = ref(true)
const groups = ref<any[]>([])
const totalMembers = ref(0)
const totalInvitations = ref(0)

onMounted(async () => {
  try {
    groups.value = await getMyGroups(userProfile.value!.uid, true)
    // Count from groups - simple estimate for now
    totalMembers.value = groups.value.length * 2 // Will be replaced with actual count
    totalInvitations.value = 0
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
