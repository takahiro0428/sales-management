<template>
  <div>
    <NuxtLayout name="auth">
      <div class="card">
        <h2 class="text-xl font-bold text-center text-slate-800 mb-6">新規登録</h2>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="label-text">表示名</label>
            <input v-model="displayName" type="text" class="input-field" placeholder="田中 太郎" required />
          </div>
          <div>
            <label class="label-text">メールアドレス</label>
            <input v-model="email" type="email" class="input-field" placeholder="mail@example.com" required />
          </div>
          <div>
            <label class="label-text">パスワード</label>
            <input v-model="password" type="password" class="input-field" placeholder="6文字以上" minlength="6" required />
          </div>
          <div>
            <label class="label-text">パスワード（確認）</label>
            <input v-model="passwordConfirm" type="password" class="input-field" placeholder="もう一度入力" required />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <LoadingSpinner v-if="loading" size="sm" />
            {{ loading ? '登録中...' : '登録する' }}
          </button>
        </form>
        <p class="text-center text-sm text-slate-500 mt-4">
          すでにアカウントをお持ちの方は
          <NuxtLink to="/login" class="text-blue-500 hover:text-blue-600 font-medium">ログイン</NuxtLink>
        </p>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { register } = useAuth()
const toast = useToast()
const displayName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)

const handleRegister = async () => {
  if (password.value !== passwordConfirm.value) {
    toast.error('パスワードが一致しません')
    return
  }
  if (password.value.length < 6) {
    toast.error('パスワードは6文字以上で入力してください')
    return
  }
  loading.value = true
  try {
    await register(email.value, password.value, displayName.value)
    toast.success('登録が完了しました！')
    navigateTo('/')
  } catch (e: any) {
    const msg = e.code === 'auth/email-already-in-use' ? 'このメールアドレスは既に登録されています'
      : e.code === 'auth/weak-password' ? 'パスワードが弱すぎます。6文字以上で設定してください'
      : '登録に失敗しました'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}
</script>
