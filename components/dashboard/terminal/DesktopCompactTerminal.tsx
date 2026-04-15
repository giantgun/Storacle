'use client'

interface DesktopCompactTerminalProps {
  onOpen?: () => void
  agentActive?: boolean
  latestLog?: { message: string; timestamp: Date }
  logCount?: number
}

export default function DesktopCompactTerminal({
  onOpen,
  agentActive = true,
  latestLog,
  logCount = 0,
}: DesktopCompactTerminalProps) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex flex-col gap-3 px-4 py-4 bg-primary/5 border-t border-border hover:bg-primary/10 transition-colors group"
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${agentActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs font-semibold text-foreground">Terminal</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${agentActive ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
          {agentActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Log Display */}
      <div className="flex items-start gap-2 min-h-6">
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {latestLog
            ? latestLog.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '--:--'}
        </span>
        <span className="text-xs font-mono text-primary group-hover:text-primary-foreground transition-colors truncate text-left flex-1">
          {latestLog ? latestLog.message : 'Connecting to agents...'}
        </span>
      </div>

      {/* Expand Icon */}
      <div className="flex justify-end">
        <svg className="w-3 h-3 text-primary/60 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </button>
  )
}
