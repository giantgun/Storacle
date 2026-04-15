'use client'

import React from 'react'

interface BaseModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  actions?: React.ReactNode
  maxWidth?: string
  isDesktop?: boolean
}

export default function BaseModal({
  isOpen,
  title,
  children,
  onClose,
  actions,
  maxWidth = 'max-w-md',
  isDesktop = false,
}: BaseModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4 lg:p-8">
      <div
        className={`w-full bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-2xl ${
          isDesktop
            ? `${maxWidth} h-auto max-h-[80vh] animate-in zoom-in-95`
            : 'max-h-[90vh] lg:max-w-2xl animate-in slide-in-from-bottom-8 lg:zoom-in-95 duration-300'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-border bg-background/50">
          <h3 className="font-bold text-foreground text-lg lg:text-xl">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg p-1 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="border-t border-border p-4 lg:p-6 bg-background/50 sticky bottom-0 space-y-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
