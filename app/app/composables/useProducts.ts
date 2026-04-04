import {
  collection,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  runTransaction,
  serverTimestamp,
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
  description: string
  price: number
  ownerUid: string
  ownerName: string
  imageUrl: string | null
  thumbnailUrl: string | null
  stock: number
  category: string
  tags: string[]
  createdAt: any
  updatedAt: any
}

export const PRODUCT_CATEGORIES = [
  'アクセサリー',
  '衣類',
  'バッグ・財布',
  '雑貨・インテリア',
  '食品',
  'おもちゃ・ホビー',
  '本・文具',
  'ハンドメイド',
  'ビューティー',
  'その他',
] as const

const THUMBNAIL_MAX_SIZE = 300
const THUMBNAIL_QUALITY = 0.7

export const useProducts = () => {
  const { $firestore, $firebaseStorage } = useNuxtApp()
  const { addDocument, updateDocument, deleteDocument, getDocument } = useFirestore()

  const uploadProductImage = async (groupId: string, productId: string, file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> => {
    // Upload original
    const originalRef = storageRef($firebaseStorage, `groups/${groupId}/products/${productId}/original_${file.name}`)
    await uploadBytes(originalRef, file)
    const imageUrl = await getDownloadURL(originalRef)

    // Create and upload thumbnail (compressed via canvas)
    const thumbnailBlob = await createThumbnail(file, THUMBNAIL_MAX_SIZE)
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
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        // Revoke object URL to prevent memory leak
        URL.revokeObjectURL(objectUrl)

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
          THUMBNAIL_QUALITY,
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to load image'))
      }
      img.src = objectUrl
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
    description?: string,
    category?: string,
    tags?: string[],
  ) => {
    const productId = await addDocument('products', {
      groupId,
      name,
      description: description || '',
      price,
      ownerUid,
      ownerName,
      imageUrl: null,
      thumbnailUrl: null,
      stock: initialStock,
      category: category || 'その他',
      tags: tags || [],
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
    return snap.docs.map((d) => ({
      id: d.id,
      description: '',
      category: 'その他',
      tags: [],
      ...d.data(),
    }) as Product)
  }

  const getUserProducts = async (groupId: string, uid: string): Promise<Product[]> => {
    const q = query(
      collection($firestore, 'products'),
      where('groupId', '==', groupId),
      where('ownerUid', '==', uid),
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

  const updateProduct = async (productId: string, data: Partial<Product>, imageFile?: File | null) => {
    if (imageFile && data.groupId) {
      const { imageUrl, thumbnailUrl } = await uploadProductImage(data.groupId, productId, imageFile)
      data.imageUrl = imageUrl
      data.thumbnailUrl = thumbnailUrl
    }
    const { id, ...updateData } = data as any
    await updateDocument('products', productId, updateData)
  }

  // Use transaction to prevent race conditions on stock updates
  const updateStock = async (productId: string, newStock: number) => {
    const productRef = doc($firestore, 'products', productId)
    await runTransaction($firestore, async (transaction) => {
      const snap = await transaction.get(productRef)
      if (!snap.exists()) throw new Error('商品が見つかりません')
      transaction.update(productRef, {
        stock: newStock,
        updatedAt: serverTimestamp(),
      })
    })
  }

  // Atomic stock adjustment using transaction (read-then-write)
  const adjustStock = async (productId: string, delta: number) => {
    const productRef = doc($firestore, 'products', productId)
    let resultStock = 0
    await runTransaction($firestore, async (transaction) => {
      const snap = await transaction.get(productRef)
      if (!snap.exists()) throw new Error('商品が見つかりません')
      const currentStock = snap.data().stock || 0
      resultStock = Math.max(0, currentStock + delta)
      transaction.update(productRef, {
        stock: resultStock,
        updatedAt: serverTimestamp(),
      })
    })
    return resultStock
  }

  const getProduct = async (productId: string): Promise<Product | null> => {
    const raw = await getDocument<Product>('products', productId)
    if (!raw) return null
    return {
      description: '',
      category: 'その他',
      tags: [],
      ...raw,
    }
  }

  return {
    createProduct,
    getGroupProducts,
    getUserProducts,
    updateProduct,
    updateStock,
    adjustStock,
    getProduct,
    deleteProduct: (id: string) => deleteDocument('products', id),
  }
}
