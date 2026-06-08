"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "invoisell-sidebar-collapsed"

export const SIDEBAR_WIDTH_EXPANDED = 256
export const SIDEBAR_WIDTH_COLLAPSED = 80

type SidebarContextValue = {
  collapsed: boolean
  width: number
  setCollapsed: (value: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setCollapsedState(localStorage.getItem(STORAGE_KEY) === "true")
    } catch {
      // Ignorar errores de almacenamiento.
    }
    setHydrated(true)
  }, [])

  const persist = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // Ignorar errores de almacenamiento.
    }
  }, [])

  const setCollapsed = useCallback(
    (value: boolean) => {
      setCollapsedState(value)
      persist(value)
    },
    [persist]
  )

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      persist(next)
      return next
    })
  }, [persist])

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  const value = useMemo(
    () => ({
      collapsed,
      width: hydrated ? width : SIDEBAR_WIDTH_EXPANDED,
      setCollapsed,
      toggleCollapsed,
    }),
    [collapsed, hydrated, width, setCollapsed, toggleCollapsed]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebarLayout() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarLayout debe usarse dentro de SidebarProvider")
  }
  return context
}

export function SidebarMain({ children, className }: { children: React.ReactNode; className?: string }) {
  const { width } = useSidebarLayout()

  return (
    <main
      className={className}
      style={{
        marginLeft: width,
        transition: "margin-left 300ms ease",
      }}
    >
      {children}
    </main>
  )
}
