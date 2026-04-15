'use client'

import FormInput from '../inputs/FormInput'
import FormSelect from '../inputs/FormSelect'

interface WithdrawFormData {
  currency: string
  amount: string
  address: string
}

interface TreasuryWithdrawFormProps {
  formData: WithdrawFormData
  onChange: (data: Partial<WithdrawFormData>) => void
}

export default function TreasuryWithdrawForm({
  formData,
  onChange,
}: TreasuryWithdrawFormProps) {
  const currencyOptions = [
    { value: 'USDT', label: 'USDT' },
    { value: 'NGN', label: 'NGN' },
  ]

  const handleInputChange = (field: keyof WithdrawFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ [field]: e.target.value })
  }

  return (
    <div className="space-y-3">
      <FormSelect
        id="currency"
        label="Select Currency"
        value={formData.currency}
        onChange={handleInputChange('currency')}
        options={currencyOptions}
        required
      />
      <FormInput
        id="amount"
        label="Amount"
        type="number"
        placeholder="0.00"
        value={formData.amount}
        onChange={handleInputChange('amount')}
        required
      />
      <FormInput
        id="address"
        label="Wallet Address"
        type="text"
        placeholder="0x..."
        value={formData.address}
        onChange={handleInputChange('address')}
        required
      />
    </div>
  )
}
