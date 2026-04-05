import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

export interface SaleItem {
  productId: string
  productName: string
  ownerUid: string
  ownerName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  groupId: string
  items: SaleItem[]
  totalAmount: number
  isBundle: boolean
  note: string
  createdBy: string
  createdByName: string
  createdAt: any
  updatedAt: any
}

export interface SaleSummary {
  totalSales: number
  totalAmount: number
  byOwner: Record<string, { name: string; sales: number; amount: number }>
  byProduct: Record<string, { name: string; quantity: number; amount: number }>
}

/**
 * Distribute a bundle total amount proportionally across sale items
 * based on each item's (unitPrice × quantity) weight.
 */
export const distributeBundleAmount = (items: SaleItem[], total: number): SaleItem[] => {
  const rawSum = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  return items.map((item, idx, arr) => {
    let subtotal: number
    if (rawSum === 0) {
      // Equal distribution when all original prices are 0
      const share = Math.round(total / arr.length)
      subtotal = idx === arr.length - 1
        ? total - share * (arr.length - 1)
        : share
    } else if (idx === arr.length - 1) {
      // Last item absorbs rounding difference
      subtotal = total - arr.slice(0, -1).reduce((s, it) => {
        return s + Math.round((it.unitPrice * it.quantity / rawSum) * total)
      }, 0)
    } else {
      subtotal = Math.round((item.unitPrice * item.quantity / rawSum) * total)
    }
    return {
      ...item,
      unitPrice: Math.round(subtotal / (item.quantity || 1)),
      subtotal,
    }
  })
}

export const useSales = () => {
  const { $firestore } = useNuxtApp()
  const { getDocument } = useFirestore()

  const createSale = async (
    groupId: string,
    items: SaleItem[],
    note: string,
    createdBy: string,
    createdByName: string,
    isBundle: boolean = false,
  ) => {
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

    // Use transaction to atomically create sale and update stock
    const saleRef = doc(collection($firestore, 'sales'))

    await runTransaction($firestore, async (transaction) => {
      // Verify and update stock for each item
      for (const item of items) {
        const productRef = doc($firestore, 'products', item.productId)
        const productSnap = await transaction.get(productRef)
        if (!productSnap.exists()) {
          throw new Error(`商品が見つかりません: ${item.productName}`)
        }
        const currentStock = productSnap.data().stock || 0
        if (currentStock < item.quantity) {
          throw new Error(`在庫不足: ${item.productName} (残り${currentStock}個)`)
        }
        transaction.update(productRef, {
          stock: currentStock - item.quantity,
          updatedAt: serverTimestamp(),
        })
      }

      // Create sale document
      transaction.set(saleRef, {
        groupId,
        items,
        totalAmount,
        isBundle,
        note,
        createdBy,
        createdByName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    return saleRef.id
  }

  const updateSale = async (
    saleId: string,
    oldItems: SaleItem[],
    newItems: SaleItem[],
    note: string,
    isBundle: boolean = false,
  ) => {
    const saleRef = doc($firestore, 'sales', saleId)
    const newTotalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0)

    // Compute net stock delta per product in a single pass
    const stockDelta = new Map<string, { delta: number; name: string }>()
    for (const item of oldItems) {
      const entry = stockDelta.get(item.productId) || { delta: 0, name: item.productName }
      entry.delta += item.quantity // restore old
      stockDelta.set(item.productId, entry)
    }
    for (const item of newItems) {
      const entry = stockDelta.get(item.productId) || { delta: 0, name: item.productName }
      entry.delta -= item.quantity // deduct new
      stockDelta.set(item.productId, entry)
    }

    await runTransaction($firestore, async (transaction) => {
      // Verify sale still exists
      const saleSnap = await transaction.get(saleRef)
      if (!saleSnap.exists()) {
        throw new Error('売上データが見つかりません（削除された可能性があります）')
      }

      // Apply net stock changes per product in one update each
      for (const [productId, { delta, name }] of stockDelta) {
        const productRef = doc($firestore, 'products', productId)
        const productSnap = await transaction.get(productRef)
        if (!productSnap.exists()) {
          throw new Error(`商品が見つかりません: ${name}`)
        }
        const currentStock = productSnap.data().stock || 0
        const newStock = currentStock + delta
        if (newStock < 0) {
          throw new Error(`在庫不足: ${name} (残り${currentStock}個)`)
        }
        transaction.update(productRef, {
          stock: newStock,
          updatedAt: serverTimestamp(),
        })
      }

      transaction.update(saleRef, {
        items: newItems,
        totalAmount: newTotalAmount,
        isBundle,
        note,
        updatedAt: serverTimestamp(),
      })
    })
  }

  const deleteSale = async (saleId: string, items: SaleItem[]) => {
    const saleRef = doc($firestore, 'sales', saleId)

    await runTransaction($firestore, async (transaction) => {
      // Verify sale still exists to lock the document
      const saleSnap = await transaction.get(saleRef)
      if (!saleSnap.exists()) {
        throw new Error('売上データが見つかりません（既に削除された可能性があります）')
      }

      // Restore stock for all items
      for (const item of items) {
        const productRef = doc($firestore, 'products', item.productId)
        const productSnap = await transaction.get(productRef)
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0
          transaction.update(productRef, {
            stock: currentStock + item.quantity,
            updatedAt: serverTimestamp(),
          })
        }
      }
      transaction.delete(saleRef)
    })
  }

  const getGroupSales = async (groupId: string): Promise<Sale[]> => {
    const q = query(
      collection($firestore, 'sales'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, isBundle: false, ...d.data() }) as Sale)
  }

  const getSale = async (saleId: string): Promise<Sale | null> => {
    const raw = await getDocument<Sale>('sales', saleId)
    if (!raw) return null
    return { isBundle: false, ...raw }
  }

  const getSalesSummary = (sales: Sale[]): SaleSummary => {
    const summary: SaleSummary = {
      totalSales: sales.length,
      totalAmount: 0,
      byOwner: {},
      byProduct: {},
    }

    for (const sale of sales) {
      summary.totalAmount += sale.totalAmount
      for (const item of sale.items) {
        // By owner
        if (!summary.byOwner[item.ownerUid]) {
          summary.byOwner[item.ownerUid] = { name: item.ownerName, sales: 0, amount: 0 }
        }
        summary.byOwner[item.ownerUid].sales += item.quantity
        summary.byOwner[item.ownerUid].amount += item.subtotal

        // By product
        if (!summary.byProduct[item.productId]) {
          summary.byProduct[item.productId] = { name: item.productName, quantity: 0, amount: 0 }
        }
        summary.byProduct[item.productId].quantity += item.quantity
        summary.byProduct[item.productId].amount += item.subtotal
      }
    }

    return summary
  }

  const getUserSales = (sales: Sale[], uid: string): Sale[] => {
    return sales.filter((sale) =>
      sale.items.some((item) => item.ownerUid === uid),
    )
  }

  const getUserSalesSummary = (sales: Sale[], uid: string): { totalQuantity: number; totalAmount: number; items: SaleItem[] } => {
    const userItems: SaleItem[] = []
    for (const sale of sales) {
      for (const item of sale.items) {
        if (item.ownerUid === uid) {
          userItems.push(item)
        }
      }
    }
    return {
      totalQuantity: userItems.reduce((s, i) => s + i.quantity, 0),
      totalAmount: userItems.reduce((s, i) => s + i.subtotal, 0),
      items: userItems,
    }
  }

  return {
    createSale,
    updateSale,
    deleteSale,
    getGroupSales,
    getSale,
    getSalesSummary,
    getUserSales,
    getUserSalesSummary,
  }
}
