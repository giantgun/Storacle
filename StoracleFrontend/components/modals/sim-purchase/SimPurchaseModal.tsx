'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import BaseModal from '../BaseModal'
import type { ServerInventoryItem } from '@/lib/types/sse-events'
import { simulatePurchase } from '@/lib/actions/simulate'

interface SimPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  inventoryItems: ServerInventoryItem[]
}

export default function SimPurchaseModal({ isOpen, onClose, inventoryItems }: SimPurchaseModalProps) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedItem = inventoryItems.find(i => i.id === selectedItemId)
  const amount = selectedItem ? selectedItem.unit_sales_price_in_usdt * (parseInt(quantity) || 0) : 0

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error('Please select an inventory item')
      return
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error('Quantity must be a positive number')
      return
    }
    if (selectedItem && parseInt(quantity) > selectedItem.quantity) {
      toast.error('Quantity exceeds available stock')
      return
    }

    setSubmitting(true)
    try {
      await simulatePurchase(selectedItemId, parseInt(quantity))
      toast.success(`Simulated sale of ${quantity} ${selectedItem?.name} for $${amount.toLocaleString()}`)
      setSelectedItemId('')
      setQuantity('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to simulate purchase')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      title="Simulate Purchase"
      onClose={onClose}
      actions={
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting ? 'Processing...' : 'Simulate Purchase'}
        </button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Simulate a customer purchase to test the procurement pipeline.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Item</label>
          <select
            value={selectedItemId}
            onChange={(e) => { setSelectedItemId(e.target.value); setQuantity('') }}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select an item...</option>
            {inventoryItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} — ${item.unit_sales_price_in_usdt}/unit ({item.quantity} in stock)
              </option>
            ))}
          </select>
        </div>

        {selectedItem && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Quantity Sold</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              max={selectedItem.quantity}
              placeholder={`Max ${selectedItem.quantity}`}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {amount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Simulated sale amount</p>
            <p className="text-lg font-bold text-primary">${amount.toLocaleString()}</p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}
