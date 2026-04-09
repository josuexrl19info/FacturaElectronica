import { NextRequest, NextResponse } from "next/server"
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const COLLECTION_NAME = "subscriptionPlans"

function toDate(value: any) {
  if (!value) return null
  if (value?.toDate && typeof value.toDate === "function") return value.toDate()
  if (value?._seconds) return new Date(value._seconds * 1000)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function GET(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get("active") === "true"

    const plansRef = collection(db, COLLECTION_NAME)
    const plansQuery = onlyActive
      ? query(plansRef, where("isActive", "==", true))
      : query(plansRef)

    const snap = await getDocs(plansQuery)
    const plans = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        code: data.code || "",
        name: data.name || "",
        description: data.description || "",
        monthlyPrice: Number(data.monthlyPrice || 0),
        annualPrice: Number(data.annualPrice || 0),
        currency: data.currency || "USD",
        maxDocumentsPerMonth: Number(data.maxDocumentsPerMonth || 0),
        maxCompanies: Number(data.maxCompanies || 0),
        includesInvoiceAcceptance: data.includesInvoiceAcceptance === true,
        includesAiModule: data.includesAiModule === true,
        isActive: data.isActive !== false,
        recommended: data.recommended === true,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt)
      }
    }).sort((a, b) => a.monthlyPrice - b.monthlyPrice)

    return NextResponse.json({ success: true, plans, total: plans.length })
  } catch (error) {
    console.error("Error obteniendo planes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const {
      code,
      name,
      description,
      monthlyPrice,
      annualPrice,
      currency = "USD",
      maxDocumentsPerMonth,
      maxCompanies,
      includesInvoiceAcceptance,
      includesAiModule,
      isActive = true,
      recommended = false
    } = body || {}

    const normalizedCode = (code || "").toString().trim().toUpperCase()
    if (!normalizedCode || !name) {
      return NextResponse.json({ error: "code y name son requeridos" }, { status: 400 })
    }

    const existing = await getDocs(
      query(collection(db, COLLECTION_NAME), where("code", "==", normalizedCode))
    )
    if (!existing.empty) {
      return NextResponse.json({ error: "Ya existe un plan con ese código" }, { status: 409 })
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      code: normalizedCode,
      name: name.toString().trim(),
      description: (description || "").toString().trim(),
      monthlyPrice: Number(monthlyPrice || 0),
      annualPrice: Number(annualPrice || 0),
      currency: (currency || "USD").toString().toUpperCase(),
      maxDocumentsPerMonth: Number(maxDocumentsPerMonth || 0),
      maxCompanies: Number(maxCompanies || 0),
      includesInvoiceAcceptance: includesInvoiceAcceptance === true,
      includesAiModule: includesAiModule === true,
      isActive: isActive !== false,
      recommended: recommended === true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Plan creado correctamente"
    })
  } catch (error) {
    console.error("Error creando plan:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
