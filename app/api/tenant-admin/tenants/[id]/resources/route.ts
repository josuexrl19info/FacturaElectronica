import { NextRequest, NextResponse } from "next/server"
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

function toDate(value: any) {
  if (!value) return null
  if (value?.toDate && typeof value.toDate === "function") return value.toDate()
  if (value?._seconds) return new Date(value._seconds * 1000)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeStatus(status?: string) {
  const value = (status || "").toString().toLowerCase()
  if (value.includes("acept")) return "accepted"
  if (value.includes("rechaz")) return "rejected"
  if (value.includes("draft")) return "draft"
  return "pending"
}

function isSameMonth(date?: Date | null, now: Date = new Date()) {
  if (!date) return false
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const tenantId = params.id
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requerido" }, { status: 400 })
    }

    const [tenantSnap, usersSnap, companiesSnap, productsSnap, invoicesSnap, ticketsSnap, creditNotesSnap] = await Promise.all([
      getDoc(doc(db, "tenants", tenantId)),
      getDocs(query(collection(db, "users"), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, "companies"), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, "products"), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, "invoices"), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, "tickets"), where("tenantId", "==", tenantId))),
      getDocs(query(collection(db, "creditNotes"), where("tenantId", "==", tenantId)))
    ])

    const users = usersSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || "",
        email: data.email || "",
        roleId: data.roleId || "",
        status: data.status || "active",
        createdAt: toDate(data.createdAt),
        lastLoginAt: toDate(data.lastLoginAt)
      }
    })

    const companies = companiesSnap.docs.map((doc) => {
      const data = doc.data()
      const hasActivity =
        !!data.economicActivity?.codigo ||
        !!data.economicActivity?.descripcion ||
        !!data.activityCode ||
        !!data.activity
      const hasAtv =
        !!data.atvCredentials?.username &&
        !!data.atvCredentials?.clientId &&
        !!data.atvCredentials?.receptionUrl &&
        (!!data.atvCredentials?.authUrl || !!data.atvCredentials?.loginUrl)
      const hasCertificate =
        !!data.certificadoDigital?.fileData ||
        !!data.certificadoDigital?.fileName ||
        !!data.certificadoDigital?.serialNumber
      const hasContact = !!data.email && (!!data.phone || !!data.phoneCountryCode)
      const hasGeo = !!data.province && !!data.canton && !!data.district
      const hasIdentification = !!data.identification
      const hasLogo = !!data.logo?.fileData
      const isConfiguredForInvoicing =
        hasIdentification && hasContact && hasGeo && hasActivity && hasAtv && hasCertificate

      return {
        id: doc.id,
        nombreComercial: data.nombreComercial || data.name || "Sin nombre",
        razonSocial: data.razonSocial || data.name || "",
        identification: data.identification || "",
        status: data.status || "Activa",
        email: data.email || "",
        phone: data.phone || "",
        economicActivityCode: data.economicActivity?.codigo || "",
        economicActivityDescription: data.economicActivity?.descripcion || "",
        atvUsername: data.atvCredentials?.username || "",
        atvClientId: data.atvCredentials?.clientId || "",
        atvEnvironment: data.atvCredentials?.environment || "",
        certificateValidTo: data.certificadoDigital?.validTo || "",
        hasLogo,
        configFlags: {
          hasIdentification,
          hasContact,
          hasGeo,
          hasActivity,
          hasAtv,
          hasCertificate,
          isConfiguredForInvoicing
        },
        createdAt: toDate(data.createdAt)
      }
    })

    const products = productsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        codigo: data.codigo || "",
        detalle: data.detalle || "",
        precioUnitario: data.precioUnitario || 0,
        currency: data.currency || "CRC",
        activo: data.activo !== false,
        fechaActualizacion: toDate(data.fechaActualizacion || data.updatedAt || data.createdAt)
      }
    })

    users.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    companies.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    products.sort((a, b) => (b.fechaActualizacion?.getTime() || 0) - (a.fechaActualizacion?.getTime() || 0))

    const allDocuments = [...invoicesSnap.docs, ...ticketsSnap.docs, ...creditNotesSnap.docs].map((item) => {
      const data = item.data()
      const date = toDate(data.createdAt || data.fecha || data.updatedAt)
      return {
        id: item.id,
        status: normalizeStatus(data.status),
        date
      }
    })
    const now = new Date()
    const documentsThisMonth = allDocuments.filter((doc) => isSameMonth(doc.date, now)).length
    const documentsLastMonth = allDocuments.filter((doc) => {
      if (!doc.date) return false
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return doc.date.getMonth() === lastMonth.getMonth() && doc.date.getFullYear() === lastMonth.getFullYear()
    }).length
    const documentStatus = {
      accepted: allDocuments.filter((doc) => doc.status === "accepted").length,
      pending: allDocuments.filter((doc) => doc.status === "pending").length,
      rejected: allDocuments.filter((doc) => doc.status === "rejected").length,
      draft: allDocuments.filter((doc) => doc.status === "draft").length
    }

    const tenantData = tenantSnap.exists() ? tenantSnap.data() : {}
    const maxDocumentsPerMonth =
      typeof tenantData.maxDocumentsPerMonth === "number" ? tenantData.maxDocumentsPerMonth : null
    const documentsRemaining =
      maxDocumentsPerMonth !== null ? Math.max(0, maxDocumentsPerMonth - documentsThisMonth) : null
    const overQuotaBy =
      maxDocumentsPerMonth !== null ? Math.max(0, documentsThisMonth - maxDocumentsPerMonth) : 0

    const tenantCreatedAt = toDate(tenantData.createdAt) || now
    const billingDayRaw = Number(tenantData.billingDay || tenantData.paymentDay || tenantCreatedAt.getDate())
    const billingDay = Number.isFinite(billingDayRaw) ? Math.min(28, Math.max(1, billingDayRaw)) : tenantCreatedAt.getDate()
    const nextCutoffDate = new Date(now.getFullYear(), now.getMonth(), billingDay)
    if (nextCutoffDate <= now) {
      nextCutoffDate.setMonth(nextCutoffDate.getMonth() + 1)
    }
    const configuredPaymentDueDate = toDate(tenantData.paymentDueDate)
    const nextPaymentDate = configuredPaymentDueDate || new Date(nextCutoffDate.getTime() + 5 * 24 * 60 * 60 * 1000)
    const daysToPayment = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const companiesConfigured = companies.filter((c) => c.configFlags.isConfiguredForInvoicing).length
    const companiesWithoutAtv = companies.filter((c) => !c.configFlags.hasAtv).length
    const companiesWithoutCertificate = companies.filter((c) => !c.configFlags.hasCertificate).length
    const companiesWithoutActivity = companies.filter((c) => !c.configFlags.hasActivity).length
    const companiesWithoutGeo = companies.filter((c) => !c.configFlags.hasGeo).length
    const companiesWithoutContact = companies.filter((c) => !c.configFlags.hasContact).length

    return NextResponse.json({
      success: true,
      tenantId,
      tenantOverview: {
        plan: tenantData.plan || "basic",
        status: tenantData.status || "active",
        maxUsers: tenantData.maxUsers ?? null,
        maxCompanies: tenantData.maxCompanies ?? null,
        maxDocumentsPerMonth,
        documentsTotal: allDocuments.length,
        documentsThisMonth,
        documentsLastMonth,
        documentsRemaining,
        overQuotaBy,
        documentStatus,
        tenantCreatedAt,
        nextCutoffDate,
        nextPaymentDate,
        daysToPayment,
        configuredBillingDay: billingDay,
        hasCustomPaymentDueDate: !!configuredPaymentDueDate
      },
      users,
      companies,
      products,
      summary: {
        users: users.length,
        companies: companies.length,
        products: products.length,
        activeUsers: users.filter((u) => u.status === "active").length,
        activeProducts: products.filter((p) => p.activo).length,
        companiesConfigured,
        companiesWithoutAtv,
        companiesWithoutCertificate,
        companiesWithoutActivity,
        companiesWithoutGeo,
        companiesWithoutContact
      }
    })
  } catch (error) {
    console.error("Error obteniendo recursos del tenant:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
