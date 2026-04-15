'use client'

import { toggleAgentActiveForOrg, login, getAuthNonce } from '@/lib/actions/auth'
import type { TerminalTask, ServerSupplier, ServerInventoryItem } from '@/lib/types/sse-events'
import AgentLimitsForm from './AgentLimitsForm'
import { revokeSessionKey, type EnableSessionResult } from '@/lib/zerodev-session-key'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface AITerminalProps {
  fullscreen?: boolean
  agentActive?: boolean
  onAgentToggle?: (active: boolean) => void
  inventoryItems?: ServerInventoryItem[]
  terminalTasks?: TerminalTask[]
  suppliers?: ServerSupplier[]
  sessionKeyAddress?: string
  sessionExpiry?: number
  smartAccountAddress: `0x${string}`
  onConfigureSession?: (result: EnableSessionResult) => Promise<void>
  onRevokeSession?: () => void
}

export default function AITerminal({
  fullscreen = false,
  agentActive = true,
  onAgentToggle,
  inventoryItems = [],
  terminalTasks = [],
  suppliers = [],
  sessionKeyAddress,
  sessionExpiry = 0,
  onConfigureSession,
  onRevokeSession,
  smartAccountAddress,
}: AITerminalProps) {
  const [showLimitsModal, setShowLimitsModal] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => new Set())
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when new tasks/logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalTasks])

  // Auto-expand latest tasks on arrival
  useEffect(() => {
    if (terminalTasks.length > 0) {
      setExpandedTasks(prev => {
        const next = new Set(prev)
        for (const task of terminalTasks.slice(-3)) {
          next.add(task.task_id)
        }
        return next
      })
    }
  }, [terminalTasks.length])

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      })
    }
  }, [])

  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  const handleEditLimits = () => {
    setShowLimitsModal(true)
  }

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
    const targetChainIdHex = `0x${(11155111).toString(16)}` // 0xaa36a7
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
            rpcUrls: [process.env.NEXT_PUBLIC_PROVIDER_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        })
      } else {
        throw switchError
      }
    }
  }

  const handleActivate = async () => {
    if (!onAgentToggle) return

    // First, initiate signin flow like in onboarding
    try {
      // Trigger signin process (similar to onboarding flow)
      await ensureSepoliaChain()

      const nonce = await getAuthNonce()
      const message = buildSiweMessage(walletAddress!, nonce)

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      const loginResult = await login(message, signature, nonce)

      if (!loginResult.success) {
        toast.error('Failed to authenticate')
        return
      }

      console.log('Activating agent for org...')
      const result = await toggleAgentActiveForOrg(true)
      onAgentToggle(true)
      console.log('Agent activation result:', result)

      if (!result.success) {
        toast.error('Failed to activate agent')
        onAgentToggle(false)
      }

    } catch (err) {
      console.error('Agent activation error:', err)
      onAgentToggle(false)
      toast.error('Activation failed')
    }
  }

  const handleDeactivate = async () => {
    try {
      console.log('Deactivating agent and revoking session...')
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
      }

      // First deactivate the agent via server endpoint 
      await revokeSessionKey(ethereum, smartAccountAddress, sessionKeyAddress! as `0x${string}`)
      onRevokeSession?.()

      // Then revoke the session (clears approval, policy_config, smart_account_address)
      // This also updates agentActive state via the onRevokeSession callback in dashboard-content.tsx

      toast.info('Session revoked — agent deactivated')
    } catch (err) {
      console.error('Agent deactivation error:', err)
      toast.error('Failed to deactivate agent')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-600/20 text-blue-900'
      case 'completed': return 'bg-green-600/20 text-green-900'
      case 'failed': return 'bg-red-600/20 text-red-900'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '○'
      case 'completed': return '✓'
      case 'failed': return '✗'
      default: return '●'
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'running': return 'animate-pulse text-blue-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <>
      <div className={`flex flex-col ${fullscreen ? 'h-screen' : ''} bg-gradient-to-b from-background to-primary/5`}>
        {/* Terminal Content */}
        <div className={`flex-1 flex-col-reverse ${fullscreen ? 'h-full' : ''} max-h-[70vh] overflow-y-auto p-3 md:p-4 font-mono text-xs md:text-sm space-y-3 md:space-y-4`}>
          {terminalTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground opacity-50">
              <span>Waiting for agent activity...</span>
            </div>
          ) : (
            terminalTasks.map((task, tIdx) => {
              const isExpanded = expandedTasks.has(task.task_id)
              const statusColor = getStatusColor(task.status)
              const statusIcon = getStatusIcon(task.status)
              const statusStyle = getStatusStyle(task.status)

              return (
                <div key={`${task.task_id}-${tIdx}`} className="space-y-1">
                  {/* Task Header */}
                  <button
                    onClick={() => toggleExpand(task.task_id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground transition-transform duration-200">
                        {isExpanded ? '▾' : '▸'}
                      </span>
                      <span className="text-foreground font-semibold group-hover:text-primary transition-colors">
                        <span className={statusStyle}>
                          {statusIcon}
                        </span>
                        {task.task_header}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}`}>
                        {task.status}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(task.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>

                  {/* Tool Timeline */}
                  {isExpanded && task.entries.length > 0 && (
                    <div className="pl-4 pt-1 space-y-0.5 text-xs">
                      {task.entries.map((entry, eIdx) => {
                        const entryColor = entry.status === 'success'
                          ? 'text-green-600'
                          : entry.status === 'failed'
                            ? 'text-red-600'
                            : 'text-muted-foreground'

                        return (
                          <div key={eIdx} className={`flex gap-2 ${entryColor} leading-relaxed`}>
                            <span className="text-muted-foreground/50 flex-shrink-0">
                              {eIdx === task.entries.length - 1 && !(isExpanded && task.reasoning) ? '└' : '├'}
                            </span>
                            {/* <span className="text-muted-foreground/70">
                              {entry.tool}
                            </span> */}
                            {entry.input_brief && (
                              <span>
                                {/* →  */}
                                {entry.input_brief}
                              </span>
                            )}
                            {entry.output_brief && (
                              <span className="text-foreground/80">{entry.output_brief}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* AI Reasoning Block */}
                  {isExpanded && task.reasoning && (
                    <div className="pl-4">
                      <div className="border-primary/30 flex gap-2 leading-relaxed">
                        <span className="text-muted-foreground/50 flex-shrink-0">
                          {'└ '}
                        </span>
                        <span className="text-primary/90 text-xs leading-relaxed">
                          [AI] {task.reasoning}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
          {terminalTasks.length > 0 && (
            <div className="text-primary animate-pulse text-xs md:text-sm">█</div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Session Status */}
        {sessionKeyAddress && (
          <div className="border-t border-border p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Session Key:</span>
              <span className="text-primary font-mono md:hidden">
                {sessionKeyAddress.slice(0, 8)}...{sessionKeyAddress.slice(-6)}
              </span>
              <span className="text-primary font-mono">
                {sessionKeyAddress}
              </span>
              {sessionExpiry > 0 && (
                <span className="text-muted-foreground ml-auto">
                  Expires {new Date(sessionExpiry * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className={`border-t border-border flex flex-col md:flex-row gap-1 ${fullscreen ? 'p-2' : 'p-2 md:p-3'} sticky`}>
          <button
            onClick={handleEditLimits}
            className="w-full md:w-auto px-2 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            {sessionKeyAddress ? 'Edit Limits' : 'Configure Limits'}
          </button>
          {agentActive ? (
            <button
              onClick={handleDeactivate}
              className="w-full md:w-auto px-2 py-1.5 bg-red-400 text-primary-foreground rounded-md text-sm font-medium hover:bg-red-500/25 transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={handleActivate}
              disabled={!sessionKeyAddress}
              className={`w-full md:w-auto px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${sessionKeyAddress
                ? 'bg-green-600/20 text-green-600 hover:bg-green-600/25'
                : 'bg-muted/20 text-muted-foreground/40 cursor-not-allowed'
                }`}
              title={!sessionKeyAddress ? 'Configure a session first' : undefined}
            >
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Zerodev Agent Limits Form */}
      {showLimitsModal && (
        <AgentLimitsForm
          suppliers={suppliers}
          currentSessionKey={sessionKeyAddress}
          smartAccountAddress={smartAccountAddress}
          isActive={!!sessionKeyAddress}
          onConfigure={async (result: EnableSessionResult) => {
            setShowLimitsModal(false)
            await onConfigureSession?.(result)
          }}
          onRevoke={() => {
            onRevokeSession?.()
            setShowLimitsModal(false)
            toast.info('Session revoked')
          }}
          onClose={() => setShowLimitsModal(false)}
        />
      )}
    </>
  )
}
