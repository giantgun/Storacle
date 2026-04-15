'use client'

import { useState } from 'react'
import BaseModal from '../BaseModal'
import SupplierForm from '@/components/forms/suppliers/SupplierForm'

interface SupplierFormData {
  name: string
  email: string
  non_custodial_wallet_address: string
}

interface SupplierModalProps {
  isOpen: boolean
  isEditMode?: boolean
  onClose: () => void
  onSubmit: (data: SupplierFormData) => Promise<void>
  loading?: boolean
}

const defaultFormData = {
  name: '',
  email: '',
  non_custodial_wallet_address: '',
}

export default function SupplierModal({
  isOpen,
  isEditMode = false,
  onClose,
  onSubmit,
  loading = false,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setFormData(defaultFormData)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.non_custodial_wallet_address) {
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

  const isLoading = loading || isSubmitting

  return (
    <BaseModal
      isOpen={isOpen}
      title={isEditMode ? 'Edit Supplier' : 'Add Supplier'}
      onClose={handleClose}
      actions={
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Supplier')}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-destructive/20 text-destructive text-sm font-medium rounded hover:bg-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      }
    >
      <SupplierForm
        formData={formData}
        onChange={data => setFormData({ ...formData, ...data })}
      />
    </BaseModal>
  )
}
