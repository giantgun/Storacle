'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { setupSessionWithPolicies, updateSessionPolicies, type EnableSessionResult } from '@/lib/zerodev-session-key'
import type { ServerSupplier } from '@/lib/types/sse-events'
import { parseUnits } from 'viem'
import { getSession } from '@/lib/utils/session'
import { getSessionAddress } from '@/lib/actions/auth'

interface SupplierLimit {
  supplier: ServerSupplier
  enabled: boolean
  maxPerPayment: string
}

interface AgentLimitsFormProps {
  suppliers: ServerSupplier[]
  currentSessionKey?: string
  isActive: boolean
  smartAccountAddress: string
  onConfigure: (result: EnableSessionResult) => Promise<void>
  onRevoke: () => void
  onClose: () => void
}

export default function AgentLimitsForm({
  suppliers,
  currentSessionKey,
  isActive: _isActive,
  smartAccountAddress,
  onConfigure,
  onRevoke,
  onClose,
}: AgentLimitsFormProps) {
  const [step, setStep] = useState(1)
  const [supplierLimits, setSupplierLimits] = useState<SupplierLimit[]>(() =>
    suppliers.map(s => ({
      supplier: s,
      enabled: false,
      maxPerPayment: '5000',
    }))
  )
  const [maxDailyTotal, setMaxDailyTotal] = useState('25000')
  const [maxDailyTxCount, setMaxDailyTxCount] = useState('10')
  const [expiryDays, setExpiryDays] = useState('30')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const enabledSuppliers = useMemo(
    () => supplierLimits.filter(s => s.enabled),
    [supplierLimits]
  )

  const updateSupplierLimit = (index: number, field: string, value: string) => {
    setSupplierLimits(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: field === 'enabled' ? value === 'true' : value }
      return next
    })
  }

  // Step 1: Supplier Authorization
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2">Supplier Authorization</h3>
        <p className="text-sm text-muted-foreground">
          Select which suppliers the agent can pay, and set the maximum USDT per single payment.
        </p>
      </div>

      {supplierLimits.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 bg-card rounded-lg border border-border text-center">
          No suppliers configured yet. Add suppliers first.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {supplierLimits.map((sl, idx) => (
            <div
              key={sl.supplier.id}
              className={`p-3 rounded-lg border transition-colors ${
                sl.enabled
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={sl.enabled}
                  onChange={(e) => updateSupplierLimit(idx, 'enabled', String(e.target.checked))}
                  className="w-4 h-4 rounded accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{sl.supplier.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {sl.supplier.non_custodial_wallet_address}
                  </p>
                </div>
              </div>
              {sl.enabled && (
                <div className="mt-3 ml-7">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Max USDT per payment
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sl.maxPerPayment}
                    onChange={(e) => updateSupplierLimit(idx, 'maxPerPayment', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Step 2: Global Limits
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2">Global Limits</h3>
        <p className="text-sm text-muted-foreground">
          Set overall spending caps and rate limits for the agent session.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">
            Daily Spend Cap (USDT)
          </label>
          <input
            type="number"
            min="0"
            value={maxDailyTotal}
            onChange={(e) => setMaxDailyTotal(e.target.value)}
            placeholder="e.g., 25000"
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Max total USDT the agent can spend per day across all suppliers.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">
            Max Payments Per Day
          </label>
          <input
            type="number"
            min="1"
            value={maxDailyTxCount}
            onChange={(e) => setMaxDailyTxCount(e.target.value)}
            placeholder="e.g., 10"
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum number of payments the agent can make in a 24-hour period.
          </p>
        </div>
      </div>
    </div>
  )

  // Step 3: Session Expiry
  const renderStep3 = () => {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays || '0'))

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">Session Expiry</h3>
          <p className="text-sm text-muted-foreground">
            How long the session key remains active. After expiry, the agent cannot make payments.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">
            Duration (Days)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Session will expire on {expiryDate.toLocaleDateString()} at {expiryDate.toLocaleTimeString()}.
          </p>
        </div>
      </div>
    )
  }

  // Step 4: Review
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2">Review &amp; Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review the policies that will be configured on your smart account. You&apos;ll need to sign with your wallet.
        </p>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg space-y-4 text-sm">
        {currentSessionKey ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Session Key</span>
            <span className="text-xs font-mono text-primary">
              {currentSessionKey.slice(0, 10)}...{currentSessionKey.slice(-8)}
            </span>
          </div>
        ) : null}

        <div>
          <span className="text-muted-foreground">Authorized Suppliers ({enabledSuppliers.length})</span>
          <div className="mt-2 space-y-1">
            {enabledSuppliers.map(sl => (
              <div key={sl.supplier.id} className="flex justify-between text-xs">
                <span className="text-foreground">{sl.supplier.name}</span>
                <span className="text-primary">{Number(sl.maxPerPayment).toLocaleString()} USDT</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Spend Cap</span>
            <span className="text-foreground">{Number(maxDailyTotal).toLocaleString()} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Payments/Day</span>
            <span className="text-foreground">{maxDailyTxCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session Expiry</span>
            <span className="text-foreground">{expiryDays} days</span>
          </div>
        </div>

        <div className="p-2 bg-primary/10 border border-primary/20 rounded text-xs text-foreground">
          <strong>Note:</strong> These policies are enforced on-chain. The agent will be unable to make payments
          that exceed these limits, regardless of server-side configuration.
        </div>
      </div>
    </div>
  )

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return enabledSuppliers.length > 0
      case 2: return true
      case 3: return parseInt(expiryDays) > 0
      case 4: return true
      default: return false
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // 1. Check for connected wallet (MetaMask / EIP-1193)
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
      }

      // 2. Fetch session key public address from server
      const sessionKeyResponse = await getSessionAddress()
      if (!sessionKeyResponse.success) {
        console.error('Failed to fetch session key address:',sessionKeyResponse)
        throw new Error('Failed to fetch session key from server')
      }
      const sessionKeyData = await sessionKeyResponse.data
      console.log('Session Key Data:', sessionKeyData)
      const sessionKeyAddress = sessionKeyData.public_session_key_address as `0x${string}`
      if (!sessionKeyAddress) {
        throw new Error('Server did not return a session key address')
      }

      // 3. Build the policy config from form state
      const usdtAddress = process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS as `0x${string}`
      if (!usdtAddress) {
        throw new Error('NEXT_PUBLIC_USDT_TOKEN_ADDRESS not configured')
      }

      const expiryTimestamp = Math.floor(Date.now() / 1000) + parseInt(expiryDays) * 86400

      const policyConfig = {
        expiryTimestamp,
        suppliers: enabledSuppliers.map(sl => ({
          address: sl.supplier.non_custodial_wallet_address as `0x${string}`,
          maxPerPayment: parseUnits(sl.maxPerPayment, 6),
        })),
        maxDailyTotal: maxDailyTotal ? parseUnits(maxDailyTotal, 6) : undefined,
        maxDailyTxCount: maxDailyTxCount ? parseInt(maxDailyTxCount) : undefined,
        usdtAddress,
      }

      // 4. Create or update session with policies — user signs via their MetaMask wallet
      // No private keys handled — window.ethereum does the signing
      let result: EnableSessionResult
      console.log(smartAccountAddress)
      if (smartAccountAddress) {
        // Update existing session policies
        result = await updateSessionPolicies(
          ethereum,
          sessionKeyAddress,
          smartAccountAddress as `0x${string}`,
          policyConfig
        )
      } else {
        // Create new session with policies
        result = await setupSessionWithPolicies(
          ethereum,
          sessionKeyAddress,
          policyConfig
        )
      }

      toast.success('Session policies configured successfully')
      await onConfigure(result)
    } catch (error: any) {
      console.error('Session configuration error:', error)
      toast.error(error.message ?? 'Failed to configure session policies')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Agent Session Policies
            </h3>
            <p className="text-xs text-muted-foreground">
              Step {step} of 4 — Zerodev Session Keys
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-1 px-4 py-2 bg-muted/30">
          {['Suppliers', 'Limits', 'Expiry', 'Review'].map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i + 1 <= step && setStep(i + 1)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  i + 1 === step
                    ? 'bg-primary text-primary-foreground'
                    : i + 1 < step
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}. {label}
              </button>
              {i < 3 && <div className="w-3 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-border">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-border rounded text-foreground hover:bg-card/50 text-sm transition-colors"
            >
              Back
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {step < 4 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Configuring...
                  </>
                ) : (
                  'Configure & Sign'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
