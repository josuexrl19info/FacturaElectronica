import { NextRequest, NextResponse } from "next/server"
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

type MigrationScope = {
  sourceTenantId: string
  targetTenantId: string
  companyId: string
}

type PreviewResult = {
  scope: MigrationScope
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

function chunk<T>(arr: T[], size = 450): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function batchUpdateDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
  updateBuilder: (docItem: QueryDocumentSnapshot<DocumentData>) => Record<string, any>
) {
  if (docs.length === 0) return
  const groups = chunk(docs, 450)
  for (const group of groups) {
    const batch = writeBatch(db)
    for (const docItem of group) {
      batch.update(docItem.ref, updateBuilder(docItem))
    }
    await batch.commit()
  }
}

async function buildPreview(scope: MigrationScope): Promise<PreviewResult> {
  const sourceTenantRef = doc(db, "tenants", scope.sourceTenantId)
  const targetTenantRef = doc(db, "tenants", scope.targetTenantId)
  const companyRef = doc(db, "companies", scope.companyId)

  const [sourceTenantSnap, targetTenantSnap, companySnap] = await Promise.all([
    getDoc(sourceTenantRef),
    getDoc(targetTenantRef),
    getDoc(companyRef)
  ])

  if (!sourceTenantSnap.exists()) {
    throw new Error("El tenant origen no existe.")
  }
  if (!targetTenantSnap.exists()) {
    throw new Error("El tenant destino no existe.")
  }
  if (!companySnap.exists()) {
    throw new Error("La empresa seleccionada no existe.")
  }

  const sourceTenant = sourceTenantSnap.data()
  const targetTenant = targetTenantSnap.data()
  const company = companySnap.data()

  if (company.tenantId !== scope.sourceTenantId) {
    throw new Error("La empresa no pertenece al tenant origen indicado.")
  }
  if (scope.sourceTenantId === scope.targetTenantId) {
    throw new Error("El tenant destino debe ser distinto al tenant origen.")
  }

  const [invoicesSnap, ticketsSnap, creditNotesSnap, clientsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "invoices"),
        where("tenantId", "==", scope.sourceTenantId),
        where("companyId", "==", scope.companyId)
      )
    ),
    getDocs(
      query(
        collection(db, "tickets"),
        where("tenantId", "==", scope.sourceTenantId),
        where("companyId", "==", scope.companyId)
      )
    ),
    getDocs(
      query(
        collection(db, "creditNotes"),
        where("tenantId", "==", scope.sourceTenantId),
        where("companyId", "==", scope.companyId)
      )
    ),
    getDocs(
      query(
        collection(db, "clients"),
        where("tenantId", "==", scope.sourceTenantId),
        where("companyIds", "array-contains", scope.companyId)
      )
    )
  ])

  const sharedClients = clientsSnap.docs.filter((docItem) => {
    const data = docItem.data()
    const companyIds = Array.isArray(data.companyIds) ? data.companyIds : []
    return companyIds.filter((id: string) => id && id !== scope.companyId).length > 0
  }).length

  const invoices = invoicesSnap.size
  const tickets = ticketsSnap.size
  const creditNotes = creditNotesSnap.size
  const clients = clientsSnap.size
  const documentsTotal = invoices + tickets + creditNotes
  const updatesTotal = documentsTotal + clients + 1

  return {
    scope,
    company: {
      id: scope.companyId,
      name: company.nombreComercial || company.name || "Sin nombre",
      sourceTenantName: sourceTenant.name || scope.sourceTenantId,
      targetTenantName: targetTenant.name || scope.targetTenantId
    },
    totals: {
      invoices,
      tickets,
      creditNotes,
      clients,
      documentsTotal,
      updatesTotal
    },
    warnings: {
      sharedClients
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const companyId = params.id
    const body = await request.json()
    const sourceTenantId = String(body?.sourceTenantId || "").trim()
    const targetTenantId = String(body?.targetTenantId || "").trim()
    const action = String(body?.action || "preview").trim().toLowerCase()
    const allowSharedClients = body?.allowSharedClients === true

    if (!companyId || !sourceTenantId || !targetTenantId) {
      return NextResponse.json(
        { error: "companyId, sourceTenantId y targetTenantId son requeridos." },
        { status: 400 }
      )
    }

    const scope: MigrationScope = { sourceTenantId, targetTenantId, companyId }
    const preview = await buildPreview(scope)

    if (action === "preview") {
      return NextResponse.json({
        success: true,
        mode: "preview",
        preview
      })
    }

    if (action !== "execute") {
      return NextResponse.json({ error: "action no soportada" }, { status: 400 })
    }

    if (preview.warnings.sharedClients > 0 && !allowSharedClients) {
      return NextResponse.json(
        {
          error:
            "Se detectaron clientes compartidos con otras empresas. Confirma la migración con allowSharedClients=true.",
          preview
        },
        { status: 409 }
      )
    }

    const [companySnap, invoicesSnap, ticketsSnap, creditNotesSnap, clientsSnap] = await Promise.all([
      getDoc(doc(db, "companies", companyId)),
      getDocs(
        query(
          collection(db, "invoices"),
          where("tenantId", "==", sourceTenantId),
          where("companyId", "==", companyId)
        )
      ),
      getDocs(
        query(
          collection(db, "tickets"),
          where("tenantId", "==", sourceTenantId),
          where("companyId", "==", companyId)
        )
      ),
      getDocs(
        query(
          collection(db, "creditNotes"),
          where("tenantId", "==", sourceTenantId),
          where("companyId", "==", companyId)
        )
      ),
      getDocs(
        query(
          collection(db, "clients"),
          where("tenantId", "==", sourceTenantId),
          where("companyIds", "array-contains", companyId)
        )
      )
    ])

    if (!companySnap.exists()) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 })
    }

    const companyData = companySnap.data()
    if (companyData.tenantId !== sourceTenantId) {
      return NextResponse.json(
        { error: "La empresa ya no pertenece al tenant origen. Recarga y vuelve a intentar." },
        { status: 409 }
      )
    }

    await batchUpdateDocs(invoicesSnap.docs, () => ({
      tenantId: targetTenantId,
      updatedAt: serverTimestamp()
    }))

    await batchUpdateDocs(ticketsSnap.docs, () => ({
      tenantId: targetTenantId,
      updatedAt: serverTimestamp()
    }))

    await batchUpdateDocs(creditNotesSnap.docs, () => ({
      tenantId: targetTenantId,
      updatedAt: serverTimestamp()
    }))

    await batchUpdateDocs(clientsSnap.docs, () => ({
      tenantId: targetTenantId,
      updatedAt: serverTimestamp()
    }))

    const companyBatch = writeBatch(db)
    companyBatch.update(doc(db, "companies", companyId), {
      tenantId: targetTenantId,
      updatedAt: serverTimestamp(),
      lastTenantMigration: {
        migratedAt: new Date().toISOString(),
        fromTenantId: sourceTenantId,
        toTenantId: targetTenantId
      }
    })
    await companyBatch.commit()

    return NextResponse.json({
      success: true,
      mode: "execute",
      result: {
        companyId,
        fromTenantId: sourceTenantId,
        toTenantId: targetTenantId,
        updated: {
          company: 1,
          invoices: invoicesSnap.size,
          tickets: ticketsSnap.size,
          creditNotes: creditNotesSnap.size,
          clients: clientsSnap.size
        },
        totals: {
          recordsUpdated:
            1 + invoicesSnap.size + ticketsSnap.size + creditNotesSnap.size + clientsSnap.size,
          documentsMoved: invoicesSnap.size + ticketsSnap.size + creditNotesSnap.size
        }
      },
      preview
    })
  } catch (error) {
    console.error("Error migrando empresa entre tenants:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    )
  }
}
