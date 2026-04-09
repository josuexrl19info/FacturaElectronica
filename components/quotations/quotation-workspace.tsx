"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuotationHeader } from "@/components/quotations/quotation-header"
import { QuotationSidebar } from "@/components/quotations/quotation-sidebar"
import { QuotationTable } from "@/components/quotations/quotation-table"
import { QuotationContactData } from "@/components/quotations/types"
import { useQuotationStore } from "@/components/quotations/use-quotation-store"
import { useAuth } from "@/lib/firebase-client"
import { Clock3, FileOutput, FilePlus2, FileText, Loader2, MessageCircle, Timer, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

type QuotationRecord = {
  id: string
  firestoreId: string
  client: string
  amount: number
  currency: "CRC" | "USD" | "EUR"
  dueDate: string
  status: "draft" | "sent" | "approved"
  createdAt?: string | null
  updatedAt?: string | null
  raw?: Record<string, unknown>
}

function daysUntil(dateIso: string): number {
  const now = new Date()
  const target = new Date(`${dateIso}T23:59:59`)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatMoney(amount: number, currency: "CRC" | "USD" | "EUR"): string {
  const locale = currency === "CRC" ? "es-CR" : "en-US"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function QuotationWorkspace() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savingQuotation, setSavingQuotation] = useState(false)
  const [rows, setRows] = useState<QuotationRecord[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [loadingError, setLoadingError] = useState("")
  const [contactData, setContactData] = useState<QuotationContactData>({
    identification: "",
    name: "",
    phone: "",
    email: "",
    createAsClient: false,
    existingClientId: null,
    activityCode: "",
    activityDescription: "",
  })
  const { user } = useAuth()

  const {
    status,
    lines,
    settings,
    autosaveAt,
    setStatus,
    setSettings,
    addLine,
    addProductLine,
    updateLine,
    deleteLine,
    resetDraft,
  } = useQuotationStore()

  async function loadQuotations() {
    if (!user?.tenantId) return
    const selectedCompanyId = localStorage.getItem("selectedCompanyId")
    if (!selectedCompanyId) return

    try {
      setLoadingRows(true)
      setLoadingError("")
      const response = await fetch(
        `/api/quotations?tenantId=${encodeURIComponent(user.tenantId)}&companyId=${encodeURIComponent(selectedCompanyId)}`,
      )
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar las cotizaciones")
      }
      setRows((payload.quotations || []) as QuotationRecord[])
    } catch (error) {
      console.error("Error cargando cotizaciones:", error)
      setLoadingError("No se pudieron cargar las cotizaciones desde Firebase.")
      toast.error("Error al cargar cotizaciones")
    } finally {
      setLoadingRows(false)
    }
  }

  useEffect(() => {
    loadQuotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId])

  const metrics = useMemo(() => {
    const nearing = rows.filter((item) => {
      const days = daysUntil(item.dueDate)
      return days >= 0 && days <= 7
    }).length
    const expired = rows.filter((item) => daysUntil(item.dueDate) < 0).length
    const totalAmount = rows.reduce((sum, item) => sum + item.amount, 0)

    return {
      total: rows.length,
      nearing,
      expired,
      totalAmount,
    }
  }, [rows])

  function openNewQuotationModal() {
    resetDraft()
    setEditorOpen(true)
  }

  async function ensureClientIfRequired() {
    if (!contactData.createAsClient || contactData.existingClientId) return
    if (!user?.tenantId || !user?.id) return
    if (!contactData.identification || !contactData.name || !contactData.email) return

    const selectedCompanyId = localStorage.getItem("selectedCompanyId")
    if (!selectedCompanyId) return

    const identificationType = contactData.identification.length <= 9 ? "01" : "02"
    await fetch("/api/clients/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contactData.name,
        commercialName: contactData.name,
        identification: contactData.identification,
        identificationType,
        email: contactData.email,
        phone: contactData.phone,
        phoneCountryCode: "+506",
        province: "1",
        canton: "01",
        district: "01",
        otrasSenas: "",
        economicActivity: {
          codigo: contactData.activityCode || "",
          descripcion: contactData.activityDescription || "",
          estado: "A",
        },
        tenantId: user.tenantId,
        createdBy: user.id,
        selectedCompanyId,
      }),
    })
  }

  async function handleSaveQuotation() {
    if (!user?.tenantId) {
      toast.error("No se pudo identificar el tenant del usuario")
      return
    }
    const selectedCompanyId = localStorage.getItem("selectedCompanyId")
    if (!selectedCompanyId) {
      toast.error("No hay empresa seleccionada")
      return
    }

    try {
      setSavingQuotation(true)
      await ensureClientIfRequired()

      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: user.tenantId,
          companyId: selectedCompanyId,
          status: "draft",
          settings,
          contact: contactData,
          lines,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar la cotización")
      }

      toast.success("Cotización guardada en borrador")
      setEditorOpen(false)
      await loadQuotations()
    } catch (error) {
      console.error("Error guardando cotización:", error)
      toast.error("No se pudo guardar la cotización")
    } finally {
      setSavingQuotation(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Cotizaciones"
        description="Gestiona tus cotizaciones, controla vencimientos y crea nuevas propuestas en segundos."
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Panel de cotizaciones</h2>
            <p className="text-sm text-muted-foreground">Visualiza cotizaciones guardadas en Firebase y crea una nueva.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadQuotations} disabled={loadingRows}>
              {loadingRows ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
            </Button>
            <Button className="gap-2" onClick={openNewQuotationModal}>
              <FilePlus2 className="h-4 w-4" />
              Nueva cotizacion
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total cotizaciones</p>
                <p className="text-2xl font-semibold mt-1">{metrics.total}</p>
              </div>
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </Card>
          <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Proximas a vencer</p>
                <p className="text-2xl font-semibold mt-1">{metrics.nearing}</p>
              </div>
              <Clock3 className="h-5 w-5 text-amber-500" />
            </div>
          </Card>
          <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-semibold mt-1">{metrics.expired}</p>
              </div>
              <TriangleAlert className="h-5 w-5 text-red-500" />
            </div>
          </Card>
          <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto total</p>
                <p className="text-lg font-semibold mt-1">{formatMoney(metrics.totalAmount, "CRC")}</p>
              </div>
              <Timer className="h-5 w-5 text-emerald-500" />
            </div>
          </Card>
        </div>

        <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
          <h3 className="font-semibold text-base">Cotizaciones recientes</h3>
          {loadingError ? (
            <p className="mt-2 text-sm text-red-600">{loadingError}</p>
          ) : null}
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Consecutivo</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vencimiento</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Monto</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const remaining = daysUntil(item.dueDate)
                  const badgeVariant = item.status === "approved" ? "default" : item.status === "sent" ? "secondary" : "outline"

                  return (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.id}</td>
                      <td className="px-3 py-2">{item.client}</td>
                      <td className="px-3 py-2">
                        <Badge variant={badgeVariant}>
                          {item.status === "approved" ? "Aprobada" : item.status === "sent" ? "Enviada" : "Borrador"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className={remaining < 0 ? "text-red-600" : remaining <= 7 ? "text-amber-600" : ""}>
                          {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("es-CR")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.amount, item.currency)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                            Vista previa
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success("Generación PDF iniciada")}>
                            <FileOutput className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success("Flujo de envío iniciado")}>
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp/Email
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loadingRows && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No hay cotizaciones guardadas para esta empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[1400px] w-full h-[92vh] overflow-hidden p-0 border-primary/20 bg-background/95 backdrop-blur">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Nueva cotizacion</DialogTitle>
          </DialogHeader>

          <div className="h-[calc(92vh-64px)] overflow-y-auto p-4 md:p-6 space-y-4">
            <QuotationHeader
              status={status}
              autosaveAt={autosaveAt}
              onStatusChange={setStatus}
              onPreview={() => setPreviewOpen(true)}
              settings={settings}
              onSettingsChange={setSettings}
              onContactDataChange={setContactData}
            />

            <section className="space-y-4">
              <QuotationTable
                lines={lines}
                onUpdateLine={updateLine}
                onDeleteLine={deleteLine}
                onAddLine={addLine}
                onAddProductLine={addProductLine}
              />
              <div className="space-y-3">
                <QuotationSidebar lines={lines} settings={settings} />
                <div className="flex justify-end">
                  <Button onClick={handleSaveQuotation} disabled={savingQuotation} className="min-w-[220px]">
                    {savingQuotation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Guardar cotización (borrador)
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl border-primary/20">
          <DialogHeader>
            <DialogTitle>Vista previa de cotización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Card className="p-4">
              <p className="font-medium">Cliente: {contactData.name || "Sin definir"}</p>
              <p className="text-muted-foreground">Cédula: {contactData.identification || "—"}</p>
              <p className="text-muted-foreground">Correo: {contactData.email || "—"}</p>
            </Card>
            <Card className="p-4">
              <p className="font-medium mb-2">Detalle</p>
              <div className="space-y-1">
                {lines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-3 border-b pb-1">
                    <span>{line.product || "Sin producto"}</span>
                    <span>{formatMoney(line.total, settings.currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

