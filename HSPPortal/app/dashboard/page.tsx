'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InvoiceForm } from '@/components/invoice-form'
import { InvoiceDisplay } from '@/components/invoice-display'
import { Invoice } from '@/lib/invoice'
import { LogOut, Wallet, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentInvoice, setCurrentInvoice] = useState<(Invoice & { paymentUrl?: string; paymentRequestId?: string }) | null>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getUser()
        if (!currentUser) {
          router.push('/')
          return
        }
        setUser(currentUser)
        // Extract wallet address from email (format: address@web3.local)
        const email = currentUser.email || ''
        const address = email.split('@')[0]
        setWalletAddress(address)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">HSP Merchant Portal</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground">Connected Wallet</p>
              <p className="text-sm font-mono text-foreground">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'N/A'}
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <InvoiceForm onInvoiceGenerated={setCurrentInvoice} userAddress={walletAddress} />

            {/* Connected Wallet Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Wallet Information</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Connected Address
                  </p>
                  <p className="text-sm font-mono text-foreground break-all">{walletAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Network
                  </p>
                  <p className="text-sm text-foreground">Sepolia Testnet</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Display Section */}
          <div>
            <InvoiceDisplay invoice={currentInvoice} />
          </div>
        </div>

        {/* Invoice History Info */}
        <div className="mt-8 p-4 bg-secondary/50 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>HashKey Merchant Integration:</strong> Invoices are created with real HSP API calls (if configured). Payment URLs are generated via HashKey&apos;s payment gateway on Sepolia testnet with USDT. Provide a valid payee wallet address to receive payments.
          </p>
        </div>
      </main>
    </div>
  )
}
