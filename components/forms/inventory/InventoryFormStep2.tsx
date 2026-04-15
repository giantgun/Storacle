'use client'

import FormInput from '../inputs/FormInput'

interface InventoryFormData {
  unit_sales_price_in_usdt: string
  expected_purchase_price_in_usdt: string
  critical_order_level: string
}

interface InventoryFormStep2Props {
  formData: InventoryFormData
  onChange: (data: Partial<InventoryFormData>) => void
}

export default function InventoryFormStep2({ formData, onChange }: InventoryFormStep2Props) {
  return (
    <div className="space-y-3">
      <FormInput
        id="step2-sales"
        label="Unit Sales Price (USDT)"
        type="number"
        step="0.01"
        placeholder="e.g., 99.99"
        value={formData.unit_sales_price_in_usdt}
        onChange={e => onChange({ unit_sales_price_in_usdt: e.target.value })}
        required
      />
      <FormInput
        id="step2-expected"
        label="Expected Purchase Price (USDT)"
        type="number"
        step="0.01"
        placeholder="e.g., 48.50"
        value={formData.expected_purchase_price_in_usdt}
        onChange={e => onChange({ expected_purchase_price_in_usdt: e.target.value })}
      />
      <FormInput
        id="step2-critical"
        label="Critical Order Level"
        type="number"
        placeholder="e.g., 50"
        value={formData.critical_order_level}
        onChange={e => onChange({ critical_order_level: e.target.value })}
        required
      />
    </div>
  )
}
