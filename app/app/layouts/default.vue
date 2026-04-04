<template>
  <div class="min-h-screen flex flex-col md:flex-row">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200 fixed h-full z-30">
      <div class="p-5 border-b border-slate-100">
        <h1 class="text-lg font-bold text-blue-600">フリマ売上管理</h1>
        <p v-if="currentGroupName" class="text-sm text-slate-500 mt-1 truncate">{{ currentGroupName }}</p>
      </div>
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          active-class="!bg-blue-50 !text-blue-600 font-medium"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="p-4 border-t border-slate-100">
        <div class="flex items-center gap-3 px-4 py-2">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
            {{ userInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-700 truncate">{{ displayName }}</p>
            <p class="text-xs text-slate-400 truncate">{{ roleName }}</p>
          </div>
        </div>
        <button @click="handleLogout" class="w-full mt-2 text-sm text-slate-500 hover:text-red-500 px-4 py-2 text-left transition-colors">
          ログアウト
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 md:ml-64">
      <!-- Mobile Header -->
      <header class="md:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-base font-bold text-blue-600">フリマ売上管理</h1>
            <p v-if="currentGroupName" class="text-xs text-slate-500 truncate max-w-[200px]">{{ currentGroupName }}</p>
          </div>
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
            {{ userInitial }}
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 md:p-6 pb-24 md:pb-6">
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-slate-100 safe-area-bottom">
      <div class="flex items-center justify-around py-2">
        <NuxtLink
          v-for="item in mobileNavItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-slate-400 transition-colors min-w-[64px]"
          active-class="!text-blue-600"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
const { userProfile, logout } = useAuth()
const currentGroupId = useState<string | null>('currentGroupId', () => null)
const currentGroupName = useState<string | null>('currentGroupName', () => null)

const displayName = computed(() => userProfile.value?.displayName || '')
const userInitial = computed(() => displayName.value?.charAt(0) || '?')
const roleName = computed(() => {
  const role = userProfile.value?.role
  if (role === 'platformAdmin') return '管理者'
  if (role === 'groupAdmin') return 'グループ管理者'
  return 'メンバー'
})

const navItems = computed(() => [
  { to: '/', icon: '🏠', label: 'ホーム' },
  { to: '/products', icon: '📦', label: '商品管理' },
  { to: '/sales', icon: '💰', label: '売上管理' },
  { to: '/inventory', icon: '📋', label: '在庫管理' },
  { to: '/groups', icon: '👥', label: 'グループ' },
  ...(userProfile.value?.role === 'platformAdmin' ? [{ to: '/admin', icon: '⚙️', label: '管理設定' }] : []),
])

const mobileNavItems = computed(() => [
  { to: '/', icon: '🏠', label: 'ホーム' },
  { to: '/products', icon: '📦', label: '商品' },
  { to: '/sales', icon: '💰', label: '売上' },
  { to: '/settings', icon: '⚙️', label: 'メニュー' },
])

const handleLogout = async () => {
  await logout()
}
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
