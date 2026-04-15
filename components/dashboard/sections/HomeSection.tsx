'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ServerInventoryItem, InTransitOrder } from '@/lib/types/sse-events'
import InTransitSection from '../shared/in-transit-section'
import TreasuryWithdrawModal from '@/components/modals/treasury/TreasuryWithdrawModal'
import SimPurchaseModal from '@/components/modals/sim-purchase/SimPurchaseModal'

interface HomeSectionProps {
  balances: { usdt?: number }
  inventoryItems: ServerInventoryItem[]
  inTransitOrders: InTransitOrder[]
  onConfirmTransit: (orderId: string) => void
}

export default function HomeSection({ balances, inventoryItems, inTransitOrders, onConfirmTransit }: HomeSectionProps) {
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showSimPurchase, setShowSimPurchase] = useState(false)

  const handleWithdraw = (data: { currency: string; amount: string; address: string }) => {
    
    setShowWithdraw(false)
    toast.success(
      `Withdrawal submitted: ${data.amount} ${data.currency} to ${data.address.slice(0, 6)}...${data.address.slice(-4)}`
    )
  }

  const getTotalValue = () => {
    return inventoryItems.reduce((sum, item) => sum + item.unit_sales_price_in_usdt * item.quantity, 0)
  }

  const getStockHealth = () => {
    const lowStock = inventoryItems.filter(item => item.quantity <= item.critical_order_level).length
    return inventoryItems.length > 0
      ? ((inventoryItems.length - lowStock) / inventoryItems.length) * 100
      : 0
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your supply chain operations</p>
        </div>
        <button
          onClick={() => setShowSimPurchase(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded border border-border hover:border-primary/30 bg-card/50"
        >
          Sim Purchase
        </button>
      </div>

      {/* Account Balance & Inventory Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* USDT Balance */}
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
          <p className="text-sm font-medium text-muted-foreground mb-3">USDT Stablecoin</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">
              ${(balances.usdt ?? 0).toLocaleString()}
            </p>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400">Active</span>
          </div>
          <button
            onClick={() => setShowWithdraw(true)}
            className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 transition-opacity"
          >
            Withdraw / Convert
          </button>
        </div>

        {/* Inventory Status (same styling) */}
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
          <p className="text-sm font-medium text-muted-foreground mb-3">Inventory Status</p>
          <div className="flex items-end justify-between mb-4">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">
              ${getTotalValue().toLocaleString()}
            </p>
            <span className="text-right">
              <span className="text-sm font-semibold text-primary block">{getStockHealth().toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">above critical level</span>
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-primary/70 h-3 transition-all duration-500 rounded-full"
              style={{ width: `${getStockHealth()}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {inventoryItems.length} tracked • {inventoryItems.filter(i => i.quantity <= i.critical_order_level).length} below critical level
          </p>
        </div>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Stock Items</h2>
          <span className="text-sm text-muted-foreground">{inventoryItems.length} items</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {inventoryItems.map(item => {
            const isLowStock = item.quantity <= item.critical_order_level
            const value = item.unit_sales_price_in_usdt * item.quantity
            return (
              <div key={item.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all hover:shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">${value.toLocaleString()}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 ${
                      isLowStock
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {item.quantity} units
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 transition-all rounded-full ${
                        isLowStock ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min((item.quantity / item.inventory_capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Critical: {item.critical_order_level} units</span>
                    <span className={isLowStock ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                      {isLowStock ? '⚠ Low stock' : '✓ In stock'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <TreasuryWithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSubmit={handleWithdraw}
      />

      <SimPurchaseModal
        isOpen={showSimPurchase}
        onClose={() => setShowSimPurchase(false)}
        inventoryItems={inventoryItems}
      />

      <InTransitSection
        orders={inTransitOrders}
        inventoryItems={inventoryItems}
        onConfirm={onConfirmTransit}
      />
    </div>
  )
}
