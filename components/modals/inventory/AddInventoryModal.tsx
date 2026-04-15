'use client'

import { useState } from 'react'
import BaseModal from '../BaseModal'
import InventoryFormStep1 from '@/components/forms/inventory/InventoryFormStep1'
import InventoryFormStep2 from '@/components/forms/inventory/InventoryFormStep2'
import InventoryFormStep3 from '@/components/forms/inventory/InventoryFormStep3'

interface Supplier {
  id: string
  name: string
  email: string
  non_custodial_wallet_address: string
}

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  suppliers: Supplier[]
  loading?: boolean
}

const defaultFormData = {
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

export default function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  loading = false,
}: AddInventoryModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setStep(1)
    setFormData(defaultFormData)
    onClose()
  }

  const handleNext = () => {
    if (step === 1 && !formData.name) {
      alert('Please enter item name')
      return
    }
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
      title={`Add Item - Step ${step} of 3`}
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
              {isLoading ? 'Adding...' : 'Add Item'}
            </button>
          )}
        </div>
      }
    >
      {/* Progress Indicator */}
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

      {/* Form Steps */}
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
