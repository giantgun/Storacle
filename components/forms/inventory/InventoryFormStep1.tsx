'use client'

import FormInput from '../inputs/FormInput'

interface InventoryFormData {
  name: string
  unit_name: string
  quantity: string
  inventory_capacity: string
}

interface InventoryFormStep1Props {
  formData: InventoryFormData
  onChange: (data: Partial<InventoryFormData>) => void
}

export default function InventoryFormStep1({ formData, onChange }: InventoryFormStep1Props) {
  return (
    <div className="space-y-3">
      <FormInput
        id="step1-name"
        label="Item Name"
        placeholder="e.g., Electronic Component A"
        value={formData.name}
        onChange={e => onChange({ name: e.target.value })}
        required
      />
      <FormInput
        id="step1-unit"
        label="Unit Name"
        placeholder="e.g., kg, box, piece"
        value={formData.unit_name}
        onChange={e => onChange({ unit_name: e.target.value })}
      />
      <FormInput
        id="step1-qty"
        label="Current Quantity"
        type="number"
        placeholder="e.g., 150"
        value={formData.quantity}
        onChange={e => onChange({ quantity: e.target.value })}
        required
      />
      <FormInput
        id="step1-capacity"
        label="Inventory Capacity"
        type="number"
        placeholder="e.g., 500"
        value={formData.inventory_capacity}
        onChange={e => onChange({ inventory_capacity: e.target.value })}
        required
      />
    </div>
  )
}
