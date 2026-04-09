"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  FileSpreadsheet,
  Eye,
  Inbox,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/lib/firebase-client"

type DateMode = "currentMonth" | "previousMonth" | "range"

type ConfigResponse = {
  success: boolean
  config: {
    email: string
    provider: "google" | "microsoft"
    nylas?: {
      connected: boolean
      grantId?: string
      connectedAt?: string
      lastSyncAt?: string
      webhookEnabled?: boolean
    }
  } | null
}

type CandidateMessage = {
  messageId: string
  subject: string
  fromName: string
  fromEmail: string
  date: number
  acceptanceStatus: string
  hasThreeRequiredAttachments: boolean
  xmlCount: number
  pdfCount: number
  totalAttachments: number
  attachments: Array<{ id: string; filename: string; contentType: string; size: number }>
  invoiceSummary: {
    tipoDocumento: string
    clave: string
    numeroConsecutivo: string
    emisorNombre: string
    emisorId: string
    receptorNombre: string
    receptorId: string
    fechaEmision: string
    condicionVenta: string
    moneda: string
    tipoCambio: number
    totalComprobante: number
    totalImpuesto: number
    totalExonerado: number
    lineas: Array<{
      numeroLinea: number
      detalle: string
      cantidad: number
      subtotal: number
      impuesto: number
      totalLinea: number
      tasaIvaPrincipal: number
      impuestos?: Array<{ tarifa: number; monto: number; exonerado: number }>
    }>
    ivaPorTarifa: Array<{ tarifa: number; monto: number }>
  } | null
  preferredPdfAttachmentId?: string
  preferredPdfFilename?: string
  uniqueValidationId?: string
  alreadyProcessed?: boolean
}

type SelectedCompanyData = {
  id?: string
  name?: string
  nombreComercial?: string
  brandColor?: string
  razonSocial?: string
  identificationType?: string
  identification?: string
}

type CompanyFiscalData = {
  razonSocial: string
  identificationType: string
  identification: string
}

type ProcessedRecord = {
  id: string
  uniqueId: string
  messageId?: string
  subject: string
  acceptanceStatus: string
  date: number
  processedAt: string
  attachments?: CandidateMessage["attachments"]
  preferredPdfAttachmentId?: string
  preferredPdfFilename?: string
  invoiceSummary?: CandidateMessage["invoiceSummary"]
  receptionEmail: string
}

type ProcessProgress = {
  total: number
  completed: number
  processed: number
  skipped: number
  currentBatch: number
  totalBatches: number
}

export default function AcceptanceInvoicesPage() {
  const { user } = useAuth()
  const [companyId, setCompanyId] = useState("")
  const [companyData, setCompanyData] = useState<SelectedCompanyData | null>(null)
  const [companyFiscalData, setCompanyFiscalData] = useState<CompanyFiscalData | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [isEditingConfig, setIsEditingConfig] = useState(false)
  const [email, setEmail] = useState("")
  const [provider, setProvider] = useState<"google" | "microsoft" | "">("")
  const [connected, setConnected] = useState(false)
  const [oauthConnecting, setOauthConnecting] = useState(false)

  const [activeTab, setActiveTab] = useState("processed")
  const [dateMode, setDateMode] = useState<DateMode>("currentMonth")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loadingResults, setLoadingResults] = useState(false)

  const [processedRows, setProcessedRows] = useState<ProcessedRecord[]>([])
  const [unprocessedRows, setUnprocessedRows] = useState<CandidateMessage[]>([])

  const [showProcessModal, setShowProcessModal] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState<ProcessProgress>({
    total: 0,
    completed: 0,
    processed: 0,
    skipped: 0,
    currentBatch: 0,
    totalBatches: 0,
  })
  const [processingErrors, setProcessingErrors] = useState<string[]>([])

  const [previewAttachment, setPreviewAttachment] = useState<{ messageId: string; attachmentId: string; filename: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false)
  const [toCalendarOpen, setToCalendarOpen] = useState(false)
  const [detailSummary, setDetailSummary] = useState<CandidateMessage["invoiceSummary"] | null>(null)
  const oauthWatcherRef = useRef<number | null>(null)
  const resultsRequestIdRef = useRef(0)

  function sanitizeFiscalChunk(value?: string): string {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "")
  }

  function buildUiUniqueFiscalId(params: {
    uniqueId?: string
    messageId?: string
    consecutivo?: string
    emisorId?: string
  }): string {
    const explicit = sanitizeFiscalChunk(params.uniqueId)
    if (explicit) return explicit

    const consecutivo = sanitizeFiscalChunk(params.consecutivo)
    const emisorId = sanitizeFiscalChunk(params.emisorId)
    if (consecutivo && emisorId) return `${consecutivo}-${emisorId}`

    return sanitizeFiscalChunk(params.messageId)
  }

  const processedUniqueIdsInFilter = useMemo(() => {
    const set = new Set<string>()
    for (const item of processedRows) {
      const key = buildUiUniqueFiscalId({
        uniqueId: item.uniqueId,
        messageId: item.messageId,
        consecutivo: item.invoiceSummary?.numeroConsecutivo,
        emisorId: item.invoiceSummary?.emisorId,
      })
      if (key) set.add(key)
    }
    return set
  }, [processedRows])

  const validUnprocessedRows = useMemo(
    () =>
      unprocessedRows.filter((item) => {
        if (item.alreadyProcessed) return false
        if (item.xmlCount < 2 || item.pdfCount < 1) return false
        const uniqueKey = buildUiUniqueFiscalId({
          uniqueId: item.uniqueValidationId,
          messageId: item.messageId,
          consecutivo: item.invoiceSummary?.numeroConsecutivo,
          emisorId: item.invoiceSummary?.emisorId,
        })
        if (uniqueKey && processedUniqueIdsInFilter.has(uniqueKey)) return false
        // La vista "No procesados" se rige solo por patrón de adjuntos (2 XML + 1 PDF).
        return true
      }),
    [unprocessedRows, processedUniqueIdsInFilter]
  )

  const eligibleVisible = useMemo(
    () =>
      validUnprocessedRows.filter(
        (item) =>
          item.acceptanceStatus === "ACEPTADO" &&
          Boolean(item.invoiceSummary) &&
          (item.invoiceSummary?.tipoDocumento === "FacturaElectronica" ||
            item.invoiceSummary?.tipoDocumento === "FacturaElectronicaCompra")
      ),
    [validUnprocessedRows]
  )

  const selectedEligible = useMemo(
    () => eligibleVisible.filter((item) => selectedMessageIds.includes(item.messageId)),
    [eligibleVisible, selectedMessageIds]
  )

  const selectedIvaTotal = useMemo(
    () => selectedEligible.reduce((sum, item) => sum + Number(item.invoiceSummary?.totalImpuesto || 0), 0),
    [selectedEligible]
  )
  const selectedComprobanteTotal = useMemo(
    () => selectedEligible.reduce((sum, item) => sum + Number(item.invoiceSummary?.totalComprobante || 0), 0),
    [selectedEligible]
  )
  const acceptedUnprocessedCount = useMemo(
    () => validUnprocessedRows.filter((row) => row.acceptanceStatus === "ACEPTADO").length,
    [validUnprocessedRows]
  )
  const rangeIncomplete = dateMode === "range" && (!fromDate || !toDate)
  const rangeInvalid = dateMode === "range" && Boolean(fromDate && toDate && fromDate > toDate)

  type ProcessedSortKey = "processedAtDesc" | "processedAtAsc" | "consecutivoAsc" | "consecutivoDesc" | "emisorAsc" | "ivaDesc"
  type UnprocessedSortKey = "dateDesc" | "dateAsc" | "consecutivoAsc" | "consecutivoDesc" | "emisorAsc" | "ivaDesc"

  const [processedSort, setProcessedSort] = useState<ProcessedSortKey>("processedAtDesc")
  const [unprocessedSort, setUnprocessedSort] = useState<UnprocessedSortKey>("dateDesc")

  const processedRowsSorted = useMemo(() => {
    const list = [...processedRows]
    const compareStrings = (a: unknown, b: unknown) =>
      String(a || "").localeCompare(String(b || ""), "es-CR", { numeric: true, sensitivity: "base" })

    const compareNumber = (a: unknown, b: unknown) => {
      const na = Number(a || 0)
      const nb = Number(b || 0)
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
    }

    list.sort((a, b) => {
      switch (processedSort) {
        case "processedAtAsc":
          return new Date(a.processedAt || 0).getTime() - new Date(b.processedAt || 0).getTime()
        case "consecutivoAsc":
          return compareStrings(a.invoiceSummary?.numeroConsecutivo, b.invoiceSummary?.numeroConsecutivo)
        case "consecutivoDesc":
          return compareStrings(b.invoiceSummary?.numeroConsecutivo, a.invoiceSummary?.numeroConsecutivo)
        case "emisorAsc":
          return (
            compareStrings(a.invoiceSummary?.emisorNombre, b.invoiceSummary?.emisorNombre) ||
            compareStrings(a.invoiceSummary?.emisorId, b.invoiceSummary?.emisorId)
          )
        case "ivaDesc":
          return compareNumber(b.invoiceSummary?.totalImpuesto, a.invoiceSummary?.totalImpuesto)
        case "processedAtDesc":
        default:
          return new Date(b.processedAt || 0).getTime() - new Date(a.processedAt || 0).getTime()
      }
    })

    return list
  }, [processedRows, processedSort])

  const validUnprocessedRowsSorted = useMemo(() => {
    const list = [...validUnprocessedRows]
    const compareStrings = (a: unknown, b: unknown) =>
      String(a || "").localeCompare(String(b || ""), "es-CR", { numeric: true, sensitivity: "base" })

    const compareNumber = (a: unknown, b: unknown) => {
      const na = Number(a || 0)
      const nb = Number(b || 0)
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
    }

    list.sort((a, b) => {
      switch (unprocessedSort) {
        case "dateAsc":
          return Number(a.date || 0) - Number(b.date || 0)
        case "consecutivoAsc":
          return compareStrings(a.invoiceSummary?.numeroConsecutivo, b.invoiceSummary?.numeroConsecutivo)
        case "consecutivoDesc":
          return compareStrings(b.invoiceSummary?.numeroConsecutivo, a.invoiceSummary?.numeroConsecutivo)
        case "emisorAsc": {
          const emisorA = a.invoiceSummary?.emisorNombre || a.fromName || a.fromEmail
          const emisorB = b.invoiceSummary?.emisorNombre || b.fromName || b.fromEmail
          return (
            compareStrings(emisorA, emisorB) ||
            compareStrings(a.invoiceSummary?.emisorId, b.invoiceSummary?.emisorId)
          )
        }
        case "ivaDesc":
          return compareNumber(b.invoiceSummary?.totalImpuesto, a.invoiceSummary?.totalImpuesto)
        case "dateDesc":
        default:
          return Number(b.date || 0) - Number(a.date || 0)
      }
    })

    return list
  }, [validUnprocessedRows, unprocessedSort])

  const [processedPage, setProcessedPage] = useState(0)
  const [processedPageSize, setProcessedPageSize] = useState(10)
  const [unprocessedPage, setUnprocessedPage] = useState(0)
  const [unprocessedPageSize, setUnprocessedPageSize] = useState(10)

  useEffect(() => {
    setProcessedPage(0)
  }, [processedRowsSorted.length, processedPageSize, dateMode, fromDate, toDate, processedSort])

  useEffect(() => {
    setUnprocessedPage(0)
  }, [validUnprocessedRowsSorted.length, unprocessedPageSize, dateMode, fromDate, toDate, unprocessedSort])

  const processedPageSafe = useMemo(() => {
    const pages = Math.max(1, Math.ceil(processedRowsSorted.length / processedPageSize))
    return Math.min(processedPage, pages - 1)
  }, [processedRowsSorted.length, processedPage, processedPageSize])

  const processedPages = useMemo(() => {
    return Math.max(1, Math.ceil(processedRowsSorted.length / processedPageSize))
  }, [processedRowsSorted.length, processedPageSize])

  const processedPageRows = useMemo(() => {
    const start = processedPageSafe * processedPageSize
    const end = start + processedPageSize
    return processedRowsSorted.slice(start, end)
  }, [processedRowsSorted, processedPageSafe, processedPageSize])

  const unprocessedPageSafe = useMemo(() => {
    const pages = Math.max(1, Math.ceil(validUnprocessedRowsSorted.length / unprocessedPageSize))
    return Math.min(unprocessedPage, pages - 1)
  }, [validUnprocessedRowsSorted.length, unprocessedPage, unprocessedPageSize])

  const unprocessedPages = useMemo(() => {
    return Math.max(1, Math.ceil(validUnprocessedRowsSorted.length / unprocessedPageSize))
  }, [validUnprocessedRowsSorted.length, unprocessedPageSize])

  const unprocessedPageRows = useMemo(() => {
    const start = unprocessedPageSafe * unprocessedPageSize
    const end = start + unprocessedPageSize
    return validUnprocessedRowsSorted.slice(start, end)
  }, [validUnprocessedRowsSorted, unprocessedPageSafe, unprocessedPageSize])

  useEffect(() => {
    const id = localStorage.getItem("selectedCompanyId") || ""
    const storedCompanyData = localStorage.getItem("selectedCompanyData")
    setCompanyId(id)
    if (storedCompanyData) {
      try {
        const parsed = JSON.parse(storedCompanyData) as SelectedCompanyData
        setCompanyData(parsed)
      } catch {
        setCompanyData(null)
      }
    }
  }, [])

  useEffect(() => {
    if (!companyId || !user?.tenantId) return

    let cancelled = false
    const loadCompanyFiscalData = async () => {
      try {
        const response = await fetch(`/api/companies?tenantId=${encodeURIComponent(user.tenantId)}`)
        if (!response.ok) return
        const companies = (await response.json()) as Array<Record<string, any>>
        const selected = companies.find((item) => String(item?.id || "") === companyId)
        if (!selected || cancelled) return

        setCompanyFiscalData({
          razonSocial: String(selected.razonSocial || selected.name || selected.nombreComercial || "").trim(),
          identificationType: String(selected.identificationType || "").trim(),
          identification: String(selected.identification || selected.cedula || selected.taxId || "").trim(),
        })
      } catch {
        // Silencioso para no interrumpir la pantalla de validación.
      }
    }

    void loadCompanyFiscalData()
    return () => {
      cancelled = true
    }
  }, [companyId, user?.tenantId])

  function getIdentificationTypeLabel(type: string): string {
    const normalized = String(type || "").trim()
    if (normalized === "01") return "Física"
    if (normalized === "02") return "Jurídica"
    if (normalized === "03") return "DIMEX"
    if (normalized === "04") return "NITE"
    return normalized || "Sin definir"
  }

  useEffect(() => {
    if (!companyId) return
    loadConfig(companyId)
  }, [companyId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthStatus = params.get("oauth")
    if (!oauthStatus || !companyId) return

    if (oauthStatus === "success") {
      toast.success("Conexion OAuth completada.")
      void loadConfig(companyId)
    } else if (oauthStatus === "error") {
      toast.error("No se pudo completar la conexion OAuth.")
    }

    params.delete("oauth")
    const nextQuery = params.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
    window.history.replaceState({}, "", nextUrl)
  }, [companyId])

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!event?.data || event.data.type !== "NYLAS_OAUTH_RESULT") return
      if (event.origin !== window.location.origin) return

      if (oauthWatcherRef.current !== null) {
        window.clearInterval(oauthWatcherRef.current)
        oauthWatcherRef.current = null
      }

      setOauthConnecting(false)
      if (event.data.status === "success") {
        toast.success("OAuth completado. Verificando conexión...")
        if (companyId) {
          await loadConfig(companyId)
        }
      } else {
        toast.error(event.data.message || "No se pudo completar la conexion OAuth.")
      }
    }

    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      if (oauthWatcherRef.current !== null) {
        window.clearInterval(oauthWatcherRef.current)
        oauthWatcherRef.current = null
      }
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId || !email) return
    if (rangeIncomplete || rangeInvalid) return
    if (activeTab === "processed") {
      void loadProcessed()
    } else {
      void loadUnprocessed()
    }
  }, [activeTab, companyId, email, dateMode, fromDate, toDate, rangeIncomplete, rangeInvalid])

  async function loadConfig(targetCompanyId: string) {
    setLoadingConfig(true)
    try {
      const response = await fetch(`/api/nylas/config?companyId=${encodeURIComponent(targetCompanyId)}`)
      const data = (await response.json()) as ConfigResponse
      if (data?.config) {
        setEmail(data.config.email || "")
        setProvider(data.config.provider || "")
        setConnected(Boolean(data.config.nylas?.connected))
        setIsEditingConfig(false)
      } else {
        setEmail("")
        setProvider("")
        setConnected(false)
        setIsEditingConfig(true)
      }
    } catch (error) {
      toast.error("No se pudo cargar la configuracion de recepcion.")
    } finally {
      setLoadingConfig(false)
    }
  }

  async function handleSaveConfig() {
    if (!companyId || !email.includes("@")) {
      toast.error("Ingrese un correo valido.")
      return
    }
    setSavingConfig(true)
    try {
      const response = await fetch("/api/nylas/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "No se pudo guardar.")

      setProvider(data.provider)
      setIsEditingConfig(false)
      toast.success("Configuracion guardada correctamente.")
      await loadConfig(companyId)
      await startOAuthPopupFlow(companyId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error guardando configuracion.")
    } finally {
      setSavingConfig(false)
    }
  }

  async function startOAuthPopupFlow(targetCompanyId: string) {
    setOauthConnecting(true)
    const startUrl = `/api/nylas/oauth/start?companyId=${encodeURIComponent(targetCompanyId)}`
    const popup = window.open(startUrl, "nylas_oauth", "width=900,height=760")
    if (!popup) {
      setOauthConnecting(false)
      throw new Error("El navegador bloqueo la ventana emergente de OAuth.")
    }

    try {
      if (oauthWatcherRef.current !== null) {
        window.clearInterval(oauthWatcherRef.current)
        oauthWatcherRef.current = null
      }

      let attempts = 0
      let inFlight = false
      const maxAttempts = 30
      const watcher = window.setInterval(async () => {
        if (inFlight) return
        inFlight = true
        attempts += 1

        try {
          const configResponse = await fetch(`/api/nylas/config?companyId=${encodeURIComponent(targetCompanyId)}`)
          const configData = (await configResponse.json()) as ConfigResponse
          const connectedNow = Boolean(configData?.config?.nylas?.connected)

          if (connectedNow) {
            window.clearInterval(watcher)
            oauthWatcherRef.current = null
            await loadConfig(targetCompanyId)
            setOauthConnecting(false)
            toast.success("Conexion con Nylas completada.")
            return
          }

          if (attempts >= maxAttempts) {
            window.clearInterval(watcher)
            oauthWatcherRef.current = null
            await loadConfig(targetCompanyId)
            setOauthConnecting(false)
            toast.error("OAuth finalizado, pero no se detectó conexión en la configuración. Revise logs del callback.")
          }
        } catch {
          if (attempts >= maxAttempts) {
            window.clearInterval(watcher)
            oauthWatcherRef.current = null
            setOauthConnecting(false)
          }
        } finally {
          inFlight = false
        }
      }, 1000)
      oauthWatcherRef.current = watcher
    } catch (error) {
      popup.close()
      setOauthConnecting(false)
      toast.error(error instanceof Error ? error.message : "Error iniciando OAuth.")
    }
  }

  function buildDateQuery(): string {
    const params = new URLSearchParams()
    params.set("dateMode", dateMode)
    if (dateMode === "range" && fromDate && toDate) {
      params.set("fromDate", fromDate)
      params.set("toDate", toDate)
    }
    return params.toString()
  }

  async function loadUnprocessed() {
    if (!companyId) return
    const requestId = ++resultsRequestIdRef.current
    setLoadingResults(true)
    try {
      const query = buildDateQuery()
      const response = await fetch(`/api/nylas/messages/unprocessed?companyId=${encodeURIComponent(companyId)}&${query}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Error cargando no procesados")
      const rows = (data?.messages || []) as CandidateMessage[]
      if (requestId !== resultsRequestIdRef.current) return
      setUnprocessedRows(rows)
    } catch (error) {
      if (requestId !== resultsRequestIdRef.current) return
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar correos.")
    } finally {
      if (requestId === resultsRequestIdRef.current) {
      setLoadingResults(false)
      }
    }
  }

  async function loadProcessed() {
    if (!companyId || !email) return
    const requestId = ++resultsRequestIdRef.current
    setLoadingResults(true)
    try {
      const query = buildDateQuery()
      const response = await fetch(
        `/api/nylas/messages/processed?companyId=${encodeURIComponent(companyId)}&receptionEmail=${encodeURIComponent(
          email
        )}&${query}`
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Error cargando procesados")
      if (requestId !== resultsRequestIdRef.current) return
      setProcessedRows((data?.records || []) as ProcessedRecord[])
    } catch (error) {
      if (requestId !== resultsRequestIdRef.current) return
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar procesados.")
    } finally {
      if (requestId === resultsRequestIdRef.current) {
      setLoadingResults(false)
      }
    }
  }

  function toggleSelectMessage(messageId: string, checked: boolean) {
    setSelectedMessageIds((prev) => {
      if (checked) return [...new Set([...prev, messageId])]
      return prev.filter((id) => id !== messageId)
    })
  }

  function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function processBatchWithRetry(batch: CandidateMessage[], maxRetries = 2) {
    let attempt = 0
    let lastError: Error | null = null

    while (attempt <= maxRetries) {
    try {
      const response = await fetch("/api/nylas/messages/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
            selectedCandidates: batch,
        }),
      })
      const data = await response.json()
        if (!response.ok) {
          const message = data?.error || "No se pudieron procesar facturas"
          const retriable = response.status >= 500 || response.status === 429
          if (retriable && attempt < maxRetries) {
            await sleep(450 * (attempt + 1))
            attempt += 1
            continue
          }
          throw new Error(message)
        }
        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Fallo inesperado procesando lote.")
        if (attempt < maxRetries) {
          await sleep(450 * (attempt + 1))
          attempt += 1
          continue
        }
        break
      }
    }

    throw lastError || new Error("No se pudo procesar el lote.")
  }

  async function handleProcessSelected() {
    if (!companyId) return
    if (selectedEligible.length === 0) {
      toast.error("No hay documentos seleccionados para procesar.")
      return
    }

    const batchSize = 10
    const batches = chunkArray(selectedEligible, batchSize)
    setProcessProgress({
      total: selectedEligible.length,
      completed: 0,
      processed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: batches.length,
    })
    setProcessingErrors([])
    setProcessing(true)
    try {
      let completed = 0
      let totalProcessed = 0
      let totalSkipped = 0
      const batchErrors: string[] = []
      const processedMessageIds = new Set<string>()
      const processedPayloads: any[] = []

      for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i]
        setProcessProgress((prev) => ({ ...prev, currentBatch: i + 1 }))
        try {
          const data = await processBatchWithRetry(batch, 2)
          totalProcessed += Number(data?.processedCount || 0)
          totalSkipped += Number(data?.skippedCount || 0)
          const processed = Array.isArray(data?.processed) ? data.processed : []
          for (const p of processed) {
            if (p?.messageId) processedMessageIds.add(String(p.messageId))
          }
          processedPayloads.push(...processed)
        } catch (error) {
          batchErrors.push(`Lote ${i + 1}: ${error instanceof Error ? error.message : "Error desconocido"}`)
          totalSkipped += batch.length
        } finally {
          completed += batch.length
          setProcessProgress((prev) => ({
            ...prev,
            completed,
            processed: totalProcessed,
            skipped: totalSkipped,
          }))
        }
      }

      if (batchErrors.length > 0) {
        setProcessingErrors(batchErrors)
      }
      toast.success(`Procesadas: ${totalProcessed}. Omitidas: ${totalSkipped}.`)
      setShowProcessModal(false)
      setSelectedMessageIds([])

      // Actualiza UI sin recargar: quita recién procesados de "No procesados"
      if (processedMessageIds.size > 0) {
        setUnprocessedRows((prev) => prev.filter((row) => !processedMessageIds.has(row.messageId)))
      }

      // Si el usuario está en "Procesados", agrega los nuevos a la lista local.
      if (processedPayloads.length > 0) {
        const newProcessed: ProcessedRecord[] = processedPayloads.map((p) => ({
          id: String(p.uniqueId || p.id || p.messageId || ""),
          uniqueId: String(p.uniqueId || ""),
          subject: String(p.subject || ""),
          acceptanceStatus: String(p.acceptanceStatus || ""),
          date: Number(p.date || 0),
          processedAt: String(p.processedAt || new Date().toISOString()),
          invoiceSummary: p.invoiceSummary || null,
          receptionEmail: String(p.receptionEmail || email || ""),
        }))

        setProcessedRows((prev) => {
          const merged = [...newProcessed, ...prev]
          // Ordena por processedAt desc para que se vea consistente
          return merged.sort((a, b) => new Date(b.processedAt || 0).getTime() - new Date(a.processedAt || 0).getTime())
        })
      }

      setActiveTab("processed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error procesando facturas.")
    } finally {
      setProcessing(false)
    }
  }

  async function handleExportExcel() {
    try {
      const rows = processedRows
      if (rows.length === 0) {
        toast.error("No hay datos para exportar con los filtros actuales.")
        return
      }
      const ExcelJS = await import("exceljs")
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "FacturaElectronica"
      workbook.created = new Date()

      const allTarifas = Array.from(
        new Set(rows.flatMap((item) => (item.invoiceSummary?.ivaPorTarifa || []).map((it) => Number(it.tarifa || 0))))
      ).sort((a, b) => a - b)

      const toNum = (value: unknown): number => {
        const parsed = Number(value || 0)
        return Number.isFinite(parsed) ? parsed : 0
      }
      const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100
      const formatExcelDate = (value: string | number): string => {
        const raw = typeof value === "number" ? new Date(value * 1000) : new Date(String(value || ""))
        if (Number.isNaN(raw.getTime())) return String(value || "")
        return new Intl.DateTimeFormat("es-CR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(raw)
      }
      const currencySymbol = (code: string): string => {
        const normalized = String(code || "CRC").toUpperCase()
        if (normalized === "USD") return "$"
        if (normalized === "CRC") return "₡"
        return normalized
      }
      const tcStatus = (moneda: string, tc: number): string => {
        const normalized = String(moneda || "CRC").toUpperCase()
        if (normalized === "USD" && tc === 1) return "Pendiente por TC"
        if (normalized === "USD") return "Aplicado"
        return "No requerido"
      }
      const toCRC = (value: number, moneda: string, tc: number): number | string => {
        const normalized = String(moneda || "CRC").toUpperCase()
        if (normalized === "USD" && tc === 1) return "Pendiente por TC"
        if (normalized === "USD") return round2(value * tc)
        return round2(value)
      }
      const columnLabel = (n: number): string => {
        let num = n
        let out = ""
        while (num > 0) {
          const mod = (num - 1) % 26
          out = String.fromCharCode(65 + mod) + out
          num = Math.floor((num - 1) / 26)
        }
        return out
      }

      const summarySheet = workbook.addWorksheet("Resumen Ejecutivo")
      type ColDef = { header: string; key: string; width: number; numeric?: boolean }
      const summaryColumns: ColDef[] = [
        { header: "Correo Recepcion", key: "receptionEmail", width: 30 },
        { header: "Tipo Documento", key: "tipoDocumento", width: 24 },
        { header: "Consecutivo", key: "consecutivo", width: 28 },
        { header: "Emisor", key: "emisor", width: 30 },
        { header: "Cedula Emisor", key: "emisorId", width: 20 },
        { header: "Receptor", key: "receptor", width: 30 },
        { header: "Fecha Emision", key: "fechaEmision", width: 22 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Moneda", key: "moneda", width: 12 },
        { header: "Simbolo", key: "simbolo", width: 10 },
        { header: "Tipo Cambio", key: "tipoCambio", width: 14, numeric: true },
        { header: "Estado TC", key: "estadoTC", width: 18 },
        { header: "Subtotal (sin IVA)", key: "subtotal", width: 18, numeric: true },
        { header: "Subtotal en CRC", key: "subtotalCRC", width: 18 },
        { header: "Total IVA", key: "totalIva", width: 16, numeric: true },
        { header: "Total IVA en CRC", key: "totalIvaCRC", width: 18 },
        { header: "Total lineas (con IVA)", key: "totalLineas", width: 22, numeric: true },
        { header: "Total lineas en CRC", key: "totalLineasCRC", width: 20 },
        { header: "Total Comprobante", key: "totalComprobante", width: 20, numeric: true },
        { header: "Total Comprobante en CRC", key: "totalComprobanteCRC", width: 24 },
        { header: "Total Exonerado", key: "totalExonerado", width: 18, numeric: true },
        { header: "Total Exonerado en CRC", key: "totalExoneradoCRC", width: 22 },
      ]
      for (const tarifa of allTarifas) {
        summaryColumns.push({ header: `IVA ${tarifa}%`, key: `iva_${tarifa}`, width: 14, numeric: true })
        summaryColumns.push({ header: `IVA ${tarifa}% en CRC`, key: `iva_${tarifa}_crc`, width: 18 })
      }
      summarySheet.columns = summaryColumns.map((col) => ({ header: col.header, key: col.key, width: col.width }))

      for (const item of rows) {
        const summary = item.invoiceSummary
        const lineas = summary?.lineas || []
        const moneda = String(summary?.moneda || "CRC").toUpperCase()
        const tipoCambioValue = toNum(summary?.tipoCambio || 1) || 1
        const estadoTC = tcStatus(moneda, tipoCambioValue)
        const subtotal = lineas.length
          ? round2(lineas.reduce((sum, line) => sum + toNum(line?.subtotal), 0))
          : round2(Math.max(toNum(summary?.totalComprobante) - toNum(summary?.totalImpuesto), 0))
        const totalLineas = lineas.length
          ? round2(
              lineas.reduce((sum, line) => {
                const exoneradoLinea = (line?.impuestos || []).reduce((acc, tax) => acc + toNum(tax?.exonerado), 0)
                const totalLinea = toNum(line?.totalLinea) || toNum(line?.subtotal) + toNum(line?.impuesto) - exoneradoLinea
                return sum + totalLinea
              }, 0)
            )
          : round2(toNum(summary?.totalComprobante))

        const ivaMap = new Map<number, number>()
        for (const tax of summary?.ivaPorTarifa || []) {
          ivaMap.set(toNum(tax?.tarifa), round2(toNum(tax?.monto)))
        }

        const rowData: Record<string, string | number> = {
          receptionEmail: item.receptionEmail || email,
          tipoDocumento: summary?.tipoDocumento || "",
          consecutivo: summary?.numeroConsecutivo || "",
          emisor: summary?.emisorNombre || "",
          emisorId: summary?.emisorId || "",
          receptor: summary?.receptorNombre || "",
          fechaEmision: formatExcelDate(summary?.fechaEmision || item.date || item.processedAt),
          estado: item.acceptanceStatus || "",
          moneda,
          simbolo: currencySymbol(moneda),
          tipoCambio: tipoCambioValue,
          estadoTC,
          subtotal,
          subtotalCRC: toCRC(subtotal, moneda, tipoCambioValue),
          totalIva: round2(toNum(summary?.totalImpuesto)),
          totalIvaCRC: toCRC(round2(toNum(summary?.totalImpuesto)), moneda, tipoCambioValue),
          totalLineas,
          totalLineasCRC: toCRC(totalLineas, moneda, tipoCambioValue),
          totalComprobante: round2(toNum(summary?.totalComprobante)),
          totalComprobanteCRC: toCRC(round2(toNum(summary?.totalComprobante)), moneda, tipoCambioValue),
          totalExonerado: round2(toNum(summary?.totalExonerado)),
          totalExoneradoCRC: toCRC(round2(toNum(summary?.totalExonerado)), moneda, tipoCambioValue),
        }

        for (const tarifa of allTarifas) {
          const ivaTarifa = round2(ivaMap.get(tarifa) || 0)
          rowData[`iva_${tarifa}`] = ivaTarifa
          rowData[`iva_${tarifa}_crc`] = toCRC(ivaTarifa, moneda, tipoCambioValue)
        }

        summarySheet.addRow(rowData)
      }

      const detailSheet = workbook.addWorksheet("Detalle por Linea")
      const detailColumns: ColDef[] = [
        { header: "Correo Recepcion", key: "receptionEmail", width: 28 },
        { header: "Consecutivo", key: "consecutivo", width: 28 },
        { header: "Tipo Documento", key: "tipoDocumento", width: 24 },
        { header: "Emisor", key: "emisor", width: 28 },
        { header: "Cedula Emisor", key: "emisorId", width: 20 },
        { header: "Fecha Emision", key: "fechaEmision", width: 22 },
        { header: "Estado Factura", key: "estadoFactura", width: 16 },
        { header: "Moneda", key: "moneda", width: 10 },
        { header: "Simbolo", key: "simbolo", width: 10 },
        { header: "Tipo Cambio", key: "tipoCambio", width: 12, numeric: true },
        { header: "Estado TC", key: "estadoTC", width: 16 },
        { header: "Linea #", key: "lineaNumero", width: 10, numeric: true },
        { header: "Detalle Producto", key: "detalleProducto", width: 34 },
        { header: "Cantidad", key: "cantidad", width: 12, numeric: true },
        { header: "Subtotal Linea (sin IVA)", key: "subtotalLinea", width: 20, numeric: true },
        { header: "Subtotal Linea en CRC", key: "subtotalLineaCRC", width: 20 },
        { header: "Tarifa IVA Linea", key: "tarifaIvaLinea", width: 16, numeric: true },
        { header: "IVA Linea", key: "ivaLinea", width: 14, numeric: true },
        { header: "IVA Linea en CRC", key: "ivaLineaCRC", width: 16 },
        { header: "Exonerado Linea", key: "exoneradoLinea", width: 16, numeric: true },
        { header: "Exonerado Linea en CRC", key: "exoneradoLineaCRC", width: 20 },
        { header: "Total Linea (con IVA)", key: "totalLinea", width: 20, numeric: true },
        { header: "Total Linea en CRC", key: "totalLineaCRC", width: 18 },
      ]
      detailSheet.columns = detailColumns.map((col) => ({ header: col.header, key: col.key, width: col.width }))

      for (const item of rows) {
        const summary = item.invoiceSummary
        const moneda = String(summary?.moneda || "CRC").toUpperCase()
        const tipoCambioValue = toNum(summary?.tipoCambio || 1) || 1
        const estadoTC = tcStatus(moneda, tipoCambioValue)
        const lineas = summary?.lineas || []
        const base = {
          receptionEmail: item.receptionEmail || email,
          consecutivo: summary?.numeroConsecutivo || "",
          tipoDocumento: summary?.tipoDocumento || "",
          emisor: summary?.emisorNombre || "",
          emisorId: summary?.emisorId || "",
          fechaEmision: formatExcelDate(summary?.fechaEmision || item.date || item.processedAt),
          estadoFactura: item.acceptanceStatus || "",
          moneda,
          simbolo: currencySymbol(moneda),
          tipoCambio: tipoCambioValue,
          estadoTC,
        }

        if (lineas.length === 0) {
          detailSheet.addRow({
            ...base,
            lineaNumero: 0,
            detalleProducto: "Sin lineas disponibles en XML",
            cantidad: 0,
            subtotalLinea: 0,
            subtotalLineaCRC: toCRC(0, moneda, tipoCambioValue),
            tarifaIvaLinea: 0,
            ivaLinea: 0,
            ivaLineaCRC: toCRC(0, moneda, tipoCambioValue),
            exoneradoLinea: 0,
            exoneradoLineaCRC: toCRC(0, moneda, tipoCambioValue),
            totalLinea: 0,
            totalLineaCRC: toCRC(0, moneda, tipoCambioValue),
          })
          continue
        }

        for (const line of lineas) {
          const subtotalLinea = round2(toNum(line?.subtotal))
          const ivaLinea = round2(toNum(line?.impuesto))
          const exoneradoLinea = round2((line?.impuestos || []).reduce((sum, tax) => sum + toNum(tax?.exonerado), 0))
          const tarifaIvaLinea =
            toNum(line?.tasaIvaPrincipal) ||
            toNum((line?.impuestos || []).sort((a, b) => toNum(b?.tarifa) - toNum(a?.tarifa))[0]?.tarifa || 0)
          const totalLinea = round2(toNum(line?.totalLinea) || subtotalLinea + ivaLinea - exoneradoLinea)

          detailSheet.addRow({
            ...base,
            lineaNumero: toNum(line?.numeroLinea),
            detalleProducto: line?.detalle || "Sin detalle",
            cantidad: toNum(line?.cantidad),
            subtotalLinea,
            subtotalLineaCRC: toCRC(subtotalLinea, moneda, tipoCambioValue),
            tarifaIvaLinea,
            ivaLinea,
            ivaLineaCRC: toCRC(ivaLinea, moneda, tipoCambioValue),
            exoneradoLinea,
            exoneradoLineaCRC: toCRC(exoneradoLinea, moneda, tipoCambioValue),
            totalLinea,
            totalLineaCRC: toCRC(totalLinea, moneda, tipoCambioValue),
          })
        }
      }

      const styleWorksheet = (sheet: any, columns: ColDef[]) => {
        const header = sheet.getRow(1)
        header.font = { bold: true, color: { argb: "FF0F172A" } }
        header.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
        header.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDFF3F4" },
        }
        sheet.views = [{ state: "frozen", ySplit: 1 }]
        sheet.autoFilter = `A1:${columnLabel(columns.length)}1`

        for (let r = 2; r <= sheet.rowCount; r += 1) {
          const row = sheet.getRow(r)
          row.alignment = { vertical: "top", wrapText: true }
        }

        columns.forEach((col, idx) => {
          if (!col.numeric) return
          for (let r = 2; r <= sheet.rowCount; r += 1) {
            const cell = sheet.getRow(r).getCell(idx + 1)
            if (typeof cell.value === "number") {
              cell.numFmt = "#,##0.00"
            }
          }
        })
      }

      styleWorksheet(summarySheet, summaryColumns)
      styleWorksheet(detailSheet, detailColumns)

      const now = new Date()
      const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
      const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const fromObj =
        dateMode === "range"
          ? (fromDate ? parseLocalDate(fromDate) : undefined) || now
          : dateMode === "previousMonth"
            ? startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
            : startOfMonth(now)
      const toObj =
        dateMode === "range"
          ? (toDate ? parseLocalDate(toDate) : undefined) || now
          : dateMode === "previousMonth"
            ? endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
            : endOfMonth(now)

      const formatDDMMYYYY = (d: Date): string =>
        new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d)

      // En Windows el "/" no es válido en nombre de archivo; usamos "-" para mantenerlo seguro.
      const fromLabel = formatDDMMYYYY(fromObj)
      const toLabel = formatDDMMYYYY(toObj)
      const fromLabelSafe = fromLabel.replace(/\//g, "-")
      const toLabelSafe = toLabel.replace(/\//g, "-")

      const fileName = `Reporte Declaracion de Compras ${fromLabelSafe} al ${toLabelSafe}.xlsx`

      const bytes = await workbook.xlsx.writeBuffer()
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success("Excel exportado correctamente (Resumen Ejecutivo + Detalle por Línea).")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error exportando Excel")
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(value || 0)
  }

  function formatSummaryAmount(value: number, currencyCode: string): string {
    const code = (currencyCode || "CRC").toUpperCase()
    try {
      return new Intl.NumberFormat("es-CR", { style: "currency", currency: code }).format(value || 0)
    } catch {
      return formatCurrency(value)
    }
  }

  function parseLocalDate(value: string): Date | undefined {
    if (!value) return undefined
    const [year, month, day] = value.split("-").map((part) => Number(part))
    if (!year || !month || !day) return undefined
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  function toInputDate(date?: Date): string {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function formatDateLabel(value: string): string {
    const parsed = parseLocalDate(value)
    if (!parsed) return "Seleccionar fecha"
    return parsed.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function formatDateTime(value?: string | number): string {
    if (value === undefined || value === null || value === "") return "—"
    const parsed = typeof value === "number" ? new Date(value * 1000) : new Date(String(value))
    if (Number.isNaN(parsed.getTime())) return String(value)
    return parsed.toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const previewUrl = useMemo(() => {
    if (!previewAttachment || !companyId) return ""
    return `/api/nylas/messages/attachment?companyId=${encodeURIComponent(companyId)}&messageId=${encodeURIComponent(
      previewAttachment.messageId
    )}&attachmentId=${encodeURIComponent(previewAttachment.attachmentId)}&filename=${encodeURIComponent(
      previewAttachment.filename
    )}`
  }, [previewAttachment, companyId])

  useEffect(() => {
    if (!previewUrl) return
    setPreviewLoading(true)
    setPreviewError("")
  }, [previewUrl])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader
        title="Aceptación Facturas"
        description="Recepcion por correo, validacion de comprobantes y procesamiento contable"
      />

      <motion.div
        className="p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base">Configuración de recepción</h3>
              <p className="text-xs text-muted-foreground">Correo de recepción y proveedor detectado para validar comprobantes.</p>
            </div>
            <Badge variant={connected ? "default" : email ? "secondary" : "destructive"} className="shadow-sm">
                  {connected ? "Conectado" : email ? "Configurado (pendiente OAuth)" : "Sin configurar"}
                </Badge>
        </div>

          <div className="grid gap-3 md:grid-cols-12 mt-4">
            <div className="md:col-span-5">
                  <Label>Correo de recepción</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recepcion@empresa.com"
                    disabled={!isEditingConfig || loadingConfig}
                  />
                </div>
            <div className="md:col-span-3">
                  <Label>Proveedor detectado</Label>
                  <div className="h-10 border rounded-md px-3 flex items-center bg-background/60">
                    {provider ? (
                      <Badge variant="secondary">{provider === "google" ? "Google" : "Microsoft"}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin detectar</span>
                    )}
                  </div>
                </div>
            <div className="md:col-span-4">
              <Label className="opacity-0">Acciones</Label>
              <div className="h-10 flex items-center justify-end gap-2">
                {isEditingConfig ? (
                  <>
                    <Button onClick={handleSaveConfig} disabled={savingConfig} className="shadow-sm">
                      {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Guardar
                    </Button>
                    {loadingConfig ? null : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (companyId) void loadConfig(companyId)
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {email ? (
                      <Button variant="outline" className="hover:border-primary/40" onClick={() => setIsEditingConfig(true)}>
                        Cambiar configuración
                      </Button>
                    ) : null}
                    {oauthConnecting ? (
                      <Button disabled className="shadow-sm">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Conectando OAuth...
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa en validación</p>
              <h3 className="text-base font-semibold mt-1">{companyData?.nombreComercial || companyData?.name || "Empresa no identificada"}</h3>
              <p className="text-xs text-muted-foreground mt-1">Datos informativos para validar la recepción y el procesamiento.</p>
            </div>
            <Badge variant="outline" className="border-primary/25">
              <Building2 className="w-3 h-3 mr-1" />
              Validación activa
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
            <div className="rounded-lg border border-primary/10 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Razón social</p>
              <p className="font-medium mt-1">{companyFiscalData?.razonSocial || companyData?.name || "Sin registrar"}</p>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tipo de identificación</p>
              <p className="font-medium mt-1">{getIdentificationTypeLabel(companyFiscalData?.identificationType || companyData?.identificationType || "")}</p>
            </div>
            <div className="rounded-lg border border-primary/10 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Número de cédula</p>
              <p className="font-medium mt-1">{companyFiscalData?.identification || companyData?.identification || "Sin registrar"}</p>
            </div>
          </div>
        </Card>



        <Card className="p-4 space-y-4 border-primary/20 bg-card/80 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
            <div>
              <TabsList className="grid w-full grid-cols-2 bg-background/85 border border-primary/15 p-1 h-auto gap-2 rounded-xl">
                <TabsTrigger
                  value="processed"
                  className="h-10 text-sm font-medium rounded-lg border border-transparent data-[state=active]:border-primary/35 data-[state=active]:bg-primary/15 data-[state=active]:shadow-sm transition-all"
                >
                  Procesados
                </TabsTrigger>
                <TabsTrigger
                  value="unprocessed"
                  className="h-10 text-sm font-medium rounded-lg border border-transparent data-[state=active]:border-primary/35 data-[state=active]:bg-primary/15 data-[state=active]:shadow-sm transition-all"
                >
                  No procesados
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-background/90 via-background/75 to-primary/5 p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="rounded-xl border border-primary/15 bg-background/85 p-3 lg:flex-[1.35]">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Mostrando registros de</Label>
              <Select value={dateMode} onValueChange={(value) => setDateMode(value as DateMode)}>
                        <SelectTrigger className="w-[240px] bg-background shadow-sm border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                        <SelectContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                  <SelectItem value="currentMonth">Mes actual</SelectItem>
                  <SelectItem value="previousMonth">Mes anterior</SelectItem>
                          <SelectItem value="range">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateMode === "range" ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div>
                  <Label>Desde</Label>
                          <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
                            <PopoverTrigger className="inline-flex h-9 w-[190px] items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-background px-3 py-2 text-sm font-normal shadow-sm transition-all hover:border-primary/35 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none border-primary/20">
                              <span>{formatDateLabel(fromDate)}</span>
                              <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            </PopoverTrigger>
                            <PopoverContent className="z-[10000] w-auto p-0 border-primary/20 shadow-lg rounded-xl" align="start" sideOffset={8}>
                              <Calendar
                                mode="single"
                                selected={parseLocalDate(fromDate)}
                                onSelect={(date) => {
                                  const value = toInputDate(date)
                                  setFromDate(value)
                                  if (toDate && value && toDate < value) {
                                    setToDate(value)
                                  }
                                  setFromCalendarOpen(false)
                                }}
                                className="rounded-xl bg-card"
                              />
                            </PopoverContent>
                          </Popover>
                </div>
                <div>
                  <Label>Hasta</Label>
                          <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
                            <PopoverTrigger className="inline-flex h-9 w-[190px] items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-background px-3 py-2 text-sm font-normal shadow-sm transition-all hover:border-primary/35 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none border-primary/20">
                              <span>{formatDateLabel(toDate)}</span>
                              <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            </PopoverTrigger>
                            <PopoverContent className="z-[10000] w-auto p-0 border-primary/20 shadow-lg rounded-xl" align="start" sideOffset={8}>
                              <Calendar
                                mode="single"
                                selected={parseLocalDate(toDate)}
                                onSelect={(date) => {
                                  const value = toInputDate(date)
                                  setToDate(value)
                                  if (fromDate && value && fromDate > value) {
                                    setFromDate(value)
                                  }
                                  setToCalendarOpen(false)
                                }}
                                className="rounded-xl bg-card"
                              />
                            </PopoverContent>
                          </Popover>
                </div>
                      </div>
            ) : null}
                    <div className="sm:ml-auto">
            <Button
              onClick={() => {
                          setSelectedMessageIds(eligibleVisible.map((item) => item.messageId))
                          setProcessingErrors([])
                          setProcessProgress({
                            total: 0,
                            completed: 0,
                            processed: 0,
                            skipped: 0,
                            currentBatch: 0,
                            totalBatches: 0,
                          })
                          setShowProcessModal(true)
                        }}
                        disabled={activeTab !== "unprocessed" || eligibleVisible.length === 0}
                        className="shadow-sm"
                      >
                        Procesar facturas electrónicas válidas
            </Button>
                    </div>
                  </div>
                </div>
              </div>
              {rangeInvalid ? (
                <p className="text-xs text-destructive mt-2">El rango no es válido: "Desde" debe ser menor o igual a "Hasta".</p>
              ) : null}
          </div>

            <TabsContent value="processed" className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ordenar</Label>
                  <Select value={processedSort} onValueChange={(v) => setProcessedSort(v as ProcessedSortKey)}>
                    <SelectTrigger className="w-[260px] bg-background shadow-sm border-primary/20">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                      <SelectItem value="processedAtDesc">Más recientes</SelectItem>
                      <SelectItem value="processedAtAsc">Más antiguos</SelectItem>
                      <SelectItem value="consecutivoDesc">Consecutivo (Z-A)</SelectItem>
                      <SelectItem value="consecutivoAsc">Consecutivo (A-Z)</SelectItem>
                      <SelectItem value="emisorAsc">Emisor (A-Z)</SelectItem>
                      <SelectItem value="ivaDesc">IVA (mayor a menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    className="hover:border-primary/40 shadow-sm"
                  >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
                </div>
              </div>

              <div className="border border-primary/15 rounded-xl bg-background/70 relative shadow-sm p-4">
                <AnimatePresence mode="sync">
                  {loadingResults && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-[2px]"
                    >
                      <div className="flex items-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando procesados...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!loadingResults && processedRowsSorted.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            No hay facturas procesadas para este filtro.
                          </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {processedPageRows.map((row) => {
                      const firstPdf =
                        row.attachments?.find((item) => item.id === row.preferredPdfAttachmentId) ||
                        row.attachments?.find((item) => item.filename.toLowerCase().endsWith(".pdf"))
                      return (
                      <article key={row.id} className="rounded-xl border border-primary/15 bg-card/85 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-semibold leading-tight">
                              {row.invoiceSummary?.tipoDocumento || "Documento procesado"}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Fecha emisión: {formatDateTime(row.invoiceSummary?.fechaEmision)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Procesado: {new Date(row.processedAt).toLocaleString("es-CR")}
                            </p>
                          </div>
                            <Badge variant={row.acceptanceStatus === "ACEPTADO" ? "default" : "secondary"}>
                              {row.acceptanceStatus}
                            </Badge>
              </div>

                        <div className="mt-3 grid grid-cols-1 gap-1 text-sm">
                          <p><span className="text-muted-foreground">Consecutivo:</span> {row.invoiceSummary?.numeroConsecutivo || "—"}</p>
                          <p><span className="text-muted-foreground">Emisor:</span> {row.invoiceSummary?.emisorNombre || "—"}</p>
                          <p><span className="text-muted-foreground">Total:</span> {formatCurrency(Number(row.invoiceSummary?.totalComprobante || 0))}</p>
                          <p><span className="text-muted-foreground">IVA:</span> {formatCurrency(Number(row.invoiceSummary?.totalImpuesto || 0))}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                            variant="outline"
                            size="sm"
                            disabled={!firstPdf || !row.messageId}
                  onClick={() => {
                              if (!firstPdf || !row.messageId) return
                              setPreviewAttachment({
                                messageId: row.messageId,
                                attachmentId: firstPdf.id,
                                filename: firstPdf.filename,
                              })
                            }}
                          >
                            Ver PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!row.invoiceSummary}
                            onClick={() => setDetailSummary(row.invoiceSummary || null)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver resumen
                </Button>
              </div>
                      </article>
                      )
                    })}
                  </div>
                )}

                {!loadingResults && processedRowsSorted.length > 0 ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      Mostrando{" "}
                      {Math.min(processedRowsSorted.length, processedPageSafe * processedPageSize + 1)}-
                      {Math.min(processedRowsSorted.length, processedPageSafe * processedPageSize + processedPageSize)} de{" "}
                      {processedRowsSorted.length}
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProcessedPage((p) => Math.max(0, p - 1))}
                          disabled={processedPageSafe === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProcessedPage((p) => p + 1)}
                          disabled={processedPageSafe >= processedPages - 1}
                        >
                          Siguiente
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ver más</span>
                        <Select
                          value={String(processedPageSize)}
                          onValueChange={(v) => setProcessedPageSize(Number(v))}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} por página
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="unprocessed" className="space-y-3">
              <div className="border border-primary/15 rounded-xl bg-background/70 relative shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ordenar</Label>
                    <Select value={unprocessedSort} onValueChange={(v) => setUnprocessedSort(v as UnprocessedSortKey)}>
                      <SelectTrigger className="w-[260px] bg-background shadow-sm border-primary/20">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                        <SelectItem value="dateDesc">Más recientes</SelectItem>
                        <SelectItem value="dateAsc">Más antiguos</SelectItem>
                        <SelectItem value="consecutivoDesc">Consecutivo (Z-A)</SelectItem>
                        <SelectItem value="consecutivoAsc">Consecutivo (A-Z)</SelectItem>
                        <SelectItem value="emisorAsc">Emisor (A-Z)</SelectItem>
                        <SelectItem value="ivaDesc">IVA (mayor a menor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <AnimatePresence mode="sync">
                  {loadingResults && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-[2px]"
                    >
                      <div className="flex items-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando no procesados...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!loadingResults && validUnprocessedRowsSorted.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Inbox className="w-5 h-5 text-primary" />
                      No hay correos con patrón válido de Hacienda (2 XML + 1 PDF) para este filtro.
                          </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {unprocessedPageRows.map((row) => {
                      const firstPdf =
                        row.attachments.find((item) => item.id === row.preferredPdfAttachmentId) ||
                        row.attachments.find((item) => item.filename.toLowerCase().endsWith(".pdf"))
                      const uniqueId = row.uniqueValidationId || `${row.invoiceSummary?.numeroConsecutivo || row.messageId}-${row.invoiceSummary?.emisorId || ""}`
                        return (
                        <article key={row.messageId} className="rounded-xl border border-primary/15 bg-card/85 p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="text-base font-semibold leading-tight">
                                {row.subject || "Factura Electrónica sin asunto"}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Emisor correo: {row.fromName || row.fromEmail || "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Fecha y hora correo: {new Date(row.date * 1000).toLocaleString("es-CR")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{row.invoiceSummary?.tipoDocumento || "Documento"}</Badge>
                              <Badge variant={row.acceptanceStatus === "ACEPTADO" ? "default" : row.acceptanceStatus === "RECHAZADO" ? "destructive" : "secondary"}>
                                {row.acceptanceStatus}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-muted-foreground">ID único: {uniqueId}</p>
                            <p className="text-sm text-muted-foreground">
                              Consecutivo XML: {row.invoiceSummary?.numeroConsecutivo || "—"} | Total XML:{" "}
                              {formatSummaryAmount(
                                Number(row.invoiceSummary?.totalComprobante || 0),
                                row.invoiceSummary?.moneda || "CRC"
                              )}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant="destructive" className="rounded-full">
                              {row.xmlCount} adj. ({row.xmlCount} XML / {row.pdfCount} PDF)
                            </Badge>
                              <Button
                              variant="outline"
                                size="sm"
                                disabled={!firstPdf}
                                onClick={() =>
                                  firstPdf
                                    ? setPreviewAttachment({
                                        messageId: row.messageId,
                                        attachmentId: firstPdf.id,
                                        filename: firstPdf.filename,
                                      })
                                    : null
                                }
                              >
                              Ver PDF
                              </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!row.invoiceSummary}
                              onClick={() => setDetailSummary(row.invoiceSummary || null)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver resumen
                            </Button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {!loadingResults && validUnprocessedRowsSorted.length > 0 ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      Mostrando{" "}
                      {Math.min(
                        validUnprocessedRowsSorted.length,
                        unprocessedPageSafe * unprocessedPageSize + 1
                      )}-
                      {Math.min(
                        validUnprocessedRowsSorted.length,
                        unprocessedPageSafe * unprocessedPageSize + unprocessedPageSize
                      )} de{" "}
                      {validUnprocessedRowsSorted.length}
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnprocessedPage((p) => Math.max(0, p - 1))}
                          disabled={unprocessedPageSafe === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnprocessedPage((p) => p + 1)}
                          disabled={unprocessedPageSafe >= unprocessedPages - 1}
                        >
                          Siguiente
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ver más</span>
                        <Select
                          value={String(unprocessedPageSize)}
                          onValueChange={(v) => setUnprocessedPageSize(Number(v))}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} por página
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-7xl w-full max-h-[90vh] overflow-y-auto border-primary/20 bg-background/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle>Procesar facturas electrónicas válidas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Solo FacturaElectronica/FacturaElectronicaCompra, estado ACEPTADO y con adjuntos requeridos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-md border border-primary/15 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Seleccionadas para proceso</p>
                <p className="text-lg font-semibold">{selectedEligible.length}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Total IVA seleccionado</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedIvaTotal)}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Total comprobante seleccionado</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedComprobanteTotal)}</p>
              </div>
            </div>

            {processing ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progreso del procesamiento</span>
                  <span className="text-muted-foreground">
                    Lote {processProgress.currentBatch}/{processProgress.totalBatches}
                  </span>
                </div>
                <Progress value={processProgress.total ? (processProgress.completed / processProgress.total) * 100 : 0} />
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{processProgress.completed}/{processProgress.total} documentos</span>
                  <span>Procesadas: {processProgress.processed} · Omitidas: {processProgress.skipped}</span>
                </div>
              </div>
            ) : null}

            {processingErrors.length > 0 ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive mb-1">Se detectaron errores en algunos lotes</p>
                <div className="space-y-1 max-h-[100px] overflow-auto">
                  {processingErrors.map((item) => (
                    <p key={`proc-error-${item}`} className="text-xs text-muted-foreground">{item}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedMessageIds(eligibleVisible.map((item) => item.messageId))}
                disabled={processing || eligibleVisible.length === 0}
              >
                Marcar todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedMessageIds([])}
                disabled={processing || selectedMessageIds.length === 0}
              >
                Desmarcar todos
              </Button>
            </div>

            <div className="rounded-xl border border-primary/15 bg-background/70 shadow-sm overflow-hidden">
              <div className="max-h-[430px] overflow-auto">
              <Table className="min-w-[1100px] table-fixed text-sm">
                <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-[56px]">Sel.</TableHead>
                    <TableHead className="w-[220px]">Fecha/Hora factura</TableHead>
                    <TableHead className="w-[250px]">Consecutivo</TableHead>
                    <TableHead className="w-[280px]">Emisor</TableHead>
                    <TableHead className="w-[280px]">Receptor</TableHead>
                    <TableHead className="w-[140px] text-right">IVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleVisible.map((row) => (
                    <TableRow
                      key={row.messageId}
                      className={selectedMessageIds.includes(row.messageId) ? "bg-primary/[0.06] hover:bg-primary/[0.10]" : ""}
                    >
                      <TableCell className="align-top">
                        <Checkbox
                          checked={selectedMessageIds.includes(row.messageId)}
                          onCheckedChange={(checked) => toggleSelectMessage(row.messageId, Boolean(checked))}
                        />
                      </TableCell>
                      <TableCell className="align-top">{formatDateTime(row.invoiceSummary?.fechaEmision || row.date)}</TableCell>
                      <TableCell className="align-top !whitespace-normal break-all leading-snug">{row.invoiceSummary?.numeroConsecutivo || "—"}</TableCell>
                      <TableCell className="align-top !whitespace-normal break-words leading-snug">{row.invoiceSummary?.emisorNombre || "—"}</TableCell>
                      <TableCell className="align-top !whitespace-normal break-words leading-snug">{row.invoiceSummary?.receptorNombre || "—"}</TableCell>
                      <TableCell className="align-top text-right">{formatCurrency(Number(row.invoiceSummary?.totalImpuesto || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                IVA total seleccionado: <span className="font-semibold text-primary">{formatCurrency(selectedIvaTotal)}</span>
              </div>
              <Button onClick={handleProcessSelected} disabled={processing || selectedEligible.length === 0}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Procesar seleccionadas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null)
            setPreviewError("")
            setPreviewLoading(false)
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl w-full h-[92vh] p-0 overflow-hidden border-primary/20 bg-background/95 backdrop-blur">
          <div className="flex h-full flex-col">
            <DialogHeader className="px-5 py-4 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Vista previa PDF
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {previewAttachment?.filename || "Documento PDF"}
                  </p>
                </div>
                {previewUrl ? (
                  <div className="flex items-center gap-2 mr-10">
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Abrir
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewUrl} download={previewAttachment?.filename || "documento.pdf"}>
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>
          </DialogHeader>

            <div className="flex-1 p-5 bg-muted/20">
              <div className="relative h-full rounded-xl border border-primary/15 bg-background shadow-sm overflow-hidden">
                {previewLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-[2px]">
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando vista previa del PDF...
                    </div>
                  </div>
                ) : null}

                {previewError ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                    <div className="text-center space-y-2">
                      <p className="font-medium">No se pudo renderizar la vista previa</p>
                      <p className="text-sm text-muted-foreground">{previewError}</p>
                      {previewUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={previewUrl} target="_blank" rel="noreferrer">
                            Abrir PDF en una nueva pestaña
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {previewUrl ? (
            <iframe
              title="Vista PDF"
                    className="w-full h-full"
                    src={previewUrl}
                    onLoad={() => setPreviewLoading(false)}
                    onError={() => {
                      setPreviewLoading(false)
                      setPreviewError("El navegador no pudo mostrar el PDF embebido.")
                    }}
            />
          ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailSummary)} onOpenChange={(open) => (!open ? setDetailSummary(null) : null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-7xl w-full max-h-[90vh] overflow-y-auto border-primary/20 bg-background/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle>Resumen XML del documento</DialogTitle>
          </DialogHeader>
          {detailSummary ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><strong>Tipo:</strong> {detailSummary.tipoDocumento}</div>
                <div className="break-all"><strong>Clave:</strong> {detailSummary.clave || "—"}</div>
              <div><strong>Consecutivo:</strong> {detailSummary.numeroConsecutivo}</div>
                <div><strong>Fecha emisión:</strong> {formatDateTime(detailSummary.fechaEmision)}</div>
                <div><strong>Emisor:</strong> {detailSummary.emisorNombre || "—"}</div>
                <div><strong>Cédula emisor:</strong> {detailSummary.emisorId || "—"}</div>
                <div className="break-words"><strong>Receptor:</strong> {detailSummary.receptorNombre || "—"}</div>
                <div><strong>Cédula receptor:</strong> {detailSummary.receptorId || "—"}</div>
                <div><strong>Moneda:</strong> {detailSummary.moneda || "CRC"}</div>
                <div><strong>Tipo cambio:</strong> {Number(detailSummary.tipoCambio || 1).toFixed(6)}</div>
                <div><strong>Total comprobante:</strong> {formatSummaryAmount(Number(detailSummary.totalComprobante || 0), detailSummary.moneda || "CRC")}</div>
                <div><strong>Total IVA:</strong> {formatSummaryAmount(Number(detailSummary.totalImpuesto || 0), detailSummary.moneda || "CRC")}</div>
                <div><strong>Total exonerado:</strong> {formatSummaryAmount(Number(detailSummary.totalExonerado || 0), detailSummary.moneda || "CRC")}</div>
              </div>

              <div className="rounded-md border border-primary/15 bg-background/70 p-3">
                <p className="font-semibold mb-2">IVA por tarifa</p>
                {detailSummary.ivaPorTarifa?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {detailSummary.ivaPorTarifa.map((tax) => (
                      <div key={`tax-${tax.tarifa}`} className="rounded border border-primary/10 p-2 text-xs">
                        Tarifa {tax.tarifa}%: {formatSummaryAmount(Number(tax.monto || 0), detailSummary.moneda || "CRC")}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No se encontraron montos de IVA por tarifa en el XML.</p>
                )}
              </div>

              <div className="rounded-md border border-primary/15 bg-background/70 p-3">
                <p className="font-semibold mb-2">Líneas del documento</p>
                {detailSummary.lineas?.length ? (
                  <div className="overflow-auto max-h-[320px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Detalle</TableHead>
                          <TableHead>Cant.</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>IVA</TableHead>
                          <TableHead>Tarifa IVA</TableHead>
                          <TableHead>Total línea</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailSummary.lineas.map((line) => {
                          const tarifas = Array.from(
                            new Set((line.impuestos || []).map((it) => Number(it.tarifa || 0)).filter((t) => t > 0))
                          ).sort((a, b) => a - b)

                          const tarifaLabel = line.tasaIvaPrincipal
                            ? `${Number(line.tasaIvaPrincipal)}%`
                            : tarifas.length
                              ? `${tarifas.join(", ")}%`
                              : "—"

                          return (
                            <TableRow key={`line-${line.numeroLinea}-${line.detalle}`}>
                              <TableCell>{line.numeroLinea || "—"}</TableCell>
                              <TableCell className="max-w-[360px] truncate">{line.detalle || "—"}</TableCell>
                              <TableCell>{Number(line.cantidad || 0)}</TableCell>
                              <TableCell>{formatSummaryAmount(Number(line.subtotal || 0), detailSummary.moneda || "CRC")}</TableCell>
                              <TableCell>{formatSummaryAmount(Number(line.impuesto || 0), detailSummary.moneda || "CRC")}</TableCell>
                              <TableCell>{tarifaLabel}</TableCell>
                              <TableCell>{formatSummaryAmount(Number(line.totalLinea || 0), detailSummary.moneda || "CRC")}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">El XML no contiene líneas de detalle para mostrar.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
