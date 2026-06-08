import { NextRequest, NextResponse } from "next/server"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { getFirestore } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import {
  countPdfTemplateBlocks,
  personalizationFromCompanyRecord,
  preparePersonalizationForFirestore,
} from "@/lib/theme/company-personalization.utils"
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
  return preparePersonalizationForFirestore(
    personalizationFromCompanyRecord(mergedCompany) as CompanyPersonalization
  )
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 })
    }

    const companyRef = doc(db, "companies", id)
    const snapshot = await getDoc(companyRef)
    if (!snapshot.exists()) {
      return NextResponse.json({ success: false, error: "Empresa no encontrada" }, { status: 404 })
    }

    const data = snapshot.data()
    const personalization = personalizationFromCompanyRecord(data)

    return NextResponse.json({
      success: true,
      companyId: id,
      brandColor: personalization.system.primaryColor,
      theme: personalization.system,
      personalization,
      pdfTemplateBlocks: countPdfTemplateBlocks(personalization),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error cargando personalización" },
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
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 })
    }

    const body = await request.json()
    if (!body?.personalization) {
      return NextResponse.json(
        { success: false, error: "Datos de personalización requeridos" },
        { status: 400 }
      )
    }

    const companyRef = doc(db, "companies", id)
    const snapshot = await getDoc(companyRef)
    if (!snapshot.exists()) {
      return NextResponse.json({ success: false, error: "Empresa no encontrada" }, { status: 404 })
    }

    const current = snapshot.data()
    const personalization = normalizePersonalizationInput(body, current)
    const expectedBlocks = countPdfTemplateBlocks(personalization)
    const savedAt = new Date().toISOString()

    await updateDoc(companyRef, {
      personalization,
      theme: personalization.system,
      brandColor: personalization.system.primaryColor,
      personalizationUpdatedAt: savedAt,
      updatedAt: new Date(),
    })

    const verification = await getDoc(companyRef)
    if (!verification.exists()) {
      return NextResponse.json(
        { success: false, error: "Firebase no confirmó la escritura del documento" },
        { status: 500 }
      )
    }

    const verified = personalizationFromCompanyRecord(verification.data())
    const verifiedBlocks = countPdfTemplateBlocks(verified)

    if (verifiedBlocks !== expectedBlocks) {
      return NextResponse.json(
        {
          success: false,
          error: `La plantilla PDF no se guardó por completo (${verifiedBlocks}/${expectedBlocks} bloques)`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      saved: true,
      companyId: id,
      savedAt,
      brandColor: verified.system.primaryColor,
      theme: verified.system,
      personalization: verified,
      pdfTemplateBlocks: verifiedBlocks,
    })
  } catch (error) {
    console.error("Error guardando personalización en Firebase:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error guardando personalización" },
      { status: 500 }
    )
  }
}
