"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentDocuments, type RecentDocumentItem } from "@/components/dashboard/recent-documents"
import { FileText, Users, Package, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/firebase-client"

type ApiListResponse<T> = {
  success?: boolean
  count?: number
  total?: number
  invoices?: T[]
  tickets?: T[]
  creditNotes?: T[]
  clients?: T[]
  products?: T[]
}

type DocumentBase = {
  id?: string
  consecutivo?: string
  createdAt?: string | Date
  total?: number
  totalImpuesto?: number
  status?: string
  currency?: string
  clientId?: string
  cliente?: { nombre?: string; razonSocial?: string; name?: string }
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [documentsThisMonth, setDocumentsThisMonth] = useState(0)
  const [clientsCount, setClientsCount] = useState(0)
  const [productsCount, setProductsCount] = useState(0)
  const [ivaMonthly, setIvaMonthly] = useState(0)
  const [ivaAnnual, setIvaAnnual] = useState(0)
  const [statusSummary, setStatusSummary] = useState({ accepted: 0, pending: 0, rejected: 0 })
  const [recentDocuments, setRecentDocuments] = useState<RecentDocumentItem[]>([])

  const formattedIvaMonthly = useMemo(() => formatCurrency(ivaMonthly, "CRC"), [ivaMonthly])
  const formattedIvaAnnual = useMemo(() => formatCurrency(ivaAnnual, "CRC"), [ivaAnnual])

  useEffect(() => {
    const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null
    const tenantId = user?.tenantId

    if (!tenantId) {
      setLoading(false)
      return
    }

    if (!companyId) {
      setError("No hay empresa seleccionada.")
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)

        const [
          invoicesRes,
          ticketsRes,
          creditNotesRes,
          clientsRes,
          productsRes
        ] = await Promise.all([
          fetch(`/api/invoices?tenantId=${tenantId}&companyId=${companyId}`),
          fetch(`/api/tickets?tenantId=${tenantId}&companyId=${companyId}`),
          fetch(`/api/credit-notes?tenantId=${tenantId}&companyId=${companyId}`),
          fetch(`/api/clients?tenantId=${tenantId}&companyId=${companyId}`),
          fetch(`/api/products?tenantId=${tenantId}`)
        ])

        const invoicesData = (await invoicesRes.json()) as ApiListResponse<DocumentBase>
        const ticketsData = (await ticketsRes.json()) as ApiListResponse<DocumentBase>
        const creditNotesData = (await creditNotesRes.json()) as ApiListResponse<DocumentBase>
        const clientsData = (await clientsRes.json()) as ApiListResponse<any>
        const productsData = (await productsRes.json()) as ApiListResponse<any>

        const invoices = invoicesData.invoices || []
        const tickets = ticketsData.tickets || []
        const creditNotes = creditNotesData.creditNotes || []

        const now = new Date()
        const isSameMonth = (date?: Date | null) =>
          !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
        const isSameYear = (date?: Date | null) => !!date && date.getFullYear() === now.getFullYear()

        const parsedInvoices = invoices.map((doc) => normalizeDocument(doc, "Factura Electrónica", "facturas"))
        const parsedTickets = tickets.map((doc) => normalizeDocument(doc, "Tiquete Electrónico", "tiquetes"))
        const parsedCreditNotes = creditNotes.map((doc) => normalizeDocument(doc, "Nota de Crédito", "notas-credito"))

        const allDocs = [...parsedInvoices, ...parsedTickets, ...parsedCreditNotes]
        const allDocsThisMonth = allDocs.filter((doc) => isSameMonth(doc.dateRaw))

        setDocumentsThisMonth(allDocsThisMonth.length)
        setClientsCount(clientsData.total ?? clientsData.clients?.length ?? 0)
        setProductsCount(productsData.total ?? productsData.products?.length ?? 0)

        const ivaMonthlyTotal = [...parsedInvoices, ...parsedTickets].reduce((sum, doc) => {
          if (!isSameMonth(doc.dateRaw)) return sum
          return sum + (doc.totalImpuesto || 0)
        }, 0)

        const ivaAnnualTotal = [...parsedInvoices, ...parsedTickets].reduce((sum, doc) => {
          if (!isSameYear(doc.dateRaw)) return sum
          return sum + (doc.totalImpuesto || 0)
        }, 0)

        setIvaMonthly(ivaMonthlyTotal)
        setIvaAnnual(ivaAnnualTotal)

        setStatusSummary({
          accepted: allDocs.filter((doc) => normalizeStatus(doc.status) === "aceptado").length,
          pending: allDocs.filter((doc) => normalizeStatus(doc.status) === "pendiente").length,
          rejected: allDocs.filter((doc) => normalizeStatus(doc.status) === "rechazado").length
        })

        const recent = allDocs
          .sort((a, b) => (b.dateRaw?.getTime() || 0) - (a.dateRaw?.getTime() || 0))
          .map((doc) => ({
            id: doc.displayId,
            type: doc.type,
            kind: doc.kind,
            client: doc.clientName,
            amount: formatCurrency(doc.total || 0, doc.currency || "CRC"),
            status: doc.status || "Pendiente",
            date: formatDate(doc.dateRaw)
          }))

        setRecentDocuments(recent)
      } catch (err) {
        console.error("Error cargando dashboard:", err)
        setError("No se pudo cargar la información del dashboard.")
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [user?.tenantId])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Dashboard" description="Resumen general de su actividad de facturación" />

      <div className="p-6 space-y-6">
        {error ? (
          <Card className="p-6">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Documentos Este Mes"
            value={loading ? "—" : String(documentsThisMonth)}
            change="Facturas, tiquetes y NC"
            changeType="neutral"
            icon={FileText}
            color="#10b981"
          />
          <StatCard
            title="Clientes Activos"
            value={loading ? "—" : String(clientsCount)}
            change="Total registrados"
            changeType="neutral"
            icon={Users}
            color="#3b82f6"
          />
          <StatCard
            title="Productos"
            value={loading ? "—" : String(productsCount)}
            change="Total activos"
            changeType="neutral"
            icon={Package}
            color="#f59e0b"
          />
          <StatCard
            title="IVA del Mes"
            value={loading ? "—" : formattedIvaMonthly}
            change="Facturas + Tiquetes"
            changeType="neutral"
            icon={TrendingUp}
            color="#ec4899"
          />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentDocuments
              documents={recentDocuments}
              loading={loading}
              onViewAll={() => router.push("/dashboard/documents")}
            />
          </div>

          {/* Quick Actions + IVA + Estado */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
                <button
                  className="w-full p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left font-medium"
                  onClick={() => router.push("/dashboard/documents?tab=facturas")}
                >
                  + Nueva Factura
                </button>
                <button
                  className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium"
                  onClick={() => router.push("/dashboard/clients")}
                >
                  + Nuevo Cliente
                </button>
                <button
                  className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium"
                  onClick={() => router.push("/dashboard/products")}
                >
                  + Nuevo Producto
                </button>
                <button
                  className="w-full p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-medium"
                  onClick={() => router.push("/dashboard/reports")}
                >
                  Ver Reportes
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">IVA Acumulado</h3>
              <div className="space-y-3">
                <div className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mes actual</p>
                    <p className="font-semibold text-sm">{loading ? "—" : formattedIvaMonthly}</p>
                  </div>
                </div>
                <div className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Año en curso</p>
                    <p className="font-semibold text-sm">{loading ? "—" : formattedIvaAnnual}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Estado de Documentos</h3>
              <div className="space-y-3">
                <div className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Aceptados</p>
                    <p className="font-semibold text-sm text-green-600">{loading ? "—" : statusSummary.accepted}</p>
                  </div>
                </div>
                <div className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                    <p className="font-semibold text-sm text-yellow-600">{loading ? "—" : statusSummary.pending}</p>
                  </div>
                </div>
                <div className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rechazados</p>
                    <p className="font-semibold text-sm text-red-600">{loading ? "—" : statusSummary.rejected}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function normalizeStatus(status?: string) {
  const value = (status || "").toLowerCase()
  if (value.includes("acept")) return "aceptado"
  if (value.includes("rechaz")) return "rechazado"
  return "pendiente"
}

function normalizeDate(value?: string | Date) {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value?: Date | null) {
  if (!value) return "—"
  return value.toLocaleDateString("es-CR")
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency }).format(amount)
  } catch {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(amount)
  }
}

function normalizeDocument(doc: DocumentBase, type: string, kind: "facturas" | "tiquetes" | "notas-credito") {
  const dateRaw = normalizeDate(doc.createdAt)
  const displayId = doc.consecutivo || doc.id || "N/D"
  const clientName =
    doc.cliente?.nombre ||
    doc.cliente?.razonSocial ||
    doc.cliente?.name ||
    doc.clientId ||
    "Cliente"

  return {
    type,
    kind,
    displayId,
    clientName,
    status: doc.status || "Pendiente",
    total: Number(doc.total || 0),
    totalImpuesto: Number(doc.totalImpuesto || 0),
    currency: doc.currency,
    dateRaw
  }
}
