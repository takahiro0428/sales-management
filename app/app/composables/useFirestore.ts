import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore'

export const useFirestore = () => {
  const { $firestore } = useNuxtApp()

  const addDocument = async (collectionPath: string, data: DocumentData) => {
    const colRef = collection($firestore, collectionPath)
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }

  const updateDocument = async (collectionPath: string, docId: string, data: DocumentData) => {
    const docRef = doc($firestore, collectionPath, docId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  const deleteDocument = async (collectionPath: string, docId: string) => {
    const docRef = doc($firestore, collectionPath, docId)
    await deleteDoc(docRef)
  }

  const getDocument = async <T = DocumentData>(collectionPath: string, docId: string): Promise<(T & { id: string }) | null> => {
    const docRef = doc($firestore, collectionPath, docId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T & { id: string }
    }
    return null
  }

  const queryDocuments = async <T = DocumentData>(
    collectionPath: string,
    ...constraints: QueryConstraint[]
  ): Promise<(T & { id: string })[]> => {
    const colRef = collection($firestore, collectionPath)
    const q = query(colRef, ...constraints)
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string })
  }

  return {
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    queryDocuments,
  }
}
