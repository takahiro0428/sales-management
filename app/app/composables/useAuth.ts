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
  setDoc,
  collection,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: 'platformAdmin' | 'groupAdmin' | 'user'
  createdAt: any
  updatedAt: any
}

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp()
  const currentUser = useState<User | null>('currentUser', () => null)
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
    currentUser.value = credential.user
    userProfile.value = await fetchUserProfile(credential.user.uid)
  }

  const register = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword($firebaseAuth, email, password)
    await updateProfile(credential.user, { displayName })

    // Check if this is the first user
    const usersCol = collection($firestore, 'users')
    const countSnap = await getCountFromServer(usersCol)
    const isFirstUser = countSnap.data().count === 0

    const profile: UserProfile = {
      uid: credential.user.uid,
      email: credential.user.email!,
      displayName,
      role: isFirstUser ? 'platformAdmin' : 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(doc($firestore, 'users', credential.user.uid), profile)
    currentUser.value = credential.user
    userProfile.value = { ...profile, createdAt: new Date(), updatedAt: new Date() }
  }

  const logout = async () => {
    await signOut($firebaseAuth)
    currentUser.value = null
    userProfile.value = null
    navigateTo('/login')
  }

  const initAuth = () => {
    return new Promise<void>((resolve) => {
      if (authReady.value) {
        resolve()
        return
      }
      const unsubscribe = onAuthStateChanged($firebaseAuth, async (user) => {
        currentUser.value = user
        if (user) {
          userProfile.value = await fetchUserProfile(user.uid)
        } else {
          userProfile.value = null
        }
        authReady.value = true
        unsubscribe()
        resolve()
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
