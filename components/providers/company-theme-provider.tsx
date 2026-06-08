"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_COMPANY_THEME } from "@/lib/theme/company-theme.presets"
import {
  DEFAULT_COMPANY_PERSONALIZATION,
  mergePersonalizationIntoCompanyData,
  personalizationFromCompanyRecord,
} from "@/lib/theme/company-personalization.utils"
import { COMPANY_PERSONALIZATION_UPDATED_EVENT } from "@/lib/theme/company-personalization.types"
import type { CompanyPersonalization } from "@/lib/theme/company-personalization.types"
import { COMPANY_THEME_UPDATED_EVENT, type CompanyTheme } from "@/lib/theme/company-theme.types"
import { applyCompanyTheme, themesAreEqual } from "@/lib/theme/company-theme.utils"

type CompanyThemeContextValue = {
  companyId: string
  theme: CompanyTheme
  personalization: CompanyPersonalization
  loading: boolean
  refreshPersonalization: () => Promise<void>
  applyTheme: (theme: CompanyTheme) => void
}

const CompanyThemeContext = createContext<CompanyThemeContextValue | null>(null)

function readStoredCompany(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("selectedCompanyData")
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

async function fetchRemotePersonalization(companyId: string): Promise<CompanyPersonalization | null> {
  const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/personalization/`)
  if (!response.ok) return null
  const data = await response.json()
  return personalizationFromCompanyRecord({
    personalization: data.personalization,
    theme: data.theme,
    brandColor: data.brandColor,
  })
}

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyId] = useState("")
  const [personalization, setPersonalization] = useState<CompanyPersonalization>(DEFAULT_COMPANY_PERSONALIZATION)
  const [loading, setLoading] = useState(true)

  const applyTheme = useCallback((nextTheme: CompanyTheme) => {
    applyCompanyTheme(nextTheme)
    setPersonalization((prev) => {
      if (themesAreEqual(prev.system, nextTheme)) return prev
      return { ...prev, system: nextTheme }
    })
  }, [])

  const refreshPersonalization = useCallback(async () => {
    const storedId = localStorage.getItem("selectedCompanyId") || ""
    setCompanyId(storedId)
    if (!storedId) {
      setPersonalization(DEFAULT_COMPANY_PERSONALIZATION)
      applyCompanyTheme(DEFAULT_COMPANY_THEME)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const storedCompany = readStoredCompany()
      let nextPersonalization = personalizationFromCompanyRecord(storedCompany)

      if (!storedCompany?.personalization && !storedCompany?.theme) {
        const remote = await fetchRemotePersonalization(storedId)
        if (remote) nextPersonalization = remote
      }

      setPersonalization(nextPersonalization)
      applyCompanyTheme(nextPersonalization.system)

      if (storedCompany) {
        localStorage.setItem(
          "selectedCompanyData",
          JSON.stringify(mergePersonalizationIntoCompanyData(storedCompany, nextPersonalization))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshPersonalization()

    const onUpdated = () => {
      void refreshPersonalization()
    }

    window.addEventListener(COMPANY_PERSONALIZATION_UPDATED_EVENT, onUpdated)
    window.addEventListener(COMPANY_THEME_UPDATED_EVENT, onUpdated)
    window.addEventListener("storage", onUpdated)
    return () => {
      window.removeEventListener(COMPANY_PERSONALIZATION_UPDATED_EVENT, onUpdated)
      window.removeEventListener(COMPANY_THEME_UPDATED_EVENT, onUpdated)
      window.removeEventListener("storage", onUpdated)
    }
  }, [refreshPersonalization])

  const value = useMemo(
    () => ({
      companyId,
      theme: personalization.system,
      personalization,
      loading,
      refreshPersonalization,
      applyTheme,
    }),
    [companyId, personalization, loading, refreshPersonalization, applyTheme]
  )

  return <CompanyThemeContext.Provider value={value}>{children}</CompanyThemeContext.Provider>
}

export function useCompanyTheme() {
  const context = useContext(CompanyThemeContext)
  if (!context) {
    throw new Error("useCompanyTheme debe usarse dentro de CompanyThemeProvider")
  }
  return context
}

export function useCompanyPersonalization() {
  return useCompanyTheme()
}
