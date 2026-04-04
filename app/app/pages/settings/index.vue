<template>
  <div>
    <h2 class="page-title mb-6">メニュー</h2>

    <!-- User Profile -->
    <div class="card mb-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
          {{ userProfile?.displayName?.charAt(0) || '?' }}
        </div>
        <div>
          <h3 class="font-semibold text-slate-800">{{ userProfile?.displayName }}</h3>
          <p class="text-sm text-slate-500">{{ userProfile?.email }}</p>
          <span :class="roleBadgeClass">{{ roleName }}</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="space-y-2">
      <NuxtLink to="/inventory" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-xl">📋</span>
        <div class="flex-1">
          <p class="font-medium text-slate-800">在庫管理</p>
          <p class="text-xs text-slate-400">商品の在庫を確認・調整</p>
        </div>
        <span class="text-slate-300">→</span>
      </NuxtLink>

      <NuxtLink to="/groups" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-xl">👥</span>
        <div class="flex-1">
          <p class="font-medium text-slate-800">グループ管理</p>
          <p class="text-xs text-slate-400">グループの作成・メンバー管理</p>
        </div>
        <span class="text-slate-300">→</span>
      </NuxtLink>

      <NuxtLink v-if="isPlatformAdmin" to="/admin" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-xl">⚙️</span>
        <div class="flex-1">
          <p class="font-medium text-slate-800">管理設定</p>
          <p class="text-xs text-slate-400">プラットフォーム全体の管理</p>
        </div>
        <span class="text-slate-300">→</span>
      </NuxtLink>
    </div>

    <!-- Logout -->
    <button @click="handleLogout" class="btn-secondary w-full mt-8">
      ログアウト
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { userProfile, isPlatformAdmin, logout } = useAuth()

const roleName = computed(() => {
  const role = userProfile.value?.role
  if (role === 'platformAdmin') return 'プラットフォーム管理者'
  if (role === 'groupAdmin') return 'グループ管理者'
  return 'メンバー'
})

const roleBadgeClass = computed(() => {
  const role = userProfile.value?.role
  if (role === 'platformAdmin') return 'badge-blue'
  if (role === 'groupAdmin') return 'badge-green'
  return 'badge-gray'
})

const handleLogout = async () => {
  await logout()
}
</script>
