'use client'

interface CompactTerminalProps {
  onOpen?: () => void
  agentActive?: boolean
  latestLog?: { message: string; timestamp: Date }
  logCount?: number
}

export default function CompactTerminal({
  onOpen,
  agentActive = true,
  latestLog,
  logCount = 0,
}: CompactTerminalProps) {
  const timeStr = latestLog
    ? latestLog.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/15 transition-colors text-left group"
    >
      {/* Radio Mast Icon */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${agentActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      </div>

      <div className="flex items-center gap-2 min-w-0 min-h-4 flex-1">
        <span className="text-xs font-mono text-primary truncate">
          {latestLog ? latestLog.message : 'Connecting to Storacle agents...'}
        </span>
        {logCount > 0 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            ({logCount})
          </span>
        )}
      </div>
      <span className="text-primary/60 group-hover:text-primary transition-colors flex-shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </span>
    </button>
  )
}
