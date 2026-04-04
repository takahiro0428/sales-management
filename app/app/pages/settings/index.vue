<template>
  <div>
    <h2 class="page-title mb-6">メニュー</h2>

    <!-- User Profile -->
    <div class="card mb-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold">
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
        <div class="text-sub2-400">
          <ClipboardList :size="22" :stroke-width="1.8" />
        </div>
        <div class="flex-1">
          <p class="font-medium text-slate-800">在庫管理</p>
          <p class="text-xs text-slate-400">商品の在庫を確認・調整</p>
        </div>
        <ChevronRight :size="16" class="text-slate-300" />
      </NuxtLink>

      <NuxtLink to="/groups" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <div class="text-sub1-400">
          <Users :size="22" :stroke-width="1.8" />
        </div>
        <div class="flex-1">
          <p class="font-medium text-slate-800">グループ管理</p>
          <p class="text-xs text-slate-400">グループの作成・メンバー管理</p>
        </div>
        <ChevronRight :size="16" class="text-slate-300" />
      </NuxtLink>

      <NuxtLink v-if="isPlatformAdmin" to="/admin" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <div class="text-primary-400">
          <Shield :size="22" :stroke-width="1.8" />
        </div>
        <div class="flex-1">
          <p class="font-medium text-slate-800">管理設定</p>
          <p class="text-xs text-slate-400">プラットフォーム全体の管理</p>
        </div>
        <ChevronRight :size="16" class="text-slate-300" />
      </NuxtLink>
    </div>

    <!-- Logout -->
    <button @click="handleLogout" class="btn-secondary w-full mt-8">
      <LogOut :size="16" />
      ログアウト
    </button>
  </div>
</template>

<script setup lang="ts">
import { ClipboardList, Users, Shield, ChevronRight, LogOut } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { userProfile, isPlatformAdmin, logout } = useAuth()

const roleName = computed(() => {
  const role = userProfile.value?.role
  return (role && ROLE_DISPLAY_NAMES[role]) || ROLE_DISPLAY_NAMES.user
})

const roleBadgeClass = computed(() => {
  const role = userProfile.value?.role
  return (role && ROLE_BADGE_CLASS[role]) || ROLE_BADGE_CLASS.user
})

const handleLogout = async () => {
  await logout()
}
</script>
