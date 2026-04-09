import { NextRequest, NextResponse } from "next/server"
import { getFirestore, doc, updateDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const COLLECTION_NAME = "subscriptionPlans"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "ID del plan requerido" }, { status: 400 })
    }

    const ref = doc(db, COLLECTION_NAME, id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const updates: any = {
      updatedAt: serverTimestamp()
    }

    if (body.code !== undefined) {
      const normalizedCode = body.code.toString().trim().toUpperCase()
      if (!normalizedCode) {
        return NextResponse.json({ error: "El código no puede estar vacío" }, { status: 400 })
      }
      const existing = await getDocs(
        query(collection(db, COLLECTION_NAME), where("code", "==", normalizedCode))
      )
      const duplicated = existing.docs.find((doc) => doc.id !== id)
      if (duplicated) {
        return NextResponse.json({ error: "Ya existe otro plan con ese código" }, { status: 409 })
      }
      updates.code = normalizedCode
    }

    if (body.name !== undefined) updates.name = body.name.toString().trim()
    if (body.description !== undefined) updates.description = body.description.toString()
    if (body.monthlyPrice !== undefined) updates.monthlyPrice = Number(body.monthlyPrice || 0)
    if (body.annualPrice !== undefined) updates.annualPrice = Number(body.annualPrice || 0)
    if (body.currency !== undefined) updates.currency = body.currency.toString().toUpperCase()
    if (body.maxDocumentsPerMonth !== undefined) updates.maxDocumentsPerMonth = Number(body.maxDocumentsPerMonth || 0)
    if (body.maxCompanies !== undefined) updates.maxCompanies = Number(body.maxCompanies || 0)
    if (body.includesInvoiceAcceptance !== undefined) updates.includesInvoiceAcceptance = body.includesInvoiceAcceptance === true
    if (body.includesAiModule !== undefined) updates.includesAiModule = body.includesAiModule === true
    if (body.isActive !== undefined) updates.isActive = body.isActive === true
    if (body.recommended !== undefined) updates.recommended = body.recommended === true

    await updateDoc(ref, updates)
    return NextResponse.json({ success: true, message: "Plan actualizado correctamente" })
  } catch (error) {
    console.error("Error actualizando plan:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
