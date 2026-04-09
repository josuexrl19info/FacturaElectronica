import { NextRequest, NextResponse } from "next/server"
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const COLLECTION_NAME = "subscriptionPlans"

const SUGGESTED_PLANS = [
  {
    code: "START",
    name: "Start",
    description: "Ideal para operaciones iniciales con control esencial de facturación.",
    monthlyPrice: 39,
    annualPrice: 390,
    currency: "USD",
    maxDocumentsPerMonth: 300,
    maxCompanies: 1,
    includesInvoiceAcceptance: false,
    includesAiModule: false,
    isActive: true,
    recommended: false
  },
  {
    code: "GROWTH",
    name: "Growth",
    description: "Para empresas en crecimiento con mayor volumen y aceptación de facturas.",
    monthlyPrice: 89,
    annualPrice: 890,
    currency: "USD",
    maxDocumentsPerMonth: 2000,
    maxCompanies: 5,
    includesInvoiceAcceptance: true,
    includesAiModule: false,
    isActive: true,
    recommended: true
  },
  {
    code: "SCALE_AI",
    name: "Scale AI",
    description: "Cobertura avanzada para multiempresa, alto volumen y automatizaciones con IA.",
    monthlyPrice: 199,
    annualPrice: 1990,
    currency: "USD",
    maxDocumentsPerMonth: 10000,
    maxCompanies: 20,
    includesInvoiceAcceptance: true,
    includesAiModule: true,
    isActive: true,
    recommended: false
  }
]

export async function POST(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    let created = 0
    for (const plan of SUGGESTED_PLANS) {
      const existing = await getDocs(
        query(collection(db, COLLECTION_NAME), where("code", "==", plan.code))
      )
      if (!existing.empty) continue

      await addDoc(collection(db, COLLECTION_NAME), {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      created += 1
    }

    return NextResponse.json({
      success: true,
      created,
      message: created > 0 ? "Planes sugeridos cargados" : "Los planes sugeridos ya existen"
    })
  } catch (error) {
    console.error("Error sembrando planes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
