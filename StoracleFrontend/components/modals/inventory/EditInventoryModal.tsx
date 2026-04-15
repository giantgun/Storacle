'use client'

import { useState } from 'react'
import BaseModal from '../BaseModal'
import InventoryFormStep1 from '@/components/forms/inventory/InventoryFormStep1'
import InventoryFormStep2 from '@/components/forms/inventory/InventoryFormStep2'
import InventoryFormStep3 from '@/components/forms/inventory/InventoryFormStep3'

interface InventoryItem {
  id: number
  name: string
  unit_name: string
  unit_sales_price_in_usdt: number
  quantity: number
  inventory_capacity: number
  critical_order_level: number
  minimum_bulk_quantity: number
  expected_purchase_price_in_usdt: number
  supplier_lead_time_days: number
  supplier_id: string
}

interface Supplier {
  id: string
  name: string
  email: string
  non_custodial_wallet_address: string
}

interface EditInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onSubmit: (data: any) => Promise<void>
  suppliers: Supplier[]
  loading?: boolean
}

export default function EditInventoryModal({
  isOpen,
  onClose,
  item,
  onSubmit,
  suppliers,
  loading = false,
}: EditInventoryModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(
    item ? {
      name: item.name || '',
      unit_name: item.unit_name || 'units',
      unit_sales_price_in_usdt: (item.unit_sales_price_in_usdt || 0).toString(),
      quantity: (item.quantity || 0).toString(),
      inventory_capacity: (item.inventory_capacity || 20).toString(),
      critical_order_level: (item.critical_order_level || 5).toString(),
      minimum_bulk_quantity: (item.minimum_bulk_quantity || 1).toString(),
      expected_purchase_price_in_usdt: (item.expected_purchase_price_in_usdt || 0).toString(),
      supplier_lead_time_days: (item.supplier_lead_time_days || 0).toString(),
      supplier_id: item.supplier_id || '',
    } : {
      name: '',
      unit_name: '',
      unit_sales_price_in_usdt: '',
      quantity: '',
      inventory_capacity: '',
      critical_order_level: '',
      minimum_bulk_quantity: '',
      expected_purchase_price_in_usdt: '',
      supplier_lead_time_days: '',
      supplier_id: '',
    }
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.inventory_capacity || !formData.critical_order_level) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepTitles = ['Basic Information', 'Pricing & Thresholds', 'Supplier Details']
  const isLoading = loading || isSubmitting

  return (
    <BaseModal
      isOpen={isOpen}
      title={`Edit Item - Step ${step} of 3`}
      onClose={handleClose}
      actions={
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-border text-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      }
    >
      <div className="mb-4">
        <div className="flex gap-2 mb-3">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>
        <h3 className="font-bold text-foreground">{stepTitles[step - 1]}</h3>
      </div>

      {step === 1 && (
        <InventoryFormStep1
          formData={formData}
          onChange={data => setFormData({ ...formData, ...data })}
        />
      )}
      {step === 2 && (
        <InventoryFormStep2
          formData={formData}
          onChange={data => setFormData({ ...formData, ...data })}
        />
      )}
      {step === 3 && (
        <InventoryFormStep3
          formData={formData}
          suppliers={suppliers}
          onChange={data => setFormData({ ...formData, ...data })}
        />
      )}
    </BaseModal>
  )
}
