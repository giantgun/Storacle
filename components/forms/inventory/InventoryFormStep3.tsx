'use client'

import FormInput from '../inputs/FormInput'
import FormSelect from '../inputs/FormSelect'

interface Supplier {
  id: string
  name: string
}

interface InventoryFormData {
  minimum_bulk_quantity: string
  supplier_id: string
  supplier_lead_time_days: string
}

interface InventoryFormStep3Props {
  formData: InventoryFormData
  suppliers: Supplier[]
  onChange: (data: Partial<InventoryFormData>) => void
}

export default function InventoryFormStep3({
  formData,
  suppliers,
  onChange,
}: InventoryFormStep3Props) {
  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name,
  }))

  return (
    <div className="space-y-3">
      <FormInput
        id="step3-minbulk"
        label="Minimum Bulk Quantity"
        type="number"
        placeholder="e.g., 10"
        value={formData.minimum_bulk_quantity}
        onChange={e => onChange({ minimum_bulk_quantity: e.target.value })}
      />
      <FormSelect
        id="step3-supplier"
        label="Supplier"
        value={formData.supplier_id}
        onChange={e => onChange({ supplier_id: e.target.value })}
        options={supplierOptions}
        required
        helperText="Select the primary supplier for this item"
      />
      <FormInput
        id="step3-leadtime"
        label="Supplier Lead Time (Days)"
        type="number"
        step="0.5"
        placeholder="e.g., 7, 14.5"
        value={formData.supplier_lead_time_days}
        onChange={e => onChange({ supplier_lead_time_days: e.target.value })}
        helperText="Time in days from order to delivery"
      />
    </div>
  )
}
