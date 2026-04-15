'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import BottomNavigation from './common/BottomNavigation'
import CompactTerminal from './terminal/CompactTerminal'
import HomeSection from './sections/HomeSection'
import InventoryManagement from './inventory/InventoryManagement'
import NotificationsSection from './sections/NotificationsSection'
import ProfileSection, { FullProfile } from './sections/ProfileSection'
import AITerminal from './terminal/AITerminal'
import DesktopCompactTerminal from './terminal/DesktopCompactTerminal'
import { useSSE } from '../../hooks/use-sse'
import { getDashboardData, revokeSessionKeyApproval, saveSessionApproval, toggleAgentActiveForOrg } from '../../lib/actions/auth'
import { markNotificationAsRead } from '../../lib/actions/notifications'
import type {
  ServerInventoryItem,
  ServerSupplier,
  ServerNotification,
  TerminalTask,
  InTransitOrder,
  LogType,
} from '../../lib/types/sse-events'
import type { EnableSessionResult } from '../../lib/zerodev-session-key'
import { confirmItemTransit } from '@/lib/actions/inventory'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

export default function DashboardContent({ access_token }: { access_token: string }) {
  const [activeTab, setActiveTab] = useState('home')
  const [terminalOpen, setTerminalOpen] = useState(false)

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [sseEnabled, setSseEnabled] = useState(false)

  // Centralized dashboard data
  const [balances, setBalances] = useState<{ usdt?: number }>({})
  const [inventoryItems, setInventoryItems] = useState<ServerInventoryItem[]>([])
  const [notifications, setNotifications] = useState<ServerNotification[]>([])
  const [profile, setProfile] = useState<FullProfile>({ org_name: '', org_id: '', first_name: '', last_name: '', business_email: '', smart_account_address: '' })
  const [agentActive, setAgentActive] = useState(false)
  const [suppliers, setSuppliers] = useState<ServerSupplier[]>([])
  const [terminalTasks, setTerminalTasks] = useState<TerminalTask[]>([])
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | undefined>(undefined)
  // In-transit orders from bootstrap
  const [inTransitOrders, setInTransitOrders] = useState<InTransitOrder[]>([])
  // Zerodev session state
  const [sessionKeyAddress, setSessionKeyAddress] = useState<string | undefined>(undefined)
  const [sessionApproval, setSessionApproval] = useState<string | undefined>(undefined)
  const [sessionExpiry, setSessionExpiry] = useState<number>(0)

  // Initial data load from server
  useEffect(() => {
    ; (async () => {
      setIsLoading(true)
      try {
        const result = await getDashboardData()
        if (result.success && result.data) {
          const d = result.data
          setProfile(d.profile)
          setBalances({ usdt: d.balances?.usdt_balance ?? 0 })
          setInventoryItems(d.inventory_items ?? [])
          setSuppliers(d.suppliers ?? [])
          setNotifications(d.notifications ?? [])
          setTerminalTasks(d.recent_terminal_tasks ?? [])
          setInTransitOrders(d.in_transit_orders ?? [])

          setAgentActive(d.profile.is_agent_active || false) // Fallback to profile field if available
          setSessionKeyAddress(d.balances?.public_session_key_address) // Set session key if available from bootstrap
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
        setSseEnabled(true) // Enable SSE after initial data loads
      }
    })()
  }, [])

  // SSE handlers for real-time updates
  const handleSSEHandlers = useCallback(() => ({
    onInventoryEvent: (data: Record<string, unknown>) => {
      const eventType = data.event_type as string | undefined
      const itemId = data.item_id as string | undefined
      const qtyChange = data.quantity_change as number | undefined

      if (eventType === 'invoice_paid') {
        // An order is in transit — inventory snapshot will come from dashboard_update
        setInTransitOrders(prev => [...prev, data as unknown as InTransitOrder])
      }

      if (eventType === 'restock') {

      }
    },

    onNotification: (data: Record<string, unknown>) => {
      const notif = data as unknown as ServerNotification

      setNotifications(prev => {
        const existing = prev.find(n => n.id === notif.id)

        if (existing) {
          return prev.map(n => {
            if (n.id !== notif.id) return n

            return {
              ...notif,
              // 🔥 preserve local "read" if already true
              read: existing.read || notif.read,
            }
          })
        }

        return [notif, ...prev]
      })
    },

    onAgentLog: (data: Record<string, unknown>) => {
      const logData = {
        task_id: (data.task_id ?? '') as string,
        agent_name: (data.agent_name ?? 'unknown') as string,
        action_taken: (data.action_taken ?? '') as string,
        text: (data.text ?? '') as string,
        type: (data.type ?? 'info') as LogType,
        tool_name: (data.tool_name ?? '') as string,
        timestamp: (data.created_at ?? new Date().toISOString()) as string,
      }

      setTerminalTasks(prev => {
        const idx = prev.findIndex(t => t.task_id === logData.task_id);
        let next: TerminalTask[];

        if (idx >= 0) {
          const updated = [...prev];
          // FIX: Spread entries to create a fresh array reference
          const task = {
            ...updated[idx],
            entries: [...updated[idx].entries]
          };

          if (logData.tool_name === 'reasoning') {
            task.reasoning = logData.text.replace(/^» /, '').replace(/\u00bb /, '');
            task.status = 'completed';
          } else {
            task.entries.push({
              tool: logData.tool_name || logData.action_taken,
              input_brief: logData.text,
              output_brief: null,
              status: 'success' as const,
            });
          }
          updated[idx] = task;
          next = updated;
        } else {
          const newTask: TerminalTask = {
            task_id: logData.task_id,
            task_header: logData.text,
            agent_name: logData.agent_name,
            entries: [],
            reasoning: null,
            status: 'running',
            timestamp: logData.timestamp,
          };
          next = [...prev, newTask];
        }

        // Always slice at the end so the limit applies to updates and additions
        return next.slice(-50);
      });
    },

    onAgentTask: (data: Record<string, unknown>) => {
      // Task-level update (completion/failure)
      const taskId = data.task_id as string | undefined
      if (!taskId) return

      setTerminalTasks(prev => {
        const idx = prev.findIndex(t => t.task_id === taskId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            status: (data.status ?? 'completed') as 'running' | 'completed' | 'failed',
            reasoning: (data.reasoning ?? null) as string | null,
          }
          return updated
        }
        return prev
      })
    },
    onDashboardUpdate: (data: Record<string, unknown>) => {
      const type = data.type as string | undefined
      const itemId = data.item_id as string | undefined
      if (type === 'inventory_snapshot' && itemId) {
        setInventoryItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? {
                ...item,
                quantity: data.quantity as number,
                in_transit_quantity: (data.in_transit_quantity ?? item.in_transit_quantity) as number,
              }
              : item
          )
        )
      }
      if (type === 'balance_update') {
        setBalances(prev => ({ ...prev, usdt: data.usdt_balance as number }))
      }
    },
    onTaskEvent: (_data: Record<string, unknown>) => {
      // Task queue events are already reflected via onAgentLog/onAgentTask/onDashboardUpdate
    },
  }), [])

  // Zerodev session callbacks
  const handleConfigureSession = async (result: EnableSessionResult) => {
    setSessionKeyAddress(result.sessionKeyAddress)
    setSessionApproval(result.serializedApproval)
    setSessionExpiry(result.expiryTimestamp)
    setSmartAccountAddress(result.smartAccountAddress)

    // Send approval string + smart account address to backend for storage
    try {
      console.log('Saving session approval to backend...', result)
      const response = await saveSessionApproval(result)

      if (!response.success) {
        throw new Error('Failed to save session approval to backend')
      }

    } catch (err) {
      console.error('Failed to save session approval to backend:', err)
    }
  }

  const handleRevokeSession = async () => {
    try {
      await toggleAgentActiveForOrg(false)
      const data = await revokeSessionKeyApproval()
      if (!data.success) {
        throw new Error('Failed to revoke session on server')
      }
    } catch (err) {
      console.error('Failed to revoke session on server:', err)
    }
    setSessionKeyAddress(undefined)
    setSessionApproval(undefined)
    setSessionExpiry(0)
    setAgentActive(false)
    setSmartAccountAddress(undefined)
  }

  const handleConfirmTransit = async (orderId: string) => {
    try {
      const res = await confirmItemTransit(orderId)
      if (!res.success) {
        toast.error('Failed to confirm transit — server returned an error')
        return
      }
      setInTransitOrders(prev => prev.filter(o => o.id !== orderId))
      toast.success('Transit confirmed')
    } catch (err) {
      console.error('Failed to confirm transit:', err)
      toast.error('Failed to confirm transit — network error')
    }
  }

  const sseHandlers = handleSSEHandlers()

  useSSE(sseEnabled, baseUrl, sseHandlers, access_token)

  const navigationTabs = [
    { id: 'home', label: 'Home' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'profile', label: 'Profile' },
    { id: 'agent', label: 'Agent' },
  ]

  return (
    <div className="h-screen bg-background flex flex-col lg:flex-row">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col bg-sidebar border-r border-sidebar-border shadow-sm h-screen flex-shrink-0">
        {/* Logo */}
        <div className="px-8 py-8 border-b border-sidebar-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Storacle</h1>
            <p className="text-xs text-sidebar-foreground/60">Supply Chain Hub</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 text-left font-medium ${activeTab === tab.id
                ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30'
                }`}
            >
              <span className="text-sm">{tab.label}</span>{tab.id === 'notifications' && notifications.some(n => !n.read) && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none bg-destructive text-destructive-foreground text-sm font-bold rounded-full">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Desktop Compact Terminal - Fixed at Bottom */}
        <div className="border-t border-sidebar-border flex-shrink-0">
          <DesktopCompactTerminal
            onOpen={() => setTerminalOpen(true)}
            agentActive={agentActive}
            latestLog={terminalTasks.length > 0 ? {
              message: terminalTasks[0].entries.length > 0
                ? terminalTasks[0].entries[0].output_brief ?? terminalTasks[0].entries[0].input_brief
                : terminalTasks[0].task_header,
              timestamp: new Date(terminalTasks[0].timestamp),
            } : undefined}
            logCount={terminalTasks.length}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden h-screen">
        {/* Mobile Header - Hidden on desktop */}
        <div className="lg:hidden sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Storacle</h1>
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">S</span>
              </div>
            </div>
            <CompactTerminal
              onOpen={() => setTerminalOpen(true)}
              agentActive={agentActive}
              latestLog={terminalTasks.length > 0 ? {
                message: terminalTasks[0].entries.length > 0
                  ? terminalTasks[0].entries[0].output_brief ?? terminalTasks[0].entries[0].input_brief
                  : terminalTasks[0].task_header,
                timestamp: new Date(terminalTasks[0].timestamp),
              } : undefined}
              logCount={terminalTasks.length}
            />
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-4 lg:px-10 py-8 lg:py-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            ) : (
              <>
                {/* Content based on active tab */}
                {activeTab === 'home' && (
                  <HomeSection
                    balances={balances}
                    inventoryItems={inventoryItems}
                    inTransitOrders={inTransitOrders}
                    onConfirmTransit={handleConfirmTransit}
                  />
                )}
                {activeTab === 'inventory' && (
                  <InventoryManagement
                    inventoryItems={inventoryItems}
                    onInventoryChange={setInventoryItems}
                    suppliers={suppliers}
                    onSuppliersChange={setSuppliers}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationsSection
                    notifications={notifications}
                    onMarkAsRead={(id) => {
                      markNotificationAsRead(id).then(result => {
                        if (result.success) {
                          setNotifications(prev =>
                            prev.map(n => n.id === id ? { ...n, read: true } : n)
                          )
                        } else {
                          toast.error('Failed to mark notification as read')
                        }
                      })
                    }}
                    onDelete={() => {
                      // No-op: server does not support notification deletion, only mark-as-read
                    }}
                  />
                )}
                {activeTab === 'profile' && (
                  <ProfileSection
                    profile={profile}
                    onUpdateProfile={(p: Omit<FullProfile, 'smart_account_address' | 'is_agent_active'>) =>
                      setProfile((prevProfile) => ({
                        ...prevProfile,
                        ...p,
                      }))
                    }
                  />
                )}
                {activeTab === 'agent' && (
                  <AITerminal
                    fullscreen={false}
                    agentActive={agentActive}
                    onAgentToggle={setAgentActive}
                    inventoryItems={inventoryItems}
                    terminalTasks={terminalTasks}
                    suppliers={suppliers}
                    sessionKeyAddress={sessionKeyAddress}
                    sessionExpiry={sessionExpiry}
                    onConfigureSession={handleConfigureSession}
                    onRevokeSession={handleRevokeSession}
                    smartAccountAddress={smartAccountAddress as `0x${string}`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation - Hidden on desktop */}
        <div className="lg:hidden">
          <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* Fullscreen Terminal Modal */}
      {terminalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-4xl bg-background border border-border rounded-lg flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
                  <h3 className="text-xs md:text-sm font-semibold text-muted-foreground">AI Terminal</h3>
                </div>
                <p className="text-xs text-muted-foreground/70">Live operations log</p>
              </div>
              <button
                onClick={() => setTerminalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-md leading-none"
              >
                ✕
              </button>
            </div>
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              <AITerminal
                fullscreen
                agentActive={agentActive}
                onAgentToggle={setAgentActive}
                inventoryItems={inventoryItems}
                terminalTasks={terminalTasks}
                suppliers={suppliers}
                sessionKeyAddress={sessionKeyAddress}
                sessionExpiry={sessionExpiry}
                onConfigureSession={handleConfigureSession}
                onRevokeSession={handleRevokeSession}
                smartAccountAddress={smartAccountAddress as `0x${string}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
