'use client'

import FormInput from '../inputs/FormInput'

interface SupplierFormData {
  name: string
  email: string
  non_custodial_wallet_address: string
}

interface SupplierFormProps {
  formData: SupplierFormData
  onChange: (data: Partial<SupplierFormData>) => void
}

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export default function SupplierForm({ formData, onChange, error, errors }: SupplierFormProps) {
  const handleInputChange = (field: keyof SupplierFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: e.target.value })
  }

  return (
    <div className="space-y-3">
      <FormInput
        id="supplier-name"
        label="Supplier Name"
        placeholder="e.g., Global Parts Co."
        value={formData.name}
        onChange={handleInputChange('name')}
        required
      />
      <FormInput
        id="supplier-email"
        label="Email"
        type="email"
        placeholder="supplier@example.com"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
      />
      <FormInput
        id="supplier-wallet"
        label="USDT Wallet Address"
        type="text"
        placeholder="0x..."
        value={formData.non_custodial_wallet_address}
        onChange={handleInputChange('non_custodial_wallet_address')}
        required
      />
      {errors?.non_custodial_wallet_address && (
        <p className="text-xs text-destructive">{errors.non_custodial_wallet_address}</p>
      )}
    </div>
  )
}
