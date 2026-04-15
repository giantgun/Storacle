'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createInvoice, Invoice } from '@/lib/invoice'
import { createInvoiceOrder } from '@/app/actions/hsp'
import { toast } from 'sonner'

interface InvoiceFormProps {
  onInvoiceGenerated: (invoice: Invoice & { paymentUrl?: string; paymentRequestId?: string }) => void
  userAddress?: string
}

export function InvoiceForm({ onInvoiceGenerated, userAddress }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    unitPrice: '',
    expiryDate: '',
    payeeAddress: userAddress || '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    let toastId
    try {
      // Validate inputs
      if (!formData.itemName.trim()) {
        toast.error('Please enter item name')
        return
      }

      const quantity = parseFloat(formData.quantity)
      const unitPrice = parseFloat(formData.unitPrice)

      if (isNaN(quantity) || quantity <= 0) {
        toast.error('Please enter valid quantity')
        return
      }

      if (isNaN(unitPrice) || unitPrice <= 0) {
        toast.error('Please enter valid unit price in USDT')
        return
      }

      if (!formData.expiryDate) {
        toast.error('Please select expiry date')
        return
      }

      if (!formData.payeeAddress || !formData.payeeAddress.startsWith('0x')) {
        toast.error('Please enter a valid payee wallet address')
        return
      }

      // Create invoice locally
      const invoice = createInvoice({
        name: formData.itemName,
        quantity,
        unitPrice,
        expiryDate: formData.expiryDate,
        walletAddress: formData.payeeAddress,
        chain: 'sepolia',
      })

      // Create HSP payment order
      // toastId = toast.loading('Generating invoice...')
      
      // const hspResult = await createInvoiceOrder({
      //   itemName: formData.itemName,
      //   quantity,
      //   unitPrice,
      //   expiryDate: formData.expiryDate,
      //   payeeAddress: formData.payeeAddress,
      // })

      // if (!hspResult.success) {
      //   toast.error(hspResult.error || 'Failed to create payment order')
      //   return
      // }

      // Merge invoice with payment details
      // const invoiceWithPayment = {
      //   ...invoice,
      //   paymentUrl: hspResult.paymentUrl,
      //   paymentRequestId: hspResult.paymentRequestId,
      // }
      const invoiceWithPayment = {
        ...invoice,
        paymentUrl: "https://merchant-qa.hashkeymerchant.com/pay?invoice=" + invoice.id,
        paymentRequestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }
      onInvoiceGenerated(invoiceWithPayment)

      // Reset form
      setFormData({
        itemName: '',
        quantity: '',
        unitPrice: '',
        expiryDate: '',
        payeeAddress: userAddress || '',
      })
    } catch (error) {
      console.error('[v0] Error generating invoice:', error)
      toast.error('Failed to generate invoice')
    } finally {
      setIsLoading(false)
      toast.dismiss(toastId)
      // toast.success('Invoice generated successfully')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Invoice</CardTitle>
        <CardDescription>Create a new invoice with payment link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-foreground mb-1">
              Item Name
            </label>
            <Input
              id="itemName"
              name="itemName"
              type="text"
              placeholder="Enter item name"
              value={formData.itemName}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">
                Quantity
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium text-foreground mb-1">
                Unit Price (USDT)
              </label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-foreground mb-1">
              Expiry Date
            </label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="payeeAddress" className="block text-sm font-medium text-foreground mb-1">
              Payee Wallet Address (0x...)
            </label>
            <Input
              id="payeeAddress"
              name="payeeAddress"
              type="text"
              placeholder="0x..."
              value={formData.payeeAddress}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ethereum/Sepolia address where payment will be sent
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating order...' : 'Generate Invoice & Payment Link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
