import { NextRequest, NextResponse } from "next/server"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { getFirestore } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { personalizationFromCompanyRecord } from "@/lib/theme/company-personalization.utils"
import type { CompanyPersonalization } from "@/lib/theme/company-personalization.types"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export const dynamic = "force-dynamic"

function normalizePersonalizationInput(
  body: Record<string, unknown>,
  current?: Record<string, unknown>
): CompanyPersonalization {
  const mergedCompany = {
    ...(current || {}),
    personalization: body.personalization,
    theme: (body.personalization as CompanyPersonalization | undefined)?.system || body.theme,
  }
  return personalizationFromCompanyRecord(mergedCompany)
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const companyRef = doc(db, "companies", id)
    const snapshot = await getDoc(companyRef)
    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    const data = snapshot.data()
    const personalization = personalizationFromCompanyRecord(data)

    return NextResponse.json({
      success: true,
      companyId: id,
      brandColor: personalization.system.primaryColor,
      theme: personalization.system,
      personalization,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cargando personalización" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return savePersonalization(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return savePersonalization(request, params)
}

async function savePersonalization(request: NextRequest, { id }: { id: string }) {
  try {
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const body = await request.json()
    const companyRef = doc(db, "companies", id)
    const snapshot = await getDoc(companyRef)
    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    const current = snapshot.data()
    const personalization = normalizePersonalizationInput(body, current)

    await updateDoc(companyRef, {
      personalization,
      theme: personalization.system,
      brandColor: personalization.system.primaryColor,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      companyId: id,
      brandColor: personalization.system.primaryColor,
      theme: personalization.system,
      personalization,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error guardando personalización" },
      { status: 500 }
    )
  }
}