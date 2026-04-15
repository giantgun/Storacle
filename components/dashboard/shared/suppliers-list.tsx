'use client'

import { useState } from 'react'
import type { ServerSupplier } from '@/lib/types/sse-events'
import { deleteSupplier } from '@/lib/actions/suppliers'
import SupplierModal from '@/components/modals/suppliers/SupplierModal'

interface SuppliersListProps {
  suppliers: ServerSupplier[]
  onSuppliersChange: (suppliers: ServerSupplier[]) => void
  onAddSupplier?: () => void
}

export default function SuppliersList({
  suppliers,
  onSuppliersChange,
  onAddSupplier,
}: SuppliersListProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const editingSupplier = suppliers.find(s => s.id === editingId) || null

  const handleEdit = (supplier: ServerSupplier) => {
    setEditingId(supplier.id)
    setShowEditModal(true)
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    setLoading(true)
    try {
      const response = await deleteSupplier(supplierId)
      if (response.success) {
        onSuppliersChange(suppliers.filter(s => s.id !== supplierId))
      }
    } catch (err) {
      console.error('Failed to delete supplier:', err)
      alert('Failed to delete supplier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Suppliers</h2>
          <p className="text-sm text-muted-foreground mt-1">{suppliers.length} suppliers</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowAddModal(true)
            onAddSupplier?.()
          }}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          + Add Supplier
        </button>
      </div>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div className="py-16 text-center bg-background/50 border border-border rounded-xl">
          <p className="text-muted-foreground text-base">No suppliers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first supplier to manage partnerships</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-sm">
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-base">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{supplier.email}</p>
                    </div>
                    <span className="text-xl">🏢</span>
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Wallet Address</p>
                  <p className="text-xs font-mono text-foreground break-all">{supplier.non_custodial_wallet_address}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 px-3 py-2.5 bg-primary/20 text-primary text-xs font-semibold rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    disabled={loading}
                    className="flex-1 px-3 py-2.5 bg-destructive/20 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/30 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
          }
        </div>)}

      {/* Add Modal */}
      <SupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          const { createSupplier } = await import('@/lib/actions/suppliers')
          const response = await createSupplier({supplierEmail: data.email, supplierName: data.name, supplierWallet: data.non_custodial_wallet_address})
          if (response.success && response.data) {
            onSuppliersChange([...suppliers, response.data])
            setShowAddModal(false)
          } else {
            alert('Failed to add supplier')
          }
        }}
        loading={loading}
      />

      {/* Edit Modal */}
      <SupplierModal
        isOpen={showEditModal}
        isEditMode
        onClose={() => {
          setShowEditModal(false)
          setEditingId(null)
        }}
        onSubmit={async (data) => {
          if (!editingId) return
          const { updateSupplier } = await import('@/lib/actions/suppliers')
          const response = await updateSupplier(data.name, data.email, data.non_custodial_wallet_address, editingId)
          if (response.success && response.data) {
            onSuppliersChange(suppliers.map(s => s.id === editingId ? response.data! : s))
            setShowEditModal(false)
            setEditingId(null)
          } else {
            alert('Failed to update supplier')
          }
        }}
        loading={loading}
      />
    </div>
  )
}
