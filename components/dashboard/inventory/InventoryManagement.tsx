'use client'

import { useState } from 'react'
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/lib/actions/inventory'
import type { ServerInventoryItem } from '@/lib/types/sse-events'
import type { ServerSupplier } from '@/lib/types/sse-events'
import AddInventoryModal from '@/components/modals/inventory/AddInventoryModal'
import EditInventoryModal from '@/components/modals/inventory/EditInventoryModal'
import SupplierModal from '@/components/modals/suppliers/SupplierModal'
import SuppliersList from '@/components/dashboard/shared/suppliers-list'

interface InventoryManagementProps {
  inventoryItems: ServerInventoryItem[]
  onInventoryChange: (items: ServerInventoryItem[]) => void
  suppliers: ServerSupplier[]
  onSuppliersChange: (suppliers: ServerSupplier[]) => void
}

export default function InventoryManagement({
  inventoryItems,
  onInventoryChange,
  suppliers,
  onSuppliersChange
}: InventoryManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ServerInventoryItem | any | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers'>('items')
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<ServerSupplier | null>(null)

  const handleAddItem = async (formData: any) => {
    setLoading(true)
    try {
      const response = await createInventoryItem({
        name: formData.name,
        unit_name: formData.unit_name || 'units',
        unit_sales_price_in_usdt: parseFloat(formData.unit_sales_price_in_usdt) || 0,
        quantity: parseInt(formData.quantity),
        inventory_capacity: parseInt(formData.inventory_capacity),
        critical_order_level: parseInt(formData.critical_order_level),
        minimum_bulk_quantity: parseInt(formData.minimum_bulk_quantity) || 1,
        expected_purchase_price_in_usdt: parseFloat(formData.expected_purchase_price_in_usdt) || 0,
        supplier_lead_time_days: parseFloat(formData.supplier_lead_time_days) || 0,
        supplier_id: formData.supplier_id,
      })

      if (response.success && response.data) {
        onInventoryChange([...inventoryItems, response.data])
      }
    } catch (err) {
      alert('Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  const handleEditItem = async (formData: any) => {
    if (!editingItem) return

    setLoading(true)
    try {
      const response = await updateInventoryItem({
        id: editingItem.id,
        name: formData.name,
        unit_name: formData.unit_name || 'units',
        unit_sales_price_in_usdt: parseFloat(formData.unit_sales_price_in_usdt) || 0,
        quantity: parseInt(formData.quantity),
        inventory_capacity: parseInt(formData.inventory_capacity),
        critical_order_level: parseInt(formData.critical_order_level),
        minimum_bulk_quantity: parseInt(formData.minimum_bulk_quantity) || 1,
        expected_purchase_price_in_usdt: parseFloat(formData.expected_purchase_price_in_usdt) || 0,
        supplier_lead_time_days: parseFloat(formData.supplier_lead_time_days) || 0,
        supplier_id: formData.supplier_id,
      })

      if (response.success && response.data) {
        onInventoryChange(inventoryItems.map(i => (i.id === editingItem.id ? response.data! : i)))
        setEditingItem(null)
      }
    } catch (err) {
      alert('Failed to update item')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setLoading(true)
    try {
      const response = await deleteInventoryItem(itemId)
      if (response.success) {
        onInventoryChange(inventoryItems.filter(i => i.id !== itemId))
      }
    } catch (err) {
      alert('Failed to delete item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground">Manage your stock items and suppliers</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-2 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'items'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Stock Items
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-2 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Suppliers
          </button>
        </div>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Stock Items</h2>
              <p className="text-sm text-muted-foreground mt-1">{inventoryItems.length} items total</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              + Add Item
            </button>
          </div>

          {/* Items Grid */}
          {inventoryItems.length === 0 ? (
            <div className="text-center py-16 bg-background/50 border border-border rounded-xl">
              <p className="text-muted-foreground text-base">No inventory items yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first item to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {inventoryItems.map((item: any) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-sm">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-base">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.unit_name || 'units'}</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 ${item.quantity <= item.critical_order_level ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                      {item.quantity}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Stock Level</span>
                        <span className="text-xs font-semibold text-foreground">{item.quantity} / {item.inventory_capacity}</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 transition-all rounded-full ${item.quantity <= item.critical_order_level ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${Math.min((item.quantity / item.inventory_capacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-background/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Price/Unit</p>
                        <p className="text-sm font-semibold text-foreground mt-1">${(item.unit_sales_price_in_usdt || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Critical</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{item.critical_order_level}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setShowEditModal(true)
                        }}
                        className="flex-1 px-3 py-2.5 bg-primary/20 text-primary text-xs font-semibold rounded-lg hover:bg-primary/30 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-2.5 bg-destructive/20 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/30 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <SuppliersList
          suppliers={suppliers}
          onSuppliersChange={onSuppliersChange}
          onAddSupplier={() => {
            setEditingSupplier(null)
            setShowSupplierModal(true)
          }}
        />
      )}

      {/* Modals */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
        suppliers={suppliers}
        loading={loading}
      />

      <EditInventoryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingItem(null)
        }}
        item={editingItem}
        onSubmit={handleEditItem}
        suppliers={suppliers}
        loading={loading}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        isEditMode={editingSupplier !== null}
        onClose={() => {
          setShowSupplierModal(false)
          setEditingSupplier(null)
        }}
        onSubmit={async (data) => {
          if (editingSupplier) {
            const response = await (await import('@/lib/actions/suppliers')).updateSupplier(
              data.name,
              data.email,
              data.non_custodial_wallet_address,
              editingSupplier.id
            )
            if (response.success && response.data) {
              onSuppliersChange(suppliers.map(s => s.id === editingSupplier.id ? response.data! : s))
            }
          } else {
            const response = await (await import('@/lib/actions/suppliers')).createSupplier({
              supplierEmail: data.email,
              supplierWallet: data.non_custodial_wallet_address,
              supplierName: data.name
            })
            if (response.success && response.data) {
              onSuppliersChange([...suppliers, response.data])
            }
          }
        }}
        loading={loading}
      />
    </div>
  )
}
