"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/firebase-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useToastNotification } from "@/components/providers/toast-provider"
import { useTenantAdminContext } from "@/components/tenant-admin/tenant-admin-provider"
import { TenantAdminHeader } from "@/components/tenant-admin/tenant-admin-header"
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  LayoutDashboard,
  Loader2,
  Sparkles,
  Package,
  Plus,
  Save,
  Settings,
  AlertTriangle,
  Users
} from "lucide-react"
import { getTenantAdminHeaderValue, isTenantAdminEmail } from "@/lib/tenant-admin-access"
import type { ComponentType } from "react"

type AdminSection = "tenants" | "users" | "companies" | "products" | "plans" | "settings"

type TenantItem = {
  id: string
  name: string
  description?: string
  status: "active" | "inactive" | "suspended" | "trial"
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  plan?: string
  maxUsers?: number
  maxCompanies?: number
  maxDocumentsPerMonth?: number
  notes?: string
  createdAt?: string | Date
}

type TenantUser = {
  id: string
  name: string
  email: string
  roleId: string
  status: string
  createdAt?: string | Date
  lastLoginAt?: string | Date
}

type TenantCompany = {
  id: string
  nombreComercial: string
  razonSocial?: string
  identification?: string
  status?: string
  email?: string
  phone?: string
  economicActivityCode?: string
  economicActivityDescription?: string
  atvUsername?: string
  atvClientId?: string
  atvEnvironment?: string
  certificateValidTo?: string
  hasLogo?: boolean
  configFlags?: {
    hasIdentification: boolean
    hasContact: boolean
    hasGeo: boolean
    hasActivity: boolean
    hasAtv: boolean
    hasCertificate: boolean
    isConfiguredForInvoicing: boolean
  }
}

type TenantProduct = {
  id: string
  codigo?: string
  detalle?: string
  precioUnitario?: number
  currency?: string
  activo?: boolean
}

type SubscriptionPlan = {
  id: string
  code: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  currency: string
  maxDocumentsPerMonth: number
  maxCompanies: number
  includesInvoiceAcceptance: boolean
  includesAiModule: boolean
  isActive: boolean
  recommended: boolean
}

type CompanyMigrationPreview = {
  scope: {
    sourceTenantId: string
    targetTenantId: string
    companyId: string
  }
  company: {
    id: string
    name: string
    sourceTenantName: string
    targetTenantName: string
  }
  totals: {
    invoices: number
    tickets: number
    creditNotes: number
    clients: number
    documentsTotal: number
    updatesTotal: number
  }
  warnings: {
    sharedClients: number
  }
}

type CompanyMigrationResult = {
  companyId: string
  fromTenantId: string
  toTenantId: string
  updated: {
    company: number
    invoices: number
    tickets: number
    creditNotes: number
    clients: number
  }
  totals: {
    recordsUpdated: number
    documentsMoved: number
  }
}

type TenantResources = {
  tenantOverview?: {
    plan: string
    status: string
    maxUsers: number | null
    maxCompanies: number | null
    maxDocumentsPerMonth: number | null
    documentsTotal: number
    documentsThisMonth: number
    documentsLastMonth: number
    documentsRemaining: number | null
    overQuotaBy: number
    documentStatus: {
      accepted: number
      pending: number
      rejected: number
      draft: number
    }
    tenantCreatedAt?: string | Date
    nextCutoffDate?: string | Date
    nextPaymentDate?: string | Date
    daysToPayment?: number
    configuredBillingDay?: number
    hasCustomPaymentDueDate?: boolean
  }
  users: TenantUser[]
  companies: TenantCompany[]
  products: TenantProduct[]
  summary: {
    users: number
    companies: number
    products: number
    activeUsers: number
    activeProducts: number
    companiesConfigured: number
    companiesWithoutAtv: number
    companiesWithoutCertificate: number
    companiesWithoutActivity: number
    companiesWithoutGeo: number
    companiesWithoutContact: number
  }
}

const emptyResources: TenantResources = {
  tenantOverview: {
    plan: "START",
    status: "active",
    maxUsers: null,
    maxCompanies: null,
    maxDocumentsPerMonth: null,
    documentsTotal: 0,
    documentsThisMonth: 0,
    documentsLastMonth: 0,
    documentsRemaining: null,
    overQuotaBy: 0,
    documentStatus: { accepted: 0, pending: 0, rejected: 0, draft: 0 },
    daysToPayment: 0,
    configuredBillingDay: 1,
    hasCustomPaymentDueDate: false
  },
  users: [],
  companies: [],
  products: [],
  summary: {
    users: 0,
    companies: 0,
    products: 0,
    activeUsers: 0,
    activeProducts: 0,
    companiesConfigured: 0,
    companiesWithoutAtv: 0,
    companiesWithoutCertificate: 0,
    companiesWithoutActivity: 0,
    companiesWithoutGeo: 0,
    companiesWithoutContact: 0
  }
}

export default function TenantAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const toast = useToastNotification()
  const { tenants, activeTenantId, setActiveTenantId, setTenantCatalog, activeTenant } = useTenantAdminContext()

  const [loadingResources, setLoadingResources] = useState(false)
  const [initializingModule, setInitializingModule] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingTenant, setSubmittingTenant] = useState(false)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const [activeSection, setActiveSection] = useState<AdminSection>("tenants")
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false)
  const [createTenantError, setCreateTenantError] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showTenantCredentialsModal, setShowTenantCredentialsModal] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [showCompanyMigrationModal, setShowCompanyMigrationModal] = useState(false)
  const [companyToMigrate, setCompanyToMigrate] = useState<TenantCompany | null>(null)
  const [migrationTargetTenantId, setMigrationTargetTenantId] = useState("")
  const [migrationAllowSharedClients, setMigrationAllowSharedClients] = useState(false)
  const [migrationLoadingPreview, setMigrationLoadingPreview] = useState(false)
  const [migrationExecuting, setMigrationExecuting] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationPreview, setMigrationPreview] = useState<CompanyMigrationPreview | null>(null)
  const [migrationResult, setMigrationResult] = useState<CompanyMigrationResult | null>(null)
  const [resources, setResources] = useState<TenantResources>(emptyResources)

  const [tenantForm, setTenantForm] = useState({
    name: "",
    description: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    plan: "START",
    status: "active",
    notes: ""
  })

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "collaborator",
    status: "active"
  })

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    plan: "START",
    status: "active",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    notes: ""
  })

  const [planForm, setPlanForm] = useState({
    code: "",
    name: "",
    description: "",
    monthlyPrice: "",
    annualPrice: "",
    currency: "USD",
    maxDocumentsPerMonth: "",
    maxCompanies: "",
    includesInvoiceAcceptance: false,
    includesAiModule: false,
    isActive: true,
    recommended: false
  })
  const [tenantCredentials, setTenantCredentials] = useState<{
    tenantName: string
    ownerEmail: string
    temporaryPassword: string
  } | null>(null)
  const [copiedTenantCredentials, setCopiedTenantCredentials] = useState(false)

  const hasAccess = useMemo(() => isTenantAdminEmail(user?.email), [user?.email])
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-tenant-admin-email": getTenantAdminHeaderValue(user?.email)
    }),
    [user?.email]
  )

  const planOptions = useMemo(() => {
    const mapped = plans.map((plan) => ({
      value: plan.code,
      label: `${plan.name} (${plan.currency} ${plan.monthlyPrice}/mes)`
    }))

    const values = new Set(mapped.map((item) => item.value))
    if (settingsForm.plan && !values.has(settingsForm.plan)) {
      mapped.unshift({
        value: settingsForm.plan,
        label: `${settingsForm.plan} (actual)`
      })
    }
    if (tenantForm.plan && !values.has(tenantForm.plan) && tenantForm.plan !== settingsForm.plan) {
      mapped.unshift({
        value: tenantForm.plan,
        label: `${tenantForm.plan} (manual)`
      })
    }
    return mapped
  }, [plans, settingsForm.plan, tenantForm.plan])

  const migrationTargetOptions = useMemo(
    () => tenants.filter((tenant) => tenant.id !== activeTenantId),
    [tenants, activeTenantId]
  )

  useEffect(() => {
    if (!activeTenant) return
    setSettingsForm({
      name: activeTenant.name || "",
      description: activeTenant.description || "",
      plan: activeTenant.plan || "START",
      status: activeTenant.status || "active",
      ownerName: activeTenant.ownerName || "",
      ownerEmail: activeTenant.ownerEmail || "",
      ownerPhone: activeTenant.ownerPhone || "",
      notes: activeTenant.notes || ""
    })
  }, [activeTenant])

  const fetchTenants = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/tenant-admin/tenants", { headers })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron cargar los tenants")
      }
      const tenantList = data.tenants || []
      setTenantCatalog(tenantList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido cargando tenants")
    }
  }, [headers, setTenantCatalog])

  const fetchResources = useCallback(
    async (tenantId: string) => {
      if (!tenantId) {
        setResources(emptyResources)
        return
      }
      try {
        setLoadingResources(true)
        const response = await fetch(`/api/tenant-admin/tenants/${tenantId}/resources`, { headers })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || "No se pudieron cargar recursos del tenant")
        setResources({
          tenantOverview: data.tenantOverview || emptyResources.tenantOverview,
          users: data.users || [],
          companies: data.companies || [],
          products: data.products || [],
          summary: data.summary || emptyResources.summary
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando recursos del tenant")
      } finally {
        setLoadingResources(false)
      }
    },
    [headers]
  )

  const fetchPlans = useCallback(async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch("/api/tenant-admin/plans", { headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "No se pudieron cargar los planes")
      setPlans(data.plans || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando planes")
    } finally {
      setLoadingPlans(false)
    }
  }, [headers])

  const seedPlansIfNeeded = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant-admin/plans/seed", {
        method: "POST",
        headers
      })
      if (!response.ok) return
      await fetchPlans()
    } catch {
      // No bloquear flujo si falla semilla
    }
  }, [headers, fetchPlans])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/")
      return
    }
    if (!hasAccess) {
      router.push("/dashboard")
      return
    }
    let cancelled = false
    const bootstrap = async () => {
      setInitializingModule(true)
      await Promise.all([fetchTenants(), fetchPlans()])
      if (!cancelled) {
        setInitializingModule(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, hasAccess, router, fetchTenants, fetchPlans])

  useEffect(() => {
    if (!activeTenantId || !hasAccess) return
    fetchResources(activeTenantId)
  }, [activeTenantId, hasAccess, fetchResources])

  useEffect(() => {
    if (!hasAccess) return
    if (plans.length === 0) {
      seedPlansIfNeeded()
    }
  }, [hasAccess, plans.length, seedPlansIfNeeded])

  useEffect(() => {
    if (!migrationExecuting) return
    const timer = setInterval(() => {
      setMigrationProgress((prev) => (prev >= 90 ? prev : prev + 5))
    }, 280)
    return () => clearInterval(timer)
  }, [migrationExecuting])

  const handleCreateTenant = async () => {
    try {
      if (!tenantForm.name || !tenantForm.ownerName || !tenantForm.ownerEmail) {
        setCreateTenantError("Nombre del tenant, propietario y correo son requeridos.")
        return
      }

      setSubmittingTenant(true)
      setError(null)
      setCreateTenantError(null)

      const response = await fetch("/api/tenant-admin/tenants", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...tenantForm
        })
      })
      const result = await response.json()
      if (!response.ok) {
        const fieldErrors = result?.fieldErrors
        const fieldText =
          fieldErrors && typeof fieldErrors === "object"
            ? Object.entries(fieldErrors)
                .map(([field, msg]) => `${field}: ${String(msg)}`)
                .join(" · ")
            : ""
        throw new Error(
          `${result?.error || "No se pudo crear el tenant"}${fieldText ? ` (${fieldText})` : ""}`
        )
      }

      setTenantForm({
        name: "",
        description: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        plan: "START",
        status: "active",
        notes: ""
      })

      await fetchTenants()
      if (result.tenantId) {
        setActiveTenantId(result.tenantId)
        setShowCreateTenantModal(false)
        setCreateTenantError(null)
        if (result.ownerEmail && result.temporaryPassword) {
          setCopiedTenantCredentials(false)
          setTenantCredentials({
            tenantName: tenantForm.name,
            ownerEmail: result.ownerEmail,
            temporaryPassword: result.temporaryPassword
          })
          setShowTenantCredentialsModal(true)
        }
        toast.success("Tenant creado", `Ahora estás administrando: ${tenantForm.name}`)
      }
    } catch (err) {
      setCreateTenantError(err instanceof Error ? err.message : "Error desconocido creando tenant")
    } finally {
      setSubmittingTenant(false)
    }
  }

  const handleCopyTenantCredentials = async () => {
    if (!tenantCredentials) return
    const text = [
      "Credenciales de acceso - InvoSell",
      `Tenant: ${tenantCredentials.tenantName}`,
      `Correo: ${tenantCredentials.ownerEmail}`,
      `Contrasena temporal: ${tenantCredentials.temporaryPassword}`,
      "Importante: al primer ingreso debe cambiar la contrasena en la pantalla obligatoria."
    ].join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopiedTenantCredentials(true)
      toast.success("Credenciales copiadas", "Ya puedes pegarlas y enviarlas.")
      setTimeout(() => setCopiedTenantCredentials(false), 1800)
    } catch {
      setError("No se pudo copiar al portapapeles. Intenta de nuevo.")
    }
  }

  const handleUseTenant = (tenant: TenantItem) => {
    setActiveTenantId(tenant.id)
    toast.success("Tenant activo", `Ahora estás administrando: ${tenant.name}`)
  }

  const openCreatePlanModal = () => {
    setEditingPlanId(null)
    setPlanForm({
      code: "",
      name: "",
      description: "",
      monthlyPrice: "",
      annualPrice: "",
      currency: "USD",
      maxDocumentsPerMonth: "",
      maxCompanies: "",
      includesInvoiceAcceptance: false,
      includesAiModule: false,
      isActive: true,
      recommended: false
    })
    setShowPlanModal(true)
  }

  const openEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || "",
      monthlyPrice: String(plan.monthlyPrice || 0),
      annualPrice: String(plan.annualPrice || 0),
      currency: plan.currency || "USD",
      maxDocumentsPerMonth: String(plan.maxDocumentsPerMonth || 0),
      maxCompanies: String(plan.maxCompanies || 0),
      includesInvoiceAcceptance: plan.includesInvoiceAcceptance,
      includesAiModule: plan.includesAiModule,
      isActive: plan.isActive,
      recommended: plan.recommended
    })
    setShowPlanModal(true)
  }

  const savePlan = async () => {
    try {
      if (!planForm.code || !planForm.name) {
        setError("Código y nombre del plan son obligatorios.")
        return
      }
      setSavingPlan(true)
      setError(null)

      const payload = {
        code: planForm.code,
        name: planForm.name,
        description: planForm.description,
        monthlyPrice: Number(planForm.monthlyPrice || 0),
        annualPrice: Number(planForm.annualPrice || 0),
        currency: planForm.currency || "USD",
        maxDocumentsPerMonth: Number(planForm.maxDocumentsPerMonth || 0),
        maxCompanies: Number(planForm.maxCompanies || 0),
        includesInvoiceAcceptance: planForm.includesInvoiceAcceptance,
        includesAiModule: planForm.includesAiModule,
        isActive: planForm.isActive,
        recommended: planForm.recommended
      }

      const url = editingPlanId
        ? `/api/tenant-admin/plans/${editingPlanId}`
        : "/api/tenant-admin/plans"
      const method = editingPlanId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "No se pudo guardar el plan")

      setShowPlanModal(false)
      await fetchPlans()
      toast.success("Plan guardado", editingPlanId ? "Plan actualizado correctamente" : "Plan creado correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando plan")
    } finally {
      setSavingPlan(false)
    }
  }

  const openCompanyMigrationModal = (company: TenantCompany) => {
    setCompanyToMigrate(company)
    setMigrationTargetTenantId("")
    setMigrationAllowSharedClients(false)
    setMigrationPreview(null)
    setMigrationResult(null)
    setMigrationProgress(0)
    setShowCompanyMigrationModal(true)
  }

  const loadMigrationPreview = async () => {
    try {
      if (!activeTenantId || !companyToMigrate?.id || !migrationTargetTenantId) {
        setError("Selecciona tenant origen, empresa y tenant destino para generar el resumen.")
        return
      }
      setError(null)
      setMigrationResult(null)
      setMigrationLoadingPreview(true)

      const response = await fetch(`/api/tenant-admin/companies/${companyToMigrate.id}/migrate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "preview",
          sourceTenantId: activeTenantId,
          targetTenantId: migrationTargetTenantId
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "No se pudo generar el resumen de migración")
      setMigrationPreview(data.preview || null)
      setMigrationProgress(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando resumen de migración")
    } finally {
      setMigrationLoadingPreview(false)
    }
  }

  const executeCompanyMigration = async () => {
    try {
      if (!activeTenantId || !companyToMigrate?.id || !migrationTargetTenantId) {
        setError("Faltan datos para ejecutar la migración.")
        return
      }
      setError(null)
      setMigrationExecuting(true)
      setMigrationProgress(12)

      const response = await fetch(`/api/tenant-admin/companies/${companyToMigrate.id}/migrate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "execute",
          sourceTenantId: activeTenantId,
          targetTenantId: migrationTargetTenantId,
          allowSharedClients: migrationAllowSharedClients
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo ejecutar la migración")
      }

      setMigrationPreview(data.preview || null)
      setMigrationResult(data.result || null)
      setMigrationProgress(100)
      await fetchResources(activeTenantId)
      await fetchTenants()
      toast.success("Migración completada", "La empresa y sus datos asociados fueron migrados.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error ejecutando migración")
    } finally {
      setMigrationExecuting(false)
    }
  }

  const handleCreateTenantUser = async () => {
    try {
      if (!activeTenantId) {
        setError("Debes seleccionar un tenant antes de crear usuarios.")
        return
      }
      if (!userForm.name || !userForm.email || !userForm.password) {
        setError("Nombre, correo y contraseña son requeridos.")
        return
      }

      setSubmittingUser(true)
      setError(null)

      const response = await fetch("/api/tenant-admin/users/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...userForm,
          tenantId: activeTenantId
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "No se pudo crear el usuario")

      setUserForm({
        name: "",
        email: "",
        password: "",
        roleId: "collaborator",
        status: "active"
      })
      await fetchResources(activeTenantId)
      setActiveSection("users")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido creando usuario")
    } finally {
      setSubmittingUser(false)
    }
  }

  const handleSaveTenantSettings = async () => {
    try {
      if (!activeTenantId) {
        setError("Selecciona un tenant para guardar su configuración.")
        return
      }
      if (!settingsForm.name || !settingsForm.ownerName || !settingsForm.ownerEmail) {
        setError("Nombre del tenant, nombre y correo del propietario son obligatorios.")
        return
      }

      setSavingSettings(true)
      setError(null)

      const response = await fetch(`/api/tenant-admin/tenants/${activeTenantId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: settingsForm.name,
          description: settingsForm.description || null,
          ownerName: settingsForm.ownerName,
          ownerEmail: settingsForm.ownerEmail,
          ownerPhone: settingsForm.ownerPhone || null,
          status: settingsForm.status,
          plan: settingsForm.plan,
          notes: settingsForm.notes || null
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "No se pudo guardar la configuración")

      await fetchTenants()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido guardando configuración")
    } finally {
      setSavingSettings(false)
    }
  }

  const sectionMenu: Array<{
    id: AdminSection
    label: string
    icon: ComponentType<{ className?: string }>
  }> = [
    { id: "tenants", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "companies", label: "Empresas", icon: Building2 },
    { id: "products", label: "Productos", icon: Package },
    { id: "settings", label: "Configuración", icon: Settings }
  ]

  const formatDate = (value?: string | Date) => {
    if (!value) return "N/D"
    const parsed = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(parsed.getTime())) return "N/D"
    return parsed.toLocaleDateString("es-CR")
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Validando acceso al módulo...</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-lg text-center space-y-3">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">
            Este módulo de administración de tenants está habilitado temporalmente para una cuenta específica.
          </p>
          <Button onClick={() => router.push("/select-company")}>Volver a selección de empresas</Button>
        </Card>
      </div>
    )
  }

  if (initializingModule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-6"
        >
          <Card className="p-6 space-y-4 text-center">
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Loader2 className="w-10 h-10 text-primary" />
              </motion.div>
            </div>
            <h2 className="text-lg font-semibold">Cargando administración de tenants</h2>
            <p className="text-sm text-muted-foreground">
              Estamos preparando tenants, planes y configuración inicial del módulo.
            </p>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-[1500px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6">
          <Card className="p-4 h-fit xl:sticky xl:top-6 border-border/70 shadow-md bg-gradient-to-b from-card to-card/80">
            <div className="space-y-1 mb-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Panel administrativo</p>
              <h2 className="text-lg font-bold tracking-tight">Administración de Tenants</h2>
              <p className="text-xs text-muted-foreground">Gestión de suscripción y operación por organización.</p>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 mb-4 bg-background/70 text-foreground hover:bg-background hover:text-foreground"
              onClick={() => router.push("/select-company")}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a selección de empresas
            </Button>

            <Separator className="my-3" />

            <div className="space-y-1">
              {sectionMenu.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/90 hover:bg-muted/70 hover:translate-x-0.5"
                    }`}
                  >
                    <span
                      className={`inline-flex w-6 h-6 items-center justify-center rounded-md ${
                        isActive ? "bg-white/20" : "bg-muted"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>

            <Separator className="my-4" />

            <button
              onClick={() => setActiveSection("plans")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                activeSection === "plans"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/90 hover:bg-muted/70 hover:translate-x-0.5"
              }`}
            >
              <span
                className={`inline-flex w-6 h-6 items-center justify-center rounded-md ${
                  activeSection === "plans" ? "bg-white/20" : "bg-muted"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-medium">Planes</span>
            </button>

            <Separator className="my-4" />

            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tenant en foco</p>
              <p className="text-sm font-semibold truncate mt-1">{activeTenant?.name || "Sin tenant activo"}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{activeTenant?.ownerEmail || "Sin correo registrado"}</p>
            </div>

          </Card>

          <div className="space-y-5">
            {error ? (
              <Card className="p-4 border-destructive/40">
                <p className="text-sm text-destructive">{error}</p>
              </Card>
            ) : null}

            <TenantAdminHeader
              tenants={tenants}
              activeTenantId={activeTenantId}
              activeTenantName={activeTenant?.name || "Sin tenant"}
              switching={loadingResources}
              summary={{
                users: resources.summary.users,
                companies: resources.summary.companies,
                products: resources.summary.products
              }}
              onSwitchTenant={(tenantId) => {
                const nextTenant = tenants.find((item) => item.id === tenantId)
                if (!nextTenant) return
                handleUseTenant(nextTenant as TenantItem)
              }}
              onCreateTenant={() => {
                setActiveSection("tenants")
                setShowCreateTenantModal(true)
              }}
            />

            {loadingResources ? (
              <Card className="p-3">
                <p className="text-sm text-muted-foreground">Cambiando tenant y recargando módulos...</p>
              </Card>
            ) : null}

            <motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {activeSection === "tenants" ? (
                <div className="space-y-4">
                  <Card className="p-5">
                    <h3 className="font-semibold mb-4">Resumen ejecutivo del tenant activo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">Documentos emitidos (histórico)</p>
                        <p className="text-2xl font-bold mt-1">{resources.tenantOverview?.documentsTotal || 0}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">Documentos emitidos este mes</p>
                        <p className="text-2xl font-bold mt-1">{resources.tenantOverview?.documentsThisMonth || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mes anterior: {resources.tenantOverview?.documentsLastMonth || 0}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">Documentos faltantes del plan</p>
                        <p className="text-2xl font-bold mt-1">
                          {resources.tenantOverview?.documentsRemaining ?? "Sin límite"}
                        </p>
                        {resources.tenantOverview?.maxDocumentsPerMonth ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Límite plan: {resources.tenantOverview.maxDocumentsPerMonth}
                          </p>
                        ) : null}
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">Próxima fecha de cobro</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatDate(resources.tenantOverview?.nextPaymentDate)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          En {resources.tenantOverview?.daysToPayment ?? 0} días
                        </p>
                      </Card>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Estado documental del tenant</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Aceptados</p>
                          <p className="text-xl font-semibold">{resources.tenantOverview?.documentStatus.accepted || 0}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Pendientes</p>
                          <p className="text-xl font-semibold">{resources.tenantOverview?.documentStatus.pending || 0}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Rechazados</p>
                          <p className="text-xl font-semibold">{resources.tenantOverview?.documentStatus.rejected || 0}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Borradores</p>
                          <p className="text-xl font-semibold">{resources.tenantOverview?.documentStatus.draft || 0}</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Control de suscripción</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium">{resources.tenantOverview?.plan || "START"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Estado</span>
                          <span className="font-medium">{resources.tenantOverview?.status || "active"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Corte mensual estimado</span>
                          <span className="font-medium">{formatDate(resources.tenantOverview?.nextCutoffDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Fecha de pago</span>
                          <span className="font-medium">{formatDate(resources.tenantOverview?.nextPaymentDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Exceso sobre cuota</span>
                          <span className="font-medium">{resources.tenantOverview?.overQuotaBy || 0}</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Empresas configuradas para facturar</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesConfigured}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        De {resources.summary.companies} empresas del tenant activo
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin configuración ATV</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutAtv}</p>
                      <p className="text-xs text-muted-foreground mt-1">Requieren usuario, clientId y URLs ATV</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin certificado digital</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutCertificate}</p>
                      <p className="text-xs text-muted-foreground mt-1">No pueden firmar comprobantes</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin actividad económica</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutActivity}</p>
                      <p className="text-xs text-muted-foreground mt-1">Falta código de actividad para Hacienda</p>
                    </Card>
                  </div>

                </div>
              ) : null}

              {activeSection === "users" ? (
                <div className="space-y-4">
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold">Crear usuario en tenant seleccionado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Nombre completo"
                        value={userForm.name}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        type="email"
                        placeholder="Correo electrónico"
                        value={userForm.email}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                      <Input
                        type="password"
                        placeholder="Contraseña temporal"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                      <Select
                        value={userForm.roleId}
                        onValueChange={(value) => setUserForm((prev) => ({ ...prev, roleId: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Rol del usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant-admin">Administrador</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                          <SelectItem value="vendor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateTenantUser} className="gap-2" disabled={submittingUser || !activeTenantId}>
                      <Users className="w-4 h-4" />
                      {submittingUser ? "Creando usuario..." : "Crear usuario"}
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Usuarios ({resources.users.length})</h3>
                    <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                      {resources.users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay usuarios en este tenant.</p>
                      ) : (
                        resources.users.map((u) => (
                          <div key={u.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">{u.name || "Sin nombre"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge>
                              <p className="text-xs text-muted-foreground mt-1">{u.roleId || "sin rol"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              ) : null}

              {activeSection === "companies" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Empresas configuradas</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesConfigured}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        De {resources.summary.companies} empresas del tenant activo
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin ATV</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutAtv}</p>
                      <p className="text-xs text-muted-foreground mt-1">Faltan credenciales ATV completas</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin certificado</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutCertificate}</p>
                      <p className="text-xs text-muted-foreground mt-1">Sin certificado digital cargado</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sin actividad económica</p>
                      <p className="text-2xl font-bold mt-1">{resources.summary.companiesWithoutActivity}</p>
                      <p className="text-xs text-muted-foreground mt-1">Debe definirse para Hacienda</p>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Empresas del tenant ({resources.companies.length})</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Diagnóstico de configuración fiscal y operativa por empresa: identificación, contacto,
                      geolocalización, actividad económica, ATV y certificado digital.
                    </p>
                    <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
                      {resources.companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay empresas asociadas.</p>
                      ) : (
                        resources.companies.map((company) => {
                          const flags = company.configFlags || {
                            hasIdentification: false,
                            hasContact: false,
                            hasGeo: false,
                            hasActivity: false,
                            hasAtv: false,
                            hasCertificate: false,
                            isConfiguredForInvoicing: false
                          }
                          const missing: string[] = []
                          if (!flags.hasIdentification) missing.push("Identificación")
                          if (!flags.hasContact) missing.push("Contacto")
                          if (!flags.hasGeo) missing.push("Ubicación")
                          if (!flags.hasActivity) missing.push("Actividad económica")
                          if (!flags.hasAtv) missing.push("ATV")
                          if (!flags.hasCertificate) missing.push("Certificado")

                          return (
                            <div key={company.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">{company.nombreComercial}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {company.razonSocial || "Sin razón social"} · {company.email || "Sin correo"}
                                  </p>
                                </div>
                                {flags.isConfiguredForInvoicing ? (
                                  <Badge className="gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Configuración completa
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Configuración pendiente
                                  </Badge>
                                )}
                              </div>
                              {!flags.isConfiguredForInvoicing ? (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Faltantes: {missing.join(", ")}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Lista para facturación electrónica completa.
                                </p>
                              )}
                              <div className="mt-3 flex justify-end">
                                <Button
                                  variant="outline"
                                  className="text-foreground hover:text-foreground"
                                  onClick={() => openCompanyMigrationModal(company)}
                                  disabled={migrationTargetOptions.length === 0}
                                >
                                  Migrar empresa
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </Card>
                </div>
              ) : null}

              {activeSection === "products" ? (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Productos del tenant ({resources.products.length})</h3>
                  <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
                    {resources.products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay productos en este tenant.</p>
                    ) : (
                      resources.products.map((product) => (
                        <div key={product.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{product.detalle || "Sin detalle"}</p>
                            <p className="text-xs text-muted-foreground">Código: {product.codigo || "N/D"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {(product.precioUnitario || 0).toLocaleString("es-CR")} {product.currency || "CRC"}
                            </p>
                            <Badge variant={product.activo ? "default" : "secondary"}>
                              {product.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ) : null}

              {activeSection === "plans" ? (
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Mantenimiento de planes</h3>
                        <p className="text-sm text-muted-foreground">
                          Crea y edita planes de suscripción para controlar precio, límites y módulos.
                        </p>
                      </div>
                      <Button className="gap-2 w-full md:w-auto" onClick={openCreatePlanModal}>
                        <Plus className="w-4 h-4" />
                        Crear plan
                      </Button>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loadingPlans ? (
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Cargando planes...</p>
                      </Card>
                    ) : plans.length === 0 ? (
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">No hay planes creados aún.</p>
                      </Card>
                    ) : (
                      plans.map((plan) => (
                        <Card key={plan.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{plan.name}</p>
                              <p className="text-xs text-muted-foreground">Código: {plan.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {plan.recommended ? <Badge>Recomendado</Badge> : null}
                              <Badge variant={plan.isActive ? "default" : "secondary"}>
                                {plan.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground min-h-[40px]">{plan.description || "Sin descripción"}</p>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">Precio mensual:</span>{" "}
                              <span className="font-medium">
                                {plan.currency} {plan.monthlyPrice}
                              </span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Precio anual:</span>{" "}
                              <span className="font-medium">
                                {plan.currency} {plan.annualPrice}
                              </span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Documentos/mes:</span>{" "}
                              <span className="font-medium">{plan.maxDocumentsPerMonth}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Empresas:</span>{" "}
                              <span className="font-medium">{plan.maxCompanies}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Aceptación de facturas:</span>{" "}
                              <span className="font-medium">{plan.includesInvoiceAcceptance ? "Sí" : "No"}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Módulo IA:</span>{" "}
                              <span className="font-medium">{plan.includesAiModule ? "Sí" : "No"}</span>
                            </p>
                          </div>
                          <Button variant="outline" className="w-full text-foreground hover:text-foreground" onClick={() => openEditPlanModal(plan)}>
                            Editar plan
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {activeSection === "settings" ? (
                <Card className="p-5 space-y-4">
                  <h3 className="font-semibold">Configuración del tenant seleccionado</h3>
                  {!activeTenant ? (
                    <p className="text-sm text-muted-foreground">Selecciona un tenant en el menú de Tenants.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>ID del tenant (solo lectura)</Label>
                          <Input value={activeTenant.id} disabled />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Nombre del tenant</Label>
                          <Input
                            placeholder="Nombre del tenant"
                            value={settingsForm.name}
                            onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label>Descripción del tenant</Label>
                          <Input
                            placeholder="Descripción del tenant"
                            value={settingsForm.description}
                            onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Nombre del propietario</Label>
                          <Input
                            placeholder="Nombre propietario"
                            value={settingsForm.ownerName}
                            onChange={(e) => setSettingsForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Correo</Label>
                          <Input
                            placeholder="Correo propietario"
                            value={settingsForm.ownerEmail}
                            onChange={(e) => setSettingsForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Teléfono</Label>
                          <Input
                            placeholder="Teléfono propietario"
                            value={settingsForm.ownerPhone}
                            onChange={(e) => setSettingsForm((prev) => ({ ...prev, ownerPhone: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tipo de plan</Label>
                          <Select
                            value={settingsForm.plan}
                            onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, plan: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {planOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Estado del tenant</Label>
                          <Select
                            value={settingsForm.status}
                            onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Estado del tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                              <SelectItem value="suspended">Suspendido</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notas de configuración</Label>
                        <Textarea
                          placeholder="Notas de configuración del tenant"
                          rows={4}
                          value={settingsForm.notes}
                          onChange={(e) => setSettingsForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                      <Button className="gap-2" onClick={handleSaveTenantSettings} disabled={savingSettings}>
                        <Save className="w-4 h-4" />
                        {savingSettings ? "Guardando..." : "Guardar configuración"}
                      </Button>
                    </>
                  )}
                </Card>
              ) : null}
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={showCreateTenantModal} onOpenChange={setShowCreateTenantModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear nuevo tenant</DialogTitle>
            <DialogDescription>
              Registra una nueva organización y define sus límites iniciales de operación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {createTenantError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">{createTenantError}</p>
              </div>
            ) : null}
            <Input
              placeholder="Nombre del tenant"
              value={tenantForm.name}
              onChange={(e) => setTenantForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Descripción del tenant"
              value={tenantForm.description}
              onChange={(e) => setTenantForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <Input
              placeholder="Nombre propietario"
              value={tenantForm.ownerName}
              onChange={(e) => setTenantForm((prev) => ({ ...prev, ownerName: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Correo propietario"
              value={tenantForm.ownerEmail}
              onChange={(e) => setTenantForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
            />
            <Select
              value={tenantForm.plan}
              onValueChange={(value) => setTenantForm((prev) => ({ ...prev, plan: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo de plan" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Los límites de empresas y documentos se aplicarán automáticamente según el plan seleccionado.
            </p>
            <Textarea
              placeholder="Notas del tenant"
              value={tenantForm.notes}
              onChange={(e) => setTenantForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={() => {
                setShowCreateTenantModal(false)
                setCreateTenantError(null)
              }}
              disabled={submittingTenant}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateTenant} className="gap-2" disabled={submittingTenant}>
              <Plus className="w-4 h-4" />
              {submittingTenant ? "Creando..." : "Crear tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlanId ? "Editar plan" : "Crear plan"}</DialogTitle>
            <DialogDescription>
              Define precios, límites y módulos del plan para que queden disponibles en la configuración de tenants.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código del plan</Label>
              <Input
                placeholder="Ej: GROWTH"
                value={planForm.code}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del plan</Label>
              <Input
                placeholder="Ej: Growth"
                value={planForm.name}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                placeholder="Describe a quién va dirigido el plan"
                value={planForm.description}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Input
                placeholder="USD"
                value={planForm.currency}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Precio mensual</Label>
              <Input
                type="number"
                placeholder="0"
                value={planForm.monthlyPrice}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Precio anual</Label>
              <Input
                type="number"
                placeholder="0"
                value={planForm.annualPrice}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, annualPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. documentos por mes</Label>
              <Input
                type="number"
                placeholder="0"
                value={planForm.maxDocumentsPerMonth}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, maxDocumentsPerMonth: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. empresas</Label>
              <Input
                type="number"
                placeholder="0"
                value={planForm.maxCompanies}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, maxCompanies: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Módulo de aceptación de facturas</Label>
              <Select
                value={planForm.includesInvoiceAcceptance ? "yes" : "no"}
                onValueChange={(value) =>
                  setPlanForm((prev) => ({ ...prev, includesInvoiceAcceptance: value === "yes" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Incluido</SelectItem>
                  <SelectItem value="no">No incluido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Módulo de IA</Label>
              <Select
                value={planForm.includesAiModule ? "yes" : "no"}
                onValueChange={(value) => setPlanForm((prev) => ({ ...prev, includesAiModule: value === "yes" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Incluido</SelectItem>
                  <SelectItem value="no">No incluido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado del plan</Label>
              <Select
                value={planForm.isActive ? "active" : "inactive"}
                onValueChange={(value) => setPlanForm((prev) => ({ ...prev, isActive: value === "active" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan recomendado</Label>
              <Select
                value={planForm.recommended ? "yes" : "no"}
                onValueChange={(value) => setPlanForm((prev) => ({ ...prev, recommended: value === "yes" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={() => setShowPlanModal(false)}
              disabled={savingPlan}
            >
              Cancelar
            </Button>
            <Button onClick={savePlan} disabled={savingPlan}>
              {savingPlan ? "Guardando..." : editingPlanId ? "Guardar cambios" : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTenantCredentialsModal} onOpenChange={setShowTenantCredentialsModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Credenciales temporales del nuevo tenant</DialogTitle>
            <DialogDescription>
              Comparte estas credenciales de forma segura. En el primer ingreso se solicitará cambio obligatorio de
              contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tenant</Label>
              <Input value={tenantCredentials?.tenantName || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Correo del usuario administrador</Label>
              <Input value={tenantCredentials?.ownerEmail || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña temporal</Label>
              <Input value={tenantCredentials?.temporaryPassword || ""} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendación: el usuario debe cambiarla inmediatamente al iniciar sesión.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={handleCopyTenantCredentials}
              disabled={!tenantCredentials}
            >
              {copiedTenantCredentials ? "Copiado" : "Copiar todo"}
            </Button>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={() => {
                setShowTenantCredentialsModal(false)
                setTenantCredentials(null)
                setCopiedTenantCredentials(false)
              }}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompanyMigrationModal} onOpenChange={setShowCompanyMigrationModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Migrar empresa entre tenants</DialogTitle>
            <DialogDescription>
              Esta acción actualiza referencias de tenant en empresa, documentos y clientes, sin modificar montos ni
              datos fiscales sensibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Empresa seleccionada</Label>
                <Input value={companyToMigrate?.nombreComercial || "Sin empresa"} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Tenant destino</Label>
                <Select value={migrationTargetTenantId} onValueChange={setMigrationTargetTenantId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona el tenant destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {migrationTargetOptions.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {migrationTargetOptions.length === 0 ? (
              <Card className="p-3 border-destructive/30">
                <p className="text-sm text-muted-foreground">
                  Debe existir al menos otro tenant para poder migrar una empresa.
                </p>
              </Card>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="text-foreground hover:text-foreground"
                onClick={loadMigrationPreview}
                disabled={!companyToMigrate || !migrationTargetTenantId || migrationLoadingPreview || migrationExecuting}
              >
                {migrationLoadingPreview ? "Analizando..." : "Generar resumen previo"}
              </Button>

              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={migrationAllowSharedClients}
                  onChange={(e) => setMigrationAllowSharedClients(e.target.checked)}
                />
                Permitir migrar clientes compartidos con otras empresas
              </label>
            </div>

            {migrationPreview ? (
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold">Resumen antes de ejecutar</h4>
                  <Badge variant="secondary">Previa</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Documentos totales</p>
                    <p className="text-xl font-semibold">{migrationPreview.totals.documentsTotal}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Clientes a migrar</p>
                    <p className="text-xl font-semibold">{migrationPreview.totals.clients}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Registros a actualizar</p>
                    <p className="text-xl font-semibold">{migrationPreview.totals.updatesTotal}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div className="rounded border p-2">Empresa: 1</div>
                  <div className="rounded border p-2">Facturas: {migrationPreview.totals.invoices}</div>
                  <div className="rounded border p-2">Tiquetes: {migrationPreview.totals.tickets}</div>
                  <div className="rounded border p-2">Notas crédito: {migrationPreview.totals.creditNotes}</div>
                  <div className="rounded border p-2">Clientes: {migrationPreview.totals.clients}</div>
                </div>

                {migrationPreview.warnings.sharedClients > 0 ? (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-amber-800">Advertencia de integridad</p>
                    <p className="text-amber-700">
                      Se detectaron {migrationPreview.warnings.sharedClients} clientes compartidos con otras empresas.
                      Activa la opción de permiso para continuar.
                    </p>
                  </div>
                ) : null}
              </Card>
            ) : null}

            {(migrationExecuting || migrationResult) ? (
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Progreso de actualización</h4>
                  <span className="text-sm text-muted-foreground">{migrationProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, migrationProgress))}%` }}
                  />
                </div>
                {migrationExecuting ? (
                  <p className="text-sm text-muted-foreground">
                    Ejecutando migración de empresa, documentos y clientes...
                  </p>
                ) : null}
                {migrationResult ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div className="rounded border p-2">Empresa: {migrationResult.updated.company}</div>
                    <div className="rounded border p-2">Facturas: {migrationResult.updated.invoices}</div>
                    <div className="rounded border p-2">Tiquetes: {migrationResult.updated.tickets}</div>
                    <div className="rounded border p-2">Notas crédito: {migrationResult.updated.creditNotes}</div>
                    <div className="rounded border p-2">Clientes: {migrationResult.updated.clients}</div>
                    <div className="rounded border p-2">
                      Total: {migrationResult.totals.recordsUpdated}
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={() => setShowCompanyMigrationModal(false)}
              disabled={migrationExecuting}
            >
              Cerrar
            </Button>
            <Button
              onClick={executeCompanyMigration}
              disabled={
                !migrationPreview ||
                migrationExecuting ||
                (migrationPreview?.warnings.sharedClients || 0) > 0 && !migrationAllowSharedClients
              }
            >
              {migrationExecuting ? "Migrando..." : "Ejecutar migración"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
