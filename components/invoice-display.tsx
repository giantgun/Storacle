'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Invoice, downloadPDF } from '@/lib/invoice'
import { toast } from 'sonner'
import { Copy, Download, ExternalLink, CheckCircle } from 'lucide-react'

interface InvoiceDisplayProps {
  invoice: (Invoice & { paymentUrl?: string; paymentRequestId?: string }) | null
}

export function InvoiceDisplay({ invoice }: InvoiceDisplayProps) {
  const [copying, setCopying] = useState(false)

  if (!invoice) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Your generated invoice will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No invoice generated yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const paymentLink = invoice.paymentUrl || `https://pay.hashkey.com/flow/mock-${invoice.id}`

  const handleCopyLink = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(paymentLink)
      toast.success('Payment link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link')
    } finally {
      setCopying(false)
    }
  }

  const handleDownloadPDF = () => {
    let toastId
    try {
      downloadPDF(invoice)
      toastId = toast.info('Invoice downloading!')
      toast.dismiss(toastId)
      toast.success('Invoice downloaded!')
    } catch (error) {
      console.error('Download error:', error)
      toast.dismiss(toastId)
      toast.error('Failed to download invoice')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Details</CardTitle>
        <CardDescription>Invoice #{invoice.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Item Name</p>
            <p className="text-lg font-semibold text-foreground">{invoice.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Created</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Quantity</p>
            <p className="text-lg font-semibold text-foreground">{invoice.quantity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
            <p className="text-lg font-semibold text-foreground">{invoice.expiryDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Unit Price (USDT)</p>
            <p className="text-lg font-semibold text-foreground">${invoice.unitPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
            <p className="text-lg font-semibold text-foreground">${invoice.subtotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        {/* HSP Payment Status */}
        {invoice.paymentUrl && (
          <div className="space-y-3 pt-4 border-t border-border bg-accent/5 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              <p className="text-sm font-semibold text-foreground">Payment Order Created (HashKey)</p>
            </div>
            {invoice.paymentRequestId && (
              <p className="text-xs text-muted-foreground">
                Request ID: <code className="text-foreground">{invoice.paymentRequestId}</code>
              </p>
            )}
          </div>
        )}

        {/* Payment Link Section */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground">
            {invoice.paymentUrl ? 'HashKey Payment URL' : 'Payment Link'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentLink}
              readOnly
              className="flex-1 px-3 py-2 bg-secondary text-foreground text-sm rounded-md border border-border overflow-hidden text-ellipsis"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={copying}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              {copying ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => window.open(paymentLink, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            {invoice.paymentUrl ? 'Open Checkout' : 'Open Payment Link'}
          </Button>
        </div>

        {/* Download PDF Section */}
        <div className="pt-4 border-t border-border">
          <Button onClick={handleDownloadPDF} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download Invoice PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
