import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
} from 'firebase/firestore'
import type { Product } from './useProducts'
import type { Group } from './useGroups'

export const usePublicProducts = () => {
  const config = useRuntimeConfig()

  const getFirestoreInstance = () => {
    const firebaseConfig = {
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId,
    }
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    return getFirestore(app)
  }

  const getPublicProducts = async (groupId: string): Promise<Product[]> => {
    const db = getFirestoreInstance()
    const q = query(
      collection(db, 'products'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      id: d.id,
      description: '',
      category: 'その他',
      tags: [],
      ...d.data(),
    }) as Product)
  }

  const getGroupInfo = async (groupId: string): Promise<Group | null> => {
    const db = getFirestoreInstance()
    const docSnap = await getDoc(doc(db, 'groups', groupId))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Group
    }
    return null
  }

  return { getPublicProducts, getGroupInfo }
}
