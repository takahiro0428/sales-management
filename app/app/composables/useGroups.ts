import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
} from 'firebase/firestore'

export interface Group {
  id: string
  name: string
  description: string
  createdBy: string
  createdAt: any
  updatedAt: any
}

export interface GroupMember {
  id: string
  groupId: string
  uid: string
  displayName: string
  email: string
  role: 'groupAdmin' | 'member'
  status: 'active' | 'suspended'
  joinedAt: any
  updatedAt: any
}

export interface Invitation {
  id: string
  groupId: string
  groupName: string
  email: string
  role: 'groupAdmin' | 'member'
  status: 'pending' | 'accepted' | 'expired' | 'failed'
  emailSent: boolean
  emailError: string | null
  invitedBy: string
  invitedByName: string
  token: string
  createdAt: any
  expiresAt: any
}

export const useGroups = () => {
  const { $firestore } = useNuxtApp()
  const { addDocument, updateDocument } = useFirestore()

  const createGroup = async (name: string, description: string, creatorUid: string, creatorName: string, creatorEmail: string) => {
    const groupId = await addDocument('groups', { name, description, createdBy: creatorUid })

    // Add creator as group admin
    await addDocument('groupMembers', {
      groupId,
      uid: creatorUid,
      displayName: creatorName,
      email: creatorEmail,
      role: 'groupAdmin',
      status: 'active',
      joinedAt: new Date(),
    })

    return groupId
  }

  const getMyGroups = async (uid: string, isPlatformAdmin: boolean): Promise<Group[]> => {
    if (isPlatformAdmin) {
      const q = query(collection($firestore, 'groups'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group)
    }

    // Get groups where user is a member
    const memberQuery = query(
      collection($firestore, 'groupMembers'),
      where('uid', '==', uid),
      where('status', '==', 'active'),
    )
    const memberSnap = await getDocs(memberQuery)
    const groupIds = memberSnap.docs.map((d) => d.data().groupId)

    if (groupIds.length === 0) return []

    const groups: Group[] = []
    for (const gid of groupIds) {
      const groupDoc = await getDoc(doc($firestore, 'groups', gid))
      if (groupDoc.exists()) {
        groups.push({ id: groupDoc.id, ...groupDoc.data() } as Group)
      }
    }
    return groups
  }

  const getGroup = async (groupId: string): Promise<Group | null> => {
    const docSnap = await getDoc(doc($firestore, 'groups', groupId))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Group
    }
    return null
  }

  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const q = query(
      collection($firestore, 'groupMembers'),
      where('groupId', '==', groupId),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMember)
  }

  const getGroupInvitations = async (groupId: string): Promise<Invitation[]> => {
    const q = query(
      collection($firestore, 'groupMembers'),
      where('groupId', '==', groupId),
    )
    // Actually query invitations collection
    const invQ = query(
      collection($firestore, 'invitations'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(invQ)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invitation)
  }

  const inviteMember = async (
    groupId: string,
    groupName: string,
    email: string,
    role: 'groupAdmin' | 'member',
    invitedBy: string,
    invitedByName: string,
  ) => {
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const invitationId = await addDocument('invitations', {
      groupId,
      groupName,
      email,
      role,
      status: 'pending',
      emailSent: false,
      emailError: null,
      invitedBy,
      invitedByName,
      token,
      expiresAt,
    })

    return invitationId
  }

  const resendInvitation = async (invitationId: string) => {
    await updateDocument('invitations', invitationId, {
      emailSent: false,
      emailError: null,
      status: 'pending',
    })
  }

  const suspendMember = async (memberId: string) => {
    await updateDocument('groupMembers', memberId, { status: 'suspended' })
  }

  const reactivateMember = async (memberId: string) => {
    await updateDocument('groupMembers', memberId, { status: 'active' })
  }

  const isGroupAdmin = async (groupId: string, uid: string): Promise<boolean> => {
    const q = query(
      collection($firestore, 'groupMembers'),
      where('groupId', '==', groupId),
      where('uid', '==', uid),
      where('role', '==', 'groupAdmin'),
    )
    const snap = await getDocs(q)
    return !snap.empty
  }

  return {
    createGroup,
    getMyGroups,
    getGroup,
    getGroupMembers,
    getGroupInvitations,
    inviteMember,
    resendInvitation,
    suspendMember,
    reactivateMember,
    isGroupAdmin,
  }
}
