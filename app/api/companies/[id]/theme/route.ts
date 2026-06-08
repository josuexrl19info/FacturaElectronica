import { NextRequest, NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { getFirestore } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { personalizationFromCompanyRecord } from "@/lib/theme/company-personalization.utils"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function generateStaticParams() {
  return []
}

/** Compatibilidad: expone solo el tema del sistema. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const companyRef = doc(db, "companies", id)
    const snapshot = await getDoc(companyRef)
    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    const personalization = personalizationFromCompanyRecord(snapshot.data())
    return NextResponse.json({
      success: true,
      companyId: id,
      brandColor: personalization.system.primaryColor,
      theme: personalization.system,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cargando tema" },
      { status: 500 }
    )
  }
}
