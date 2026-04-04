import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: 'platformAdmin' | 'groupAdmin' | 'user'
  createdAt: any
  updatedAt: any
}

// Plain object representation of Firebase User to avoid reactivity issues
interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
}

const toPlainUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
})

// Module-scoped (client-only) variable for auth listener — not in useState
// because functions are not serializable for SSR hydration
let _authUnsubscribe: (() => void) | null = null

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp()
  const currentUser = useState<AuthUser | null>('currentUser', () => null)
  const userProfile = useState<UserProfile | null>('userProfile', () => null)
  const authReady = useState('authReady', () => false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const isPlatformAdmin = computed(() => userProfile.value?.role === 'platformAdmin')

  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc($firestore, 'users', uid)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile
    }
    return null
  }

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword($firebaseAuth, email, password)
    currentUser.value = toPlainUser(credential.user)
    userProfile.value = await fetchUserProfile(credential.user.uid)
  }

  const register = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword($firebaseAuth, email, password)
    await updateProfile(credential.user, { displayName })

    // Atomically create user doc and check first-user status in one transaction.
    // If this is the first user (platformConfig/init doesn't exist), assign platformAdmin
    // and create the sentinel. Both operations are atomic.
    let assignedRole: 'platformAdmin' | 'user' = 'user'

    await runTransaction($firestore, async (transaction) => {
      const configRef = doc($firestore, 'platformConfig', 'init')
      const configSnap = await transaction.get(configRef)

      if (!configSnap.exists()) {
        // First user — claim platformAdmin atomically
        assignedRole = 'platformAdmin'
        transaction.set(configRef, {
          initializedBy: credential.user.uid,
          initializedAt: serverTimestamp(),
        })
      } else {
        assignedRole = 'user'
      }

      // Create user doc inside the same transaction for atomicity
      const userRef = doc($firestore, 'users', credential.user.uid)
      transaction.set(userRef, {
        uid: credential.user.uid,
        email: credential.user.email!,
        displayName,
        role: assignedRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    currentUser.value = toPlainUser(credential.user)
    userProfile.value = {
      uid: credential.user.uid,
      email: credential.user.email!,
      displayName,
      role: assignedRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  const logout = async () => {
    if (_authUnsubscribe) {
      _authUnsubscribe()
      _authUnsubscribe = null
    }
    await signOut($firebaseAuth)
    currentUser.value = null
    userProfile.value = null
    authReady.value = false
    navigateTo('/login')
  }

  const initAuth = () => {
    return new Promise<void>((resolve) => {
      // Guard: if already initialized or listener already running, resolve immediately
      if (authReady.value || _authUnsubscribe) {
        resolve()
        return
      }

      // Keep the subscription alive to detect session changes
      _authUnsubscribe = onAuthStateChanged($firebaseAuth, async (user) => {
        if (user) {
          currentUser.value = toPlainUser(user)
          userProfile.value = await fetchUserProfile(user.uid)
        } else {
          currentUser.value = null
          userProfile.value = null
        }

        if (!authReady.value) {
          authReady.value = true
          resolve()
        }
      })
    })
  }

  return {
    currentUser,
    userProfile,
    isAuthenticated,
    isPlatformAdmin,
    authReady,
    login,
    register,
    logout,
    initAuth,
    fetchUserProfile,
  }
}
