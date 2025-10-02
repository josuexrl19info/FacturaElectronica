"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { ToastContainer, useToast, Toast } from '@/components/ui/elegant-toast'

interface ToastContextType {
  success: (title: string, description?: string, options?: Partial<Toast>) => string
  error: (title: string, description?: string, options?: Partial<Toast>) => string
  warning: (title: string, description?: string, options?: Partial<Toast>) => string
  info: (title: string, description?: string, options?: Partial<Toast>) => string
  loading: (title: string, description?: string, options?: Partial<Toast>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

// Convenience hook with shorter name
export const useToastNotification = useToastContext
