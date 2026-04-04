<template>
  <div>
    <NuxtLayout name="auth">
      <div class="card">
        <h2 class="text-xl font-bold text-center text-slate-800 mb-6">ログイン</h2>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="label-text">メールアドレス</label>
            <input v-model="email" type="email" class="input-field" placeholder="mail@example.com" required />
          </div>
          <div>
            <label class="label-text">パスワード</label>
            <input v-model="password" type="password" class="input-field" placeholder="パスワードを入力" required />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <LoadingSpinner v-if="loading" size="sm" />
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </button>
        </form>
        <p class="text-center text-sm text-slate-500 mt-4">
          アカウントをお持ちでない方は
          <NuxtLink to="/register" class="text-blue-500 hover:text-blue-600 font-medium">新規登録</NuxtLink>
        </p>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()
const toast = useToast()
const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    await login(email.value, password.value)
    navigateTo('/')
  } catch (e: any) {
    const msg = e.code === 'auth/invalid-credential' ? 'メールアドレスまたはパスワードが正しくありません'
      : e.code === 'auth/too-many-requests' ? 'ログイン試行回数が多すぎます。しばらくしてからお試しください'
      : e.code === 'auth/configuration-not-found' || e.message?.includes('CONFIGURATION_NOT_FOUND')
        ? 'システムの設定に問題があります。管理者にお問い合わせください'
        : 'ログインに失敗しました'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}
</script>
