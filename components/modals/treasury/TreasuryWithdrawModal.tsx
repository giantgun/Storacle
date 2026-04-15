'use client'

import { useState } from 'react'
import BaseModal from '../BaseModal'
import TreasuryWithdrawForm from '@/components/forms/treasury/TreasuryWithdrawForm'

interface WithdrawFormData {
  currency: string
  amount: string
  address: string
}

interface TreasuryWithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: WithdrawFormData) => void
  loading?: boolean
}

const defaultFormData = {
  currency: 'USDT',
  amount: '',
  address: '',
}

export default function TreasuryWithdrawModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: TreasuryWithdrawModalProps) {
  const [formData, setFormData] = useState<WithdrawFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setFormData(defaultFormData)
    onClose()
  }

  const handleSubmit = () => {
    if (formData.amount && formData.address) {
      setIsSubmitting(true)
      try {
        onSubmit(formData)
        handleClose()
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const isLoading = loading || isSubmitting

  return (
    <BaseModal
      isOpen={isOpen}
      title="Withdraw / Convert"
      onClose={handleClose}
      actions={
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-border text-foreground text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      }
    >
      <TreasuryWithdrawForm
        formData={formData}
        onChange={data => setFormData({ ...formData, ...data })}
      />
    </BaseModal>
  )
}
