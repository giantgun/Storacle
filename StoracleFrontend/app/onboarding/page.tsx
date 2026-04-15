'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup, login, getAuthNonce } from '@/lib/actions/auth'
import { Toaster, toast } from 'sonner'

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function OnboardingPage() {
  const router = useRouter()

  // Mode: true = sign in, false = create account
  const [isLogin, setIsLogin] = useState(true)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')

  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // On mount, try to auto-detect existing wallet
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      })
    }
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
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      })
    } catch (switchError: any) {
      // Error code 4902 means the chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
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

  const handleLogin = async () => {
    if (!walletAddress) {
      toast.error('Wallet not found')
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      }
    }

    if (!walletAddress) {
      toast.error('Failed to connect wallet')
      return
    }

    setLoading(true)
    setError('')
    try {
      await ensureSepoliaChain()

      const nonce = await getAuthNonce()
      const message = buildSiweMessage(walletAddress, nonce)

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      const result = await login(message, signature, nonce)

      if (result.success) {
        toast.success('Welcome back!')
        router.push('/dashboard')
      } else {
        setError(result.error || 'No account found. Please create an account first.')
        toast.error('Login failed')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
      toast.error('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    if (!walletAddress) {
      toast.error('Wallet not found')
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      }
    }

    if (!walletAddress) {
      toast.error('Failed to connect wallet')
      return
    }

    if (!walletAddress) {
      setError('Connect your wallet first')
      return
    }
    if (!firstName || !lastName || !businessName || !email) {
      setError('All fields are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError('')
    try {
      await ensureSepoliaChain()

      const nonce = await getAuthNonce()
      const message = buildSiweMessage(walletAddress, nonce)

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      const result = await signup(firstName, lastName, businessName, email, message, signature, walletAddress, nonce)

      if (result.success) {
        toast.success('Account created!')
        router.push('/dashboard')
      } else {
        setError('Account creation failed. Please try again.')
        toast.error('Signup failed')
      }
    } catch (err: any) {
      setError(err.message || 'Account creation failed')
      toast.error('Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Storacle</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? 'Connect your wallet to sign in' : 'Create your account with a wallet'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border mb-6 overflow-hidden">
          <button
            onClick={() => { setIsLogin(true); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
          >
            Create Account
          </button>
        </div>

        {/* CREATE ACCOUNT — Show form if creating account */}
        {!isLogin && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setError('') }}
                  placeholder="John"
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setError('') }}
                  placeholder="Doe"
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setError('') }}
                placeholder="Your Company"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Business Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={isLogin ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : isLogin ? (
              <>
                Connect Wallet
              </>
            ) : (
              <>
                Sign Up &amp; Create Account
              </>
            )}
          </button>

        </div>
      </div>

      <Toaster />
    </div>
  )
}
