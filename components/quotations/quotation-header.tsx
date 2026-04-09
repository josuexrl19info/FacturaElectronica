"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/firebase-client"
import { Eye, Sparkles, ReceiptText, CalendarDays, Loader2 } from "lucide-react"
import { QuotationContactData, QuotationSettings, QuotationStatus } from "@/components/quotations/types"

type QuotationHeaderProps = {
  status: QuotationStatus
  autosaveAt: string | null
  onStatusChange: (status: QuotationStatus) => void
  onPreview: () => void
  settings: QuotationSettings
  onSettingsChange: (settings: Partial<QuotationSettings>) => void
  onContactDataChange: (data: QuotationContactData) => void
}

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
}

export function QuotationHeader({
  status,
  autosaveAt,
  onStatusChange,
  onPreview,
  settings,
  onSettingsChange,
  onContactDataChange,
}: QuotationHeaderProps) {
  const { user } = useAuth()
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [identification, setIdentification] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [createAsClient, setCreateAsClient] = useState(false)
  const [searchingContact, setSearchingContact] = useState(false)
  const [contactLookupSource, setContactLookupSource] = useState<"none" | "clients" | "hacienda">("none")
  const [existingClientId, setExistingClientId] = useState<string | null>(null)
  const [activityCode, setActivityCode] = useState("")
  const [activityDescription, setActivityDescription] = useState("")

  const parsedDueDate = useMemo(() => {
    if (!settings.dueDate) return undefined
    const date = new Date(`${settings.dueDate}T00:00:00`)
    return Number.isNaN(date.getTime()) ? undefined : date
  }, [settings.dueDate])

  useEffect(() => {
    onContactDataChange({
      identification,
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      createAsClient,
      existingClientId,
      activityCode,
      activityDescription,
    })
  }, [
    identification,
    contactName,
    contactPhone,
    contactEmail,
    createAsClient,
    existingClientId,
    activityCode,
    activityDescription,
    onContactDataChange,
  ])

  async function lookupContactByIdentification(nextIdentification: string) {
    const cleanId = nextIdentification.replace(/\D/g, "")
    setIdentification(cleanId)
    setContactName("")
    setExistingClientId(null)
    setActivityCode("")
    setActivityDescription("")
    setContactLookupSource("none")

    if (cleanId.length < 9 || !user?.tenantId) {
      setSearchingContact(false)
      return
    }

    try {
      setSearchingContact(true)
      const selectedCompanyId = localStorage.getItem("selectedCompanyId")
      if (!selectedCompanyId) return

      const clientsResponse = await fetch(
        `/api/clients?tenantId=${encodeURIComponent(user.tenantId)}&companyId=${encodeURIComponent(selectedCompanyId)}`,
      )
      const clientsPayload = await clientsResponse.json()
      if (clientsResponse.ok) {
        const existing = (clientsPayload.clients || []).find(
          (client: { identification?: string }) =>
            String(client.identification || "").replace(/\D/g, "") === cleanId,
        )

        if (existing) {
          setExistingClientId(String(existing.id || ""))
          setContactName(String(existing.name || existing.commercialName || ""))
          setContactPhone(String(existing.phone || ""))
          setContactEmail(String(existing.email || ""))
          setActivityCode(String(existing.economicActivity?.codigo || ""))
          setActivityDescription(String(existing.economicActivity?.descripcion || ""))
          setContactLookupSource("clients")
          return
        }
      }

      const haciendaResponse = await fetch(
        `/api/hacienda/company-info?identificacion=${encodeURIComponent(cleanId)}`,
      )
      const haciendaPayload = await haciendaResponse.json()
      if (haciendaResponse.ok && haciendaPayload?.nombre) {
        setContactName(String(haciendaPayload.nombre))
        const principalActivity = (haciendaPayload.actividades || []).find(
          (activity: { tipo?: string }) => String(activity?.tipo || "").toUpperCase() === "P",
        ) || (haciendaPayload.actividades || [])[0]
        if (principalActivity) {
          setActivityCode(String(principalActivity.codigo || ""))
          setActivityDescription(String(principalActivity.descripcion || ""))
        }
        setContactLookupSource("hacienda")
      }
    } catch (error) {
      console.error("Error consultando persona por cédula:", error)
    } finally {
      setSearchingContact(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/15 bg-card/80 backdrop-blur-sm p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Nueva Cotizacion</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(["draft", "sent", "approved"] as QuotationStatus[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onStatusChange(item)}
                className={cn(
                  "rounded-full border px-3 py-1 transition-colors",
                  item === status
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABEL[item]}
              </button>
            ))}
            <Badge variant="secondary" className="ml-0 md:ml-2">
              Estado: {STATUS_LABEL[status]}
            </Badge>
            <span className="text-muted-foreground">
              Guardado automatico: {autosaveAt ? new Date(autosaveAt).toLocaleTimeString("es-CR") : "pendiente"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={onPreview}>
            <Eye className="h-4 w-4" />
            Vista previa
          </Button>
          <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            UX rapido
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-primary/15 bg-background/80 p-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Moneda</Label>
          <Select value={settings.currency} onValueChange={(value) => onSettingsChange({ currency: value as QuotationSettings["currency"] })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CRC">CRC</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vencimiento</Label>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger className="inline-flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-background px-3 py-2 text-sm font-normal shadow-sm transition-all hover:border-primary/35 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none border-primary/20">
              <span>{parsedDueDate ? parsedDueDate.toLocaleDateString("es-CR") : "Seleccionar fecha"}</span>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="z-[10000] w-auto p-0 border-primary/20 shadow-lg rounded-xl" align="start" sideOffset={8}>
              <Calendar
                mode="single"
                selected={parsedDueDate}
                onSelect={(date) => {
                  if (!date) return
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, "0")
                  const day = String(date.getDate()).padStart(2, "0")
                  onSettingsChange({ dueDate: `${year}-${month}-${day}` })
                  setDueDateOpen(false)
                }}
                initialFocus
                className="rounded-md border-0"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Descuento global %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9"
            value={settings.discountPercent === 0 ? "" : settings.discountPercent}
            placeholder="0"
            onChange={(event) => onSettingsChange({ discountPercent: Number(event.target.value || 0) })}
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/15 bg-background/80 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Información de la persona</h3>
          <div className="flex items-center gap-2">
            {searchingContact ? (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Consultando datos...
              </span>
            ) : contactLookupSource !== "none" ? (
              <Badge variant="outline">{contactLookupSource === "clients" ? "Cliente existente" : "Datos desde Hacienda"}</Badge>
            ) : null}
            {activityCode && (
              <Badge variant="secondary">
                Act. principal: {activityCode} - {activityDescription || "Sin descripción"}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cédula</Label>
            <Input
              value={identification}
              placeholder="Ej: 3101123456"
              onChange={(event) => {
                const value = event.target.value
                if (value.replace(/\D/g, "").length >= 1) {
                  setSearchingContact(true)
                }
                lookupContactByIdentification(value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={contactName} disabled placeholder="Se completa automáticamente" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Teléfono</Label>
            <Input
              value={contactPhone}
              placeholder="Ej: 88887777"
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Correo</Label>
            <Input
              value={contactEmail}
              placeholder="correo@cliente.com"
              onChange={(event) => setContactEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={createAsClient} onCheckedChange={(checked) => setCreateAsClient(Boolean(checked))} />
            <span>Guardar como cliente en el sistema</span>
          </label>
          {createAsClient && (
            <Badge variant={existingClientId ? "default" : "outline"}>
              {existingClientId ? "Ya existe en clientes" : "Se registrará si no existe al guardar"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

