// User and Auth Types
export interface User {
  id: string
  firstName: string
  lastName: string
  businessName: string
  email: string
  createdAt: number
  updatedAt: number
  version: number
  synced: boolean
}

// Inventory Types
export interface InventoryItem {
  id: number
  supplier_lead_time_days: number
  supplier_id: string
  userId?: string
  name: string
  unit_name: string
  unit_sales_price_in_usdt: number
  expected_purchase_price_in_usdt: number
  quantity: number
  inventory_capacity: number
  critical_order_level: number
  minimum_bulk_quantity: number
  createdAt: number
  updatedAt: number
  version: number
  synced: boolean
}

// Supplier Types
export interface Supplier {
  id: string
  userId?: string
  name: string
  email: string
  non_custodial_wallet_address: string
  createdAt: number
  updatedAt: number
  version: number
  synced: boolean
}

// Treasury/Balance Types
export interface Balance {
  userId?: string
  NGN: number
  USDT: number
  XAUT: number
  updatedAt: number
  version: number
  synced: boolean
}

// Notification Types
export interface Notification {
  id: string
  userId?: string
  type: 'alert' | 'success' | 'info'
  message: string
  read: boolean
  createdAt: number
  updatedAt: number
  version: number
  synced: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface AuthResponse {
  user: User
  accessToken?: string
}

export interface InventoryResponse {
  items: InventoryItem[]
  total: number
}

export interface SuppliersResponse {
  suppliers: Supplier[]
  total: number
}
