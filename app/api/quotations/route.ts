import { NextRequest, NextResponse } from "next/server"
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"

type FirestoreDoc = Record<string, unknown>

function asDateValue(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

function mapQuotation(docId: string, data: FirestoreDoc) {
  const dueDateRaw = (data.dueDate || data.expirationDate || data.validUntil || null) as unknown
  const createdAtRaw = (data.createdAt || data.created_at || data.date || null) as unknown
  const updatedAtRaw = (data.updatedAt || data.updated_at || null) as unknown

  return {
    id: String(data.id || data.quoteId || data.consecutive || docId),
    firestoreId: docId,
    client: String(data.clientName || data.client || data.customerName || "Cliente"),
    amount: Number(data.total || data.amount || data.grandTotal || data.montoTotal || 0),
    currency: String(data.currency || data.moneda || "CRC"),
    dueDate: String(
      (typeof dueDateRaw === "string" && dueDateRaw) ||
        asDateValue(dueDateRaw) ||
        new Date().toISOString().slice(0, 10),
    ).slice(0, 10),
    status: String(data.status || data.estado || "draft").toLowerCase(),
    createdAt: asDateValue(createdAtRaw),
    updatedAt: asDateValue(updatedAtRaw),
    raw: data,
  }
}

async function readCollectionByTenantCompany(
  db: ReturnType<typeof getFirestore>,
  collectionName: string,
  tenantId: string,
  companyId: string,
) {
  const ref = collection(db, collectionName)
  const q = query(ref, where("tenantId", "==", tenantId), where("companyId", "==", companyId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => mapQuotation(docSnap.id, docSnap.data()))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    const companyId = searchParams.get("companyId")

    if (!tenantId || !companyId) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (tenantId, companyId)" },
        { status: 400 },
      )
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)

    const [quotationsEN, quotationsES] = await Promise.allSettled([
      readCollectionByTenantCompany(db, "quotations", tenantId, companyId),
      readCollectionByTenantCompany(db, "cotizaciones", tenantId, companyId),
    ])

    const fromEN = quotationsEN.status === "fulfilled" ? quotationsEN.value : []
    const fromES = quotationsES.status === "fulfilled" ? quotationsES.value : []

    const merged = [...fromEN, ...fromES]
    const uniqueByFirestoreId = new Map<string, (typeof merged)[number]>()
    for (const item of merged) {
      uniqueByFirestoreId.set(item.firestoreId, item)
    }

    const quotations = Array.from(uniqueByFirestoreId.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      quotations,
      count: quotations.length,
    })
  } catch (error) {
    console.error("❌ Error al obtener cotizaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tenantId = String(body?.tenantId || "")
    const companyId = String(body?.companyId || "")

    if (!tenantId || !companyId) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (tenantId, companyId)" },
        { status: 400 },
      )
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)
    const quotationsRef = collection(db, "quotations")

    const now = new Date()
    const quoteId = `COT-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`

    const payload = {
      id: quoteId,
      quoteId,
      tenantId,
      companyId,
      clientName: String(body?.contact?.name || "Cliente"),
      clientIdentification: String(body?.contact?.identification || ""),
      clientEmail: String(body?.contact?.email || ""),
      clientPhone: String(body?.contact?.phone || ""),
      activityCode: String(body?.contact?.activityCode || ""),
      activityDescription: String(body?.contact?.activityDescription || ""),
      createAsClient: Boolean(body?.contact?.createAsClient),
      existingClientId: body?.contact?.existingClientId ? String(body.contact.existingClientId) : null,
      currency: String(body?.settings?.currency || "CRC"),
      dueDate: String(body?.settings?.dueDate || now.toISOString().slice(0, 10)),
      discountPercent: Number(body?.settings?.discountPercent || 0),
      status: "draft",
      lines: Array.isArray(body?.lines) ? body.lines : [],
      total: Array.isArray(body?.lines)
        ? body.lines.reduce((acc: number, line: { total?: number }) => acc + Number(line?.total || 0), 0)
        : 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const created = await addDoc(quotationsRef, payload)
    return NextResponse.json({ success: true, quotationId: created.id, quoteId })
  } catch (error) {
    console.error("❌ Error al guardar cotización:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

