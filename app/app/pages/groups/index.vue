<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="page-title">グループ</h2>
      <button v-if="isPlatformAdmin" @click="showCreateModal = true" class="btn-primary btn-sm">
        <PlusCircle :size="16" />
        作成
      </button>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <EmptyState v-else-if="groups.length === 0" :icon="Users" title="グループがありません" description="プラットフォーム管理者がグループを作成するか、招待メールからグループに参加できます" />

    <div v-else class="space-y-3">
      <div v-for="g in groups" :key="g.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="selectGroup(g)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-slate-800">{{ g.name }}</h3>
            <p class="text-sm text-slate-500 mt-0.5">{{ g.description || '説明なし' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="currentGroupId === g.id" class="badge-primary">選択中</span>
            <ChevronRight :size="16" class="text-slate-300" />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showCreateModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">グループを作成</h3>
          <form @submit.prevent="handleCreateGroup" class="space-y-4">
            <div>
              <label class="label-text">グループ名 <span class="text-red-400">*</span></label>
              <input v-model="newGroup.name" type="text" class="input-field" placeholder="例：田中家" required />
            </div>
            <div>
              <label class="label-text">説明</label>
              <input v-model="newGroup.description" type="text" class="input-field" placeholder="例：フリマ出品用グループ" />
            </div>
            <div class="flex gap-3">
              <button type="button" @click="showCreateModal = false" class="btn-secondary flex-1">キャンセル</button>
              <button type="submit" class="btn-primary flex-1" :disabled="creating">
                {{ creating ? '作成中...' : '作成' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Users, PlusCircle, ChevronRight } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { userProfile, isPlatformAdmin } = useAuth()
const { getMyGroups, createGroup } = useGroups()
const toast = useToast()
const { currentGroupId, setCurrentGroup } = useCurrentGroup()

const loading = ref(true)
const groups = ref<any[]>([])
const showCreateModal = ref(false)
const creating = ref(false)
const newGroup = reactive({ name: '', description: '' })

const selectGroup = (g: any) => {
  setCurrentGroup(g.id, g.name)
  navigateTo(`/groups/${g.id}`)
}

const handleCreateGroup = async () => {
  creating.value = true
  try {
    await createGroup(
      newGroup.name,
      newGroup.description,
      userProfile.value!.uid,
      userProfile.value!.displayName,
      userProfile.value!.email,
    )
    toast.success('グループを作成しました')
    showCreateModal.value = false
    newGroup.name = ''
    newGroup.description = ''
    groups.value = await getMyGroups(userProfile.value!.uid, isPlatformAdmin.value)
  } catch (e) {
    toast.error('グループの作成に失敗しました')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    groups.value = await getMyGroups(userProfile.value!.uid, isPlatformAdmin.value)
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
