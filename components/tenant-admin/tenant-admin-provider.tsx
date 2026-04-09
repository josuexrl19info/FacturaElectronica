"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

const ACTIVE_TENANT_KEY = "tenantAdmin.activeTenantId"

export type TenantCatalogItem = {
  id: string
  name: string
  description?: string
  status?: string
  plan?: string
  maxUsers?: number
  maxCompanies?: number
  maxDocumentsPerMonth?: number
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  notes?: string
}

type TenantAdminContextType = {
  tenants: TenantCatalogItem[]
  activeTenantId: string
  setActiveTenantId: (tenantId: string) => void
  setTenantCatalog: (items: TenantCatalogItem[]) => void
  activeTenant: TenantCatalogItem | null
}

const TenantAdminContext = createContext<TenantAdminContextType | undefined>(undefined)

export function TenantAdminProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<TenantCatalogItem[]>([])
  const [activeTenantId, setActiveTenantIdState] = useState("")
  const [storedTenantId, setStoredTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const fromStorage = localStorage.getItem(ACTIVE_TENANT_KEY)
    if (fromStorage) setStoredTenantId(fromStorage)
  }, [])

  const setActiveTenantId = useCallback((tenantId: string) => {
    setActiveTenantIdState(tenantId)
    if (typeof window !== "undefined") {
      if (tenantId) {
        localStorage.setItem(ACTIVE_TENANT_KEY, tenantId)
      } else {
        localStorage.removeItem(ACTIVE_TENANT_KEY)
      }
    }
  }, [])

  const setTenantCatalog = useCallback(
    (items: TenantCatalogItem[]) => {
      setTenants(items)
      if (items.length === 0) {
        setActiveTenantId("")
        return
      }

      if (activeTenantId && items.some((item) => item.id === activeTenantId)) {
        return
      }

      if (storedTenantId && items.some((item) => item.id === storedTenantId)) {
        setActiveTenantId(storedTenantId)
        return
      }

      setActiveTenantId(items[0].id)
    },
    [activeTenantId, setActiveTenantId, storedTenantId]
  )

  const activeTenant = useMemo(
    () => tenants.find((item) => item.id === activeTenantId) || null,
    [tenants, activeTenantId]
  )

  const value = useMemo(
    () => ({
      tenants,
      activeTenantId,
      setActiveTenantId,
      setTenantCatalog,
      activeTenant
    }),
    [tenants, activeTenantId, setActiveTenantId, setTenantCatalog, activeTenant]
  )

  return <TenantAdminContext.Provider value={value}>{children}</TenantAdminContext.Provider>
}

export function useTenantAdminContext() {
  const context = useContext(TenantAdminContext)
  if (!context) {
    throw new Error("useTenantAdminContext debe usarse dentro de TenantAdminProvider")
  }
  return context
}
