"use client"

import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ElegantToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
}

const toastStyles = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
    description: 'text-emerald-700',
    accent: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    title: 'text-red-900',
    description: 'text-red-700',
    accent: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    description: 'text-amber-700',
    accent: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    description: 'text-blue-700',
    accent: 'bg-blue-500',
  },
  loading: {
    bg: 'bg-slate-50 border-slate-200',
    icon: 'text-slate-600',
    title: 'text-slate-900',
    description: 'text-slate-700',
    accent: 'bg-slate-500',
  },
}

export function ElegantToast({ toast, onRemove }: ElegantToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const Icon = toastIcons[toast.type]
  const styles = toastStyles[toast.type]

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (toast.duration && toast.type !== 'loading') {
      const timer = setTimeout(() => {
        handleRemove()
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.type])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300)
  }

  return (
    <div
      className={cn(
        'relative max-w-sm w-full mx-auto transform transition-all duration-300 ease-out',
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm',
          styles.bg,
          'hover:shadow-xl transition-shadow duration-200'
        )}
      >
        {/* Progress bar for auto-dismiss */}
        {toast.duration && toast.type !== 'loading' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/5">
            <div
              className={cn('h-full transition-all ease-linear', styles.accent)}
              style={{
                animation: `shrink ${toast.duration}ms linear forwards`,
              }}
            />
          </div>
        )}

        <div className="flex items-start p-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon
              className={cn(
                'w-5 h-5',
                styles.icon,
                toast.type === 'loading' && 'animate-spin'
              )}
            />
          </div>

          {/* Content */}
          <div className="ml-3 flex-1">
            <h4 className={cn('text-sm font-semibold', styles.title)}>
              {toast.title}
            </h4>
            {toast.description && (
              <p className={cn('mt-1 text-sm', styles.description)}>
                {toast.description}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={cn(
                    'text-xs font-medium underline hover:no-underline transition-all',
                    styles.icon
                  )}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleRemove}
            className={cn(
              'flex-shrink-0 ml-2 p-1 rounded-lg hover:bg-black/5 transition-colors',
              styles.icon
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Toast Container
interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <ElegantToast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts((prev) => [...prev, newToast])
    
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const success = (title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'success',
      title,
      description,
      duration: 4000,
      ...options,
    })
  }

  const error = (title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'error',
      title,
      description,
      duration: 6000,
      ...options,
    })
  }

  const warning = (title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'warning',
      title,
      description,
      duration: 5000,
      ...options,
    })
  }

  const info = (title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'info',
      title,
      description,
      duration: 4000,
      ...options,
    })
  }

  const loading = (title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'loading',
      title,
      description,
      duration: 0, // No auto-dismiss
      ...options,
    })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    loading,
  }
}
