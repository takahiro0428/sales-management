import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  orderBy,
  documentId,
  serverTimestamp,
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

const INVITATION_EXPIRY_DAYS = 7
const FIRESTORE_IN_QUERY_LIMIT = 30

/**
 * Generate deterministic groupMember document ID.
 * This must match the format expected by Firestore security rules:
 * isGroupMemberDoc() checks for existence of `groupMembers/{uid}_{groupId}`
 */
const memberDocId = (uid: string, groupId: string) => `${uid}_${groupId}`

export const useGroups = () => {
  const { $firestore } = useNuxtApp()
  const { addDocument, updateDocument, deleteDocument } = useFirestore()

  const createGroup = async (name: string, description: string, creatorUid: string, creatorName: string, creatorEmail: string) => {
    const groupId = await addDocument('groups', { name, description, createdBy: creatorUid })

    // Add creator as group admin with deterministic ID for security rules
    const docId = memberDocId(creatorUid, groupId)
    await setDoc(doc($firestore, 'groupMembers', docId), {
      groupId,
      uid: creatorUid,
      displayName: creatorName,
      email: creatorEmail,
      role: 'groupAdmin',
      status: 'active',
      joinedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return groupId
  }

  const addMemberToGroup = async (
    groupId: string,
    uid: string,
    displayName: string,
    email: string,
    role: 'groupAdmin' | 'member',
  ) => {
    const docId = memberDocId(uid, groupId)
    await setDoc(doc($firestore, 'groupMembers', docId), {
      groupId,
      uid,
      displayName,
      email,
      role,
      status: 'active',
      joinedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docId
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

    // Batch fetch groups using 'in' query (max 30 per query)
    const groups: Group[] = []
    for (let i = 0; i < groupIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = groupIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)
      const batchQuery = query(
        collection($firestore, 'groups'),
        where(documentId(), 'in', batch),
      )
      const batchSnap = await getDocs(batchQuery)
      for (const d of batchSnap.docs) {
        groups.push({ id: d.id, ...d.data() } as Group)
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
      collection($firestore, 'invitations'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
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
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

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

  const cancelInvitation = async (invitationId: string) => {
    await deleteDocument('invitations', invitationId)
  }

  const removeMember = async (memberId: string) => {
    await deleteDocument('groupMembers', memberId)
  }

  const getAllActiveMembers = async (): Promise<GroupMember[]> => {
    const q = query(
      collection($firestore, 'groupMembers'),
      where('status', '==', 'active'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMember)
  }

  const getAllPendingInvitations = async (): Promise<Invitation[]> => {
    const q = query(
      collection($firestore, 'invitations'),
      where('status', '==', 'pending'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invitation)
  }

  const isGroupAdmin = async (groupId: string, uid: string): Promise<boolean> => {
    const docId = memberDocId(uid, groupId)
    const docSnap = await getDoc(doc($firestore, 'groupMembers', docId))
    return docSnap.exists() && docSnap.data()?.role === 'groupAdmin'
  }

  return {
    createGroup,
    addMemberToGroup,
    getMyGroups,
    getGroup,
    getGroupMembers,
    getGroupInvitations,
    getAllActiveMembers,
    getAllPendingInvitations,
    inviteMember,
    resendInvitation,
    suspendMember,
    reactivateMember,
    cancelInvitation,
    removeMember,
    isGroupAdmin,
  }
}
