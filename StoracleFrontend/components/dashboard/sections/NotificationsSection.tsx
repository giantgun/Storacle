'use client'

import type { ServerNotification } from '@/lib/types/sse-events'

interface NotificationsSectionProps {
  notifications: ServerNotification[]
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export default function NotificationsSection({ notifications, onMarkAsRead, onDelete }: NotificationsSectionProps) {

  const unreadCount = notifications.filter(n => !n.read).length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-2">Stay updated with your supply chain events</p>
        </div>
        {unreadCount > 0 && (
          <span className="px-4 py-2 bg-destructive-foreground text-destructive text-sm font-bold rounded-lg">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-base">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">You&apos;ll see important updates here</p>
          </div>
        ) : (
          notifications.map(notification => {
            const typeStyles = {
              alert: 'border-destructive/30 bg-destructive/5',
              success: 'border-green-500/30 bg-green-500/5',
              info: 'border-primary/30 bg-primary/5'
            }
            const typeIcons = {
              alert: '⚠',
              success: '✓',
              info: 'ℹ'
            }
            const type = notification.type as keyof typeof typeStyles
            return (
              <div
                key={notification.id}
                className={`border rounded-xl p-5 transition-all hover:shadow-sm ${
                  notification.read
                    ? 'bg-card border-border'
                    : typeStyles[type] || typeStyles.info
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className={`text-xl flex-shrink-0 pt-0.5 ${
                      type === 'alert' ? 'text-destructive' :
                      type === 'success' ? 'text-green-600 dark:text-green-400' :
                      'text-primary'
                    }`}>
                      {typeIcons[type] || typeIcons.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{notification.title}</p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="px-3 py-1.5 bg-primary text-xs text-primary-foreground font-semibold rounded-lg hover:bg-primary/80 transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
