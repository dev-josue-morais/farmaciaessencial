export type ProductStatus = 'active' | 'inactive'

export interface Category {
  id: string
  name: string
  slug: string
  active: boolean
  sortOrder: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  promotionalPrice?: number
  categoryId: string
  code: string
  stock: number
  imageUrl: string
  gallery: string[]
  status: ProductStatus
  featured: boolean
  requiresPrescription: boolean
  controlled: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export type OrderStatus =
  | 'waiting_payment'
  | 'payment_approved'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
