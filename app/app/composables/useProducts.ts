import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'

export interface Product {
  id: string
  groupId: string
  name: string
  price: number
  ownerUid: string
  ownerName: string
  imageUrl: string | null
  thumbnailUrl: string | null
  stock: number
  createdAt: any
  updatedAt: any
}

export const useProducts = () => {
  const { $firestore, $firebaseStorage } = useNuxtApp()
  const { addDocument, updateDocument, deleteDocument, getDocument } = useFirestore()

  const uploadProductImage = async (groupId: string, productId: string, file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> => {
    // Upload original
    const originalRef = storageRef($firebaseStorage, `groups/${groupId}/products/${productId}/original_${file.name}`)
    await uploadBytes(originalRef, file)
    const imageUrl = await getDownloadURL(originalRef)

    // Create and upload thumbnail (compressed via canvas)
    const thumbnailBlob = await createThumbnail(file, 300)
    const thumbRef = storageRef($firebaseStorage, `groups/${groupId}/products/${productId}/thumb_${file.name}`)
    await uploadBytes(thumbRef, thumbnailBlob)
    const thumbnailUrl = await getDownloadURL(thumbRef)

    return { imageUrl, thumbnailUrl }
  }

  const createThumbnail = (file: File, maxSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = () => {
        let { width, height } = img
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create thumbnail'))
          },
          'image/jpeg',
          0.7,
        )
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const createProduct = async (
    groupId: string,
    name: string,
    price: number,
    ownerUid: string,
    ownerName: string,
    initialStock: number,
    imageFile?: File | null,
  ) => {
    const productId = await addDocument('products', {
      groupId,
      name,
      price,
      ownerUid,
      ownerName,
      imageUrl: null,
      thumbnailUrl: null,
      stock: initialStock,
    })

    if (imageFile) {
      const { imageUrl, thumbnailUrl } = await uploadProductImage(groupId, productId, imageFile)
      await updateDocument('products', productId, { imageUrl, thumbnailUrl })
    }

    return productId
  }

  const getGroupProducts = async (groupId: string): Promise<Product[]> => {
    const q = query(
      collection($firestore, 'products'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
  }

  const getUserProducts = async (groupId: string, uid: string): Promise<Product[]> => {
    const q = query(
      collection($firestore, 'products'),
      where('groupId', '==', groupId),
      where('ownerUid', '==', uid),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
  }

  const updateProduct = async (productId: string, data: Partial<Product>, imageFile?: File | null) => {
    if (imageFile && data.groupId) {
      const { imageUrl, thumbnailUrl } = await uploadProductImage(data.groupId, productId, imageFile)
      data.imageUrl = imageUrl
      data.thumbnailUrl = thumbnailUrl
    }
    const { id, ...updateData } = data as any
    await updateDocument('products', productId, updateData)
  }

  const updateStock = async (productId: string, newStock: number) => {
    await updateDocument('products', productId, { stock: newStock })
  }

  const getProduct = async (productId: string): Promise<Product | null> => {
    return getDocument<Product>('products', productId)
  }

  return {
    createProduct,
    getGroupProducts,
    getUserProducts,
    updateProduct,
    updateStock,
    getProduct,
    deleteProduct: (id: string) => deleteDocument('products', id),
  }
}
