'use client'

import { useState } from 'react'
import type { ServerSupplier } from '@/lib/types/sse-events'
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/actions/suppliers'
import { toast } from 'sonner'

interface SuppliersManagementProps {
  suppliers: ServerSupplier[]
  onSuppliersChange: (suppliers: ServerSupplier[]) => void
}

export default function SuppliersManagement({ suppliers, onSuppliersChange }: SuppliersManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    usdtWalletAddress: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.email || !formData.usdtWalletAddress) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await createSupplier({
        supplierEmail: formData.email,
        supplierName: formData.name,
        supplierWallet: formData.usdtWalletAddress,
      })

      if (response.success && response.data) {
        onSuppliersChange([...suppliers, response.data])
        setFormData({ name: '', email: '', usdtWalletAddress: '' })
        setShowAddModal(false)
      }
    } catch (err) {
      console.error('Failed to add supplier:', err)
      alert('Failed to add supplier')
    } finally {
      setLoading(false)
      setShowAddModal(false)
    }
  }

  const handleEdit = (supplier: ServerSupplier) => {
    setEditingId(supplier.id)
    setFormData({
      name: supplier.name,
      email: supplier.email,
      usdtWalletAddress: supplier.non_custodial_wallet_address,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !formData.name || !formData.email || !formData.usdtWalletAddress) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await updateSupplier(
        formData.name,
        formData.email,
        formData.usdtWalletAddress,
        editingId,
      )

      if (response.success && response.data) {
        onSuppliersChange(suppliers.map(s => (s.id === editingId ? response.data! : s)))
        setEditingId(null)
        setShowEditModal(false)
        setFormData({ name: '', email: '', usdtWalletAddress: '' })
      }
    } catch (err) {
      console.error('Failed to update supplier:', err)
      alert('Failed to update supplier')
    } finally {
      setLoading(false)
    }
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Suppliers</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90"
        >
          Add Supplier
        </button>
      </div>

      {/* Suppliers List */}
      <div className="space-y-2">
        {suppliers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No suppliers added yet
          </div>
        ) : (
          suppliers.map(supplier => (
            <div key={supplier.id} className="bg-card border border-border rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-foreground">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{supplier.email}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3 break-all">{supplier.non_custodial_wallet_address}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(supplier)}
                  className="flex-1 px-3 py-2 bg-primary/20 text-primary text-xs font-medium rounded hover:bg-primary/30"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="flex-1 px-3 py-2 bg-destructive/20 text-destructive text-xs font-medium rounded hover:bg-destructive/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-40">
          <div className="w-full bg-card border-t border-border rounded-t-lg p-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
            <h3 className="font-bold text-foreground mb-4">Add Supplier</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="add-supplier-name" className="block text-sm font-medium text-foreground mb-1">
                  Supplier Name *
                </label>
                <input
                  id="add-supplier-name"
                  type="text"
                  name="name"
                  placeholder="e.g., Global Parts Co."
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="add-supplier-email" className="block text-sm font-medium text-foreground mb-1">
                  Email *
                </label>
                <input
                  id="add-supplier-email"
                  type="email"
                  name="email"
                  placeholder="supplier@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="add-supplier-wallet" className="block text-sm font-medium text-foreground mb-1">
                  USDT Wallet Address *
                </label>
                <input
                  id="add-supplier-wallet"
                  type="text"
                  name="usdtWalletAddress"
                  placeholder="0x..."
                  value={formData.usdtWalletAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 sticky bottom-0 bg-card pt-3">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Supplier'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ name: '', email: '', usdtWalletAddress: '' })
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-destructive/20 text-destructive text-sm font-medium rounded hover:bg-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-40">
          <div className="w-full bg-card border-t border-border rounded-t-lg p-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
            <h3 className="font-bold text-foreground mb-4">Edit Supplier</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="edit-supplier-name" className="block text-sm font-medium text-foreground mb-1">
                  Supplier Name *
                </label>
                <input
                  id="edit-supplier-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="edit-supplier-email" className="block text-sm font-medium text-foreground mb-1">
                  Email *
                </label>
                <input
                  id="edit-supplier-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="edit-supplier-wallet" className="block text-sm font-medium text-foreground mb-1">
                  USDT Wallet Address *
                </label>
                <input
                  id="edit-supplier-wallet"
                  type="text"
                  name="usdtWalletAddress"
                  value={formData.usdtWalletAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-2 mt-6 sticky bottom-0 bg-card pt-3">
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingId(null)
                  setFormData({ name: '', email: '', usdtWalletAddress: '' })
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-destructive/20 text-destructive text-sm font-medium rounded hover:bg-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
