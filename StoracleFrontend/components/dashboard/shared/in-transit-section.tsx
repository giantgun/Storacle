'use client'

import type { InTransitOrder, ServerInventoryItem } from '@/lib/types/sse-events'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink } from "lucide-react"
import { useEffect } from 'react'

interface InTransitSectionProps {
  orders: InTransitOrder[]
  inventoryItems: ServerInventoryItem[]
  onConfirm: (orderId: string) => void
}

export default function InTransitSection({ orders, inventoryItems, onConfirm }: InTransitSectionProps) {
  const getItemName = (inventoryItemId: string) => {
    const item = inventoryItems.find(i => i.id === inventoryItemId)
    return item?.name ?? `Item ${inventoryItemId?.slice(0, 6)}`
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">In-Transit Orders</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.length === 0
              ? 'No active shipments'
              : `${orders.length} active shipment${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
        {orders.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            No orders currently in transit
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              className="flex flex-col gap-3 p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-md font-semibold">
                    {getItemName(order.inventory_item_id)}
                  </p>

                  <p className="text-sm">
                    <span className="font-semibold">{order.quantity_change}</span> units at <span className="font-semibold">${order.price_per_unit}</span> per unit
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => onConfirm(order.id)}
                >
                  Confirm
                </Button>
              </div>

              {order.metadata?.transaction_hash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${order.metadata.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 bg-muted/40 border rounded-lg px-3 py-2 hover:bg-muted transition group"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground">
                      View on Etherscan
                    </span>
                    <span className="text-sm font-mono text-primary group-hover:underline">
                      0x{order.metadata.transaction_hash.slice(2, 6)}...
                      {order.metadata.transaction_hash.slice(-4)}
                    </span>
                  </div>

                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                </a>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
