import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  name: string
  quantity: number
  unitPrice: number
  expiryDate: string
  walletAddress: string
  chain: string
}

export interface Invoice extends InvoiceItem {
  id: string
  subtotal: number
  total: number
  createdAt: string
}

export function generateInvoiceId(): string {
  return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createInvoice(item: InvoiceItem): Invoice {
  const subtotal = item.quantity * item.unitPrice
  const total = subtotal
  
  return {
    id: generateInvoiceId(),
    ...item,
    subtotal,
    total,
    createdAt: new Date().toISOString(),
  }
}

export function generatePDFData(invoice: Invoice): string {
  // Mock PDF generation - returns a data URL for demonstration
  const pdfContent = `
INVOICE ${invoice.id}
Created: ${new Date(invoice.createdAt).toLocaleDateString()}

Item: ${invoice.name}
Quantity: ${invoice.quantity}
Unit Price: $${invoice.unitPrice.toFixed(2)} USDT
Subtotal: $${invoice.subtotal.toFixed(2)}
Total: $${invoice.total.toFixed(2)}

Expiry Date: ${invoice.expiryDate}

Payment Address: ${invoice.walletAddress}
Payment Link: https://payment.example.com/pay?invoice=${invoice.id}
  `.trim()

  // Create a simple text-based "PDF" for mocking
  return `data:text/plain;base64,${Buffer.from(pdfContent).toString('base64')}`
}

export function downloadPDF(invoice: Invoice): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('INVOICE', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Invoice ID: ${invoice.id}`, 14, 30);
  doc.text(`Issue Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 35);

  // Table
  autoTable(doc, {
    startY: 45,
    head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
    body: [
      [
        invoice.name,
        invoice.quantity.toString(),
        `$${invoice.unitPrice.toFixed(2)} USDT`,
        `$${invoice.total.toFixed(2)} USDT`
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }, // Professional Blue
  });

  // Payment Details Section
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Payment Information', 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  // Displaying the Chain/Network clearly
  doc.text(`Network/Chain: ${invoice.chain.toUpperCase()}`, 14, finalY + 22);
  doc.text(`Wallet Address: ${invoice.walletAddress}`, 14, finalY + 28);
  doc.text(`Expiry Date: ${invoice.expiryDate}`, 14, finalY + 34);

  // Payment Link
  doc.text('Payment Link:', 14, finalY + 44);
  doc.setTextColor(41, 128, 185);
  doc.text(`https://merchant-qa.hashkeymerchant.com/pay?invoice=${invoice.id}`, 40, finalY + 44);

  doc.save(`invoice-${invoice.id}.pdf`);
}

