"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Monitor, FileText, Layers, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { useCompanyPersonalization } from "@/components/providers/company-theme-provider"
import {
  mergePersonalizationIntoCompanyData,
  personalizationAreEqual,
  personalizationFromCompanyRecord,
  preparePersonalizationForFirestore,
} from "@/lib/theme/company-personalization.utils"
import type { CompanyPersonalization } from "@/lib/theme/company-personalization.types"
import { COMPANY_PERSONALIZATION_UPDATED_EVENT } from "@/lib/theme/company-personalization.types"
import { normalizeCompanyTheme, applyCompanyTheme } from "@/lib/theme/company-theme.utils"
import { SystemPersonalizationTab } from "@/components/settings/personalization/system-personalization-tab"
import { InvoicesPersonalizationTab } from "@/components/settings/personalization/invoices-personalization-tab"
import { AdditionalPersonalizationTab } from "@/components/settings/personalization/additional-personalization-tab"

export function PersonalizationSettingsPanel() {
  const { companyId, personalization: savedPersonalization, loading, refreshPersonalization } =
    useCompanyPersonalization()
  const [draft, setDraft] = useState<CompanyPersonalization>(savedPersonalization)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef(savedPersonalization)

  useEffect(() => {
    savedRef.current = savedPersonalization
    setDraft((prev) => (personalizationAreEqual(prev, savedPersonalization) ? prev : savedPersonalization))
  }, [savedPersonalization])

  const previewTheme = useMemo(
    () => normalizeCompanyTheme(draft.system, savedPersonalization.system.primaryColor),
    [draft.system, savedPersonalization.system.primaryColor]
  )

  useEffect(() => {
    applyCompanyTheme(previewTheme)
  }, [previewTheme])

  useEffect(() => {
    return () => {
      applyCompanyTheme(savedRef.current.system)
    }
  }, [])

  const hasChanges = useMemo(() => !personalizationAreEqual(draft, savedPersonalization), [draft, savedPersonalization])

  async function handleSave() {
    if (!companyId) {
      toast.error("No hay empresa seleccionada.")
      return
    }

    const normalized = preparePersonalizationForFirestore(draft)
    const toastId = toast.loading("Guardando personalización en Firebase...")
    setSaving(true)

    try {
      const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/personalization/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalization: normalized }),
      })
      const data = await response.json()

      if (!response.ok || data?.success !== true || data?.saved !== true) {
        throw new Error(data?.error || "Firebase no confirmó el guardado de la personalización")
      }

      const persisted = personalizationFromCompanyRecord({
        personalization: data.personalization,
        theme: data.theme,
        brandColor: data.brandColor,
      })

      savedRef.current = persisted
      setDraft(persisted)
      applyCompanyTheme(persisted.system)

      const storedRaw = localStorage.getItem("selectedCompanyData")
      if (storedRaw) {
        try {
          const stored = JSON.parse(storedRaw) as Record<string, unknown>
          localStorage.setItem(
            "selectedCompanyData",
            JSON.stringify(mergePersonalizationIntoCompanyData(stored, persisted))
          )
        } catch {
          // Ignorar parse inválido.
        }
      }

      window.dispatchEvent(
        new CustomEvent(COMPANY_PERSONALIZATION_UPDATED_EVENT, { detail: { forceRemote: true } })
      )

      const blocks = data.pdfTemplateBlocks ?? persisted.invoices.pdfTemplate.blocks.length
      const savedAt = data.savedAt
        ? new Date(data.savedAt).toLocaleString("es-CR")
        : new Date().toLocaleString("es-CR")

      toast.success(
        `Personalización guardada correctamente en Firebase (${blocks} bloques PDF). ${savedAt}`,
        { id: toastId, duration: 5000 }
      )

      await refreshPersonalization(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error guardando personalización.", {
        id: toastId,
      })
    } finally {
      setSaving(false)
    }
  }

  function handleResetDraft() {
    setDraft(savedPersonalization)
    applyCompanyTheme(savedPersonalization.system)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando personalización de la empresa...
      </div>
    )
  }

  if (!companyId) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Seleccione una empresa para personalizar su apariencia.
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Personalización</h2>
          <p className="text-muted-foreground">
            Configure la apariencia por empresa. Los cambios se guardan en Firebase y se aplican al cambiar de empresa.
          </p>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-background/80 p-1">
            <TabsTrigger value="system" className="gap-2">
              <Monitor className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              Facturas
            </TabsTrigger>
            <TabsTrigger value="additional" className="gap-2">
              <Layers className="h-4 w-4" />
              Adicional
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <SystemPersonalizationTab
              draftTheme={draft.system}
              onChange={(system) => setDraft((prev) => ({ ...prev, system }))}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesPersonalizationTab
              draftInvoices={draft.invoices}
              onChange={(invoices) => setDraft((prev) => ({ ...prev, invoices }))}
            />
          </TabsContent>

          <TabsContent value="additional">
            <AdditionalPersonalizationTab />
          </TabsContent>
        </Tabs>
      </div>

      <div
        className={`fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 transition-all duration-500 ${
          hasChanges ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <Button variant="outline" onClick={handleResetDraft} disabled={saving} className="rounded-full shadow-lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Descartar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-full px-6 shadow-lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar personalización
        </Button>
      </div>
    </>
  )
}
