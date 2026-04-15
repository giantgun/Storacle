'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthNonce, signInWithWeb3 } from './actions/auth'
import { connectMetaMask } from '@/lib/auth/web3'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

declare global {
  interface Window {
    ethereum?: any | undefined
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)


  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (err) {
          console.error("Wallet check failed", err);
        }
      }
    };
    autoConnect();
  }, [])

  const buildSiweMessage = (wallet: string, nonce: string) => {
    const domain = window.location.host
    const origin = window.location.origin
    const date = new Date().toISOString()
    return `${domain} wants you to sign in with your Ethereum account:
${wallet}

I accept Storacle Terms of Service

URI: ${origin}
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${date}`
  }

  const ensureSepoliaChain = async () => {
    const targetChainIdHex = `0x${(11155111).toString(16)}` // 0xa47baf
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      })
    } catch (switchError: any) {
      // Error code 4902 means the chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetChainIdHex,
            chainName: 'Sepolia',
            rpcUrls: [process.env.NEXT_PUBLIC_PROVIDER_URL],
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        })
      } else {
        throw switchError
      }
    }
  }

  const handleConnectWallet = async () => {

    if (!walletAddress) {
      toast.error('Wallet not found')
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      }
    }

    setIsLoading(true)
    try {

      if (!walletAddress) {
        toast.error('Failed to connect wallet')
        return
      }

      const nonce = await getAuthNonce()
      const message = buildSiweMessage(walletAddress, nonce)
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      // Sign in with Supabase using the wallet address
      const result = await signInWithWeb3(message, signature)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Successfully connected wallet!')
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Wallet connection error:', error)
      toast.error(error.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">HSP Merchant Portal</h1>
          <p className="text-muted-foreground">Connect your wallet to get started</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Web3 Authentication</CardTitle>
            <CardDescription>Connect your MetaMask wallet on Sepolia testnet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isLoading ? 'Connecting...' : 'Connect MetaMask Wallet'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Requirements</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">✓</span>
                  <span>MetaMask browser extension installed</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">✓</span>
                  <span>Connected to Sepolia test network</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">✓</span>
                  <span>Active account with test ETH</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This is a test environment. Make sure you&apos;re using Sepolia testnet for security.
          </p>
        </div>
      </div>
    </div>
  )
}
