<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="navigateTo('/groups')" class="text-slate-400 hover:text-slate-600">
        <ArrowLeft :size="20" />
      </button>
      <div class="flex-1">
        <h2 class="page-title">{{ group?.name || 'グループ' }}</h2>
        <p v-if="group?.description" class="text-sm text-slate-500">{{ group.description }}</p>
      </div>
      <button @click="setAsCurrent" class="btn-secondary btn-sm" v-if="currentGroupId !== groupId">
        選択する
      </button>
    </div>

    <LoadingSpinner v-if="loading" full-page />

    <template v-else-if="group">
      <!-- Tabs -->
      <div class="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        <button
          @click="activeTab = 'members'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          :class="activeTab === 'members' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          メンバー ({{ members.length }})
        </button>
        <button
          v-if="canManage"
          @click="activeTab = 'invitations'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          :class="activeTab === 'invitations' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          招待 ({{ invitations.length }})
        </button>
        <button
          @click="activeTab = 'qrcode'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          :class="activeTab === 'qrcode' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'"
        >
          QRコード
        </button>
      </div>

      <!-- Members Tab -->
      <div v-if="activeTab === 'members'">
        <div v-if="canManage" class="mb-4">
          <button @click="showInviteModal = true" class="btn-primary btn-sm w-full sm:w-auto">
            <UserPlus :size="16" />
            メンバーを招待
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="m in members" :key="m.id" class="card">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm shrink-0">
                {{ m.displayName?.charAt(0) || '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-800 text-sm truncate">{{ m.displayName }}</span>
                  <span v-if="m.role === 'groupAdmin'" class="badge-primary">管理者</span>
                  <span v-if="m.status === 'suspended'" class="badge-red">停止中</span>
                </div>
                <p class="text-xs text-slate-400 truncate">{{ m.email }}</p>
              </div>
              <div v-if="canManage && m.uid !== userProfile?.uid" class="shrink-0">
                <button v-if="m.status === 'active'" @click="handleSuspend(m)" class="btn-secondary btn-sm text-xs">停止</button>
                <button v-else @click="handleReactivate(m)" class="btn-success btn-sm text-xs">復帰</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invitations Tab -->
      <div v-if="activeTab === 'invitations' && canManage">
        <EmptyState v-if="invitations.length === 0" :icon="Mail" title="招待なし" description="メンバーを招待するとここに表示されます" />

        <div v-else class="space-y-3">
          <div v-for="inv in invitations" :key="inv.id" class="card">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-slate-800 text-sm">{{ inv.email }}</span>
              <span :class="invitationStatusClass(inv.status)">{{ invitationStatusText(inv.status) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-slate-400">
                <span>{{ inv.invitedByName }}が招待</span>
                <span v-if="inv.role === 'groupAdmin'" class="ml-1">(管理者として)</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="inv.emailSent === false && inv.emailError" class="text-xs text-red-500">送信失敗</span>
                <span v-else-if="inv.emailSent" class="text-xs text-emerald-500">送信済み</span>
                <button v-if="inv.status === 'failed' || (inv.status === 'pending' && !inv.emailSent)"
                  @click="handleResend(inv.id)" class="btn-secondary btn-sm text-xs">再送信</button>
              </div>
            </div>
            <p v-if="inv.emailError" class="text-xs text-red-400 mt-1">エラー: {{ inv.emailError }}</p>
          </div>
        </div>
      </div>

      <!-- QR Code Tab -->
      <div v-if="activeTab === 'qrcode'">
        <div class="card">
          <h3 class="section-title mb-4">商品ページQRコード</h3>
          <p class="text-sm text-slate-500 mb-4">このQRコードをお客様に共有すると、商品カタログページにアクセスできます。</p>
          <QrCodeGenerator
            :url="shopUrl"
            :group-name="group?.name"
          />
        </div>
      </div>

      <!-- Invite Modal -->
      <Teleport to="body">
        <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40" @click="showInviteModal = false" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">メンバーを招待</h3>
            <form @submit.prevent="handleInvite" class="space-y-4">
              <div>
                <label class="label-text">メールアドレス <span class="text-red-400">*</span></label>
                <input v-model="inviteForm.email" type="email" class="input-field" placeholder="mail@example.com" required />
              </div>
              <div>
                <label class="label-text">ロール</label>
                <select v-model="inviteForm.role" class="input-field">
                  <option value="member">メンバー</option>
                  <option value="groupAdmin">グループ管理者</option>
                </select>
              </div>
              <div class="flex gap-3">
                <button type="button" @click="showInviteModal = false" class="btn-secondary flex-1">キャンセル</button>
                <button type="submit" class="btn-primary flex-1" :disabled="inviting">
                  {{ inviting ? '送信中...' : '招待する' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </template>

    <ConfirmDialog
      v-model="showSuspendConfirm"
      title="メンバーを停止"
      :message="`${suspendTarget?.displayName} をグループから停止しますか？`"
      confirm-text="停止する"
      danger-mode
      @confirm="confirmSuspend"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, UserPlus, Mail } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { userProfile, isPlatformAdmin } = useAuth()
const { getGroup, getGroupMembers, getGroupInvitations, inviteMember, resendInvitation, suspendMember, reactivateMember, isGroupAdmin } = useGroups()
const toast = useToast()
const { currentGroupId, setCurrentGroup } = useCurrentGroup()

const groupId = route.params.id as string
const loading = ref(true)
const activeTab = ref('members')
const group = ref<any>(null)
const members = ref<any[]>([])
const invitations = ref<any[]>([])
const canManage = ref(false)
const showInviteModal = ref(false)
const inviting = ref(false)
const showSuspendConfirm = ref(false)
const suspendTarget = ref<any>(null)

const inviteForm = reactive({ email: '', role: 'member' as 'member' | 'groupAdmin' })

const shopUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/shop/${groupId}`
  }
  return `/shop/${groupId}`
})

const setAsCurrent = () => {
  setCurrentGroup(groupId, group.value?.name || null)
  toast.success('グループを選択しました')
}

const invitationStatusClass = (status: string) => ({
  pending: 'badge-yellow',
  accepted: 'badge-green',
  expired: 'badge-gray',
  failed: 'badge-red',
})[status] || 'badge-gray'

const invitationStatusText = (status: string) => ({
  pending: '招待中',
  accepted: '参加済み',
  expired: '期限切れ',
  failed: '失敗',
})[status] || status

const handleInvite = async () => {
  inviting.value = true
  try {
    await inviteMember(
      groupId,
      group.value.name,
      inviteForm.email,
      inviteForm.role,
      userProfile.value!.uid,
      userProfile.value!.displayName,
    )
    toast.success('招待を送信しました')
    showInviteModal.value = false
    inviteForm.email = ''
    inviteForm.role = 'member'
    invitations.value = await getGroupInvitations(groupId)
  } catch (e) {
    toast.error('招待の送信に失敗しました')
  } finally {
    inviting.value = false
  }
}

const handleResend = async (invId: string) => {
  try {
    await resendInvitation(invId)
    toast.success('再送信を設定しました')
    invitations.value = await getGroupInvitations(groupId)
  } catch (e) {
    toast.error('再送信に失敗しました')
  }
}

const handleSuspend = (member: any) => {
  suspendTarget.value = member
  showSuspendConfirm.value = true
}

const confirmSuspend = async () => {
  if (!suspendTarget.value) return
  try {
    await suspendMember(suspendTarget.value.id)
    suspendTarget.value.status = 'suspended'
    toast.success('メンバーを停止しました')
  } catch (e) {
    toast.error('停止に失敗しました')
  }
}

const handleReactivate = async (member: any) => {
  try {
    await reactivateMember(member.id)
    member.status = 'active'
    toast.success('メンバーを復帰しました')
  } catch (e) {
    toast.error('復帰に失敗しました')
  }
}

onMounted(async () => {
  try {
    const [g, m, isAdmin] = await Promise.all([
      getGroup(groupId),
      getGroupMembers(groupId),
      isGroupAdmin(groupId, userProfile.value!.uid),
    ])
    group.value = g
    members.value = m
    canManage.value = isAdmin || isPlatformAdmin.value

    if (canManage.value) {
      invitations.value = await getGroupInvitations(groupId)
    }
  } catch (e) {
    toast.error('データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
})
</script>
