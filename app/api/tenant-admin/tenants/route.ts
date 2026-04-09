import { NextRequest, NextResponse } from "next/server"
import { TenantService, CreateTenantRequest } from "@/lib/services/tenant-service"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"
import { getFirestore, collection, query, where, getDocs, doc, setDoc, Timestamp, deleteDoc } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { getAuth, createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile } from "firebase/auth"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)

function mapCreateTenantError(error: unknown): {
  status: number
  error: string
  fieldErrors?: Record<string, string>
} {
  const message = error instanceof Error ? error.message : "Error interno del servidor"
  const lower = message.toLowerCase()

  if (lower.includes("faltan campos requeridos")) {
    return {
      status: 400,
      error: "Debes completar los campos requeridos del tenant.",
      fieldErrors: {
        name: "Requerido",
        ownerName: "Requerido",
        ownerEmail: "Requerido"
      }
    }
  }

  if (lower.includes("formato del correo")) {
    return {
      status: 400,
      error: "El formato del correo del propietario no es válido.",
      fieldErrors: {
        ownerEmail: "Formato inválido"
      }
    }
  }

  if (lower.includes("correo del propietario ya existe")) {
    return {
      status: 409,
      error: "El correo ya existe como usuario en otra organización del sistema.",
      fieldErrors: {
        ownerEmail: "Correo ya registrado"
      }
    }
  }

  if (lower.includes("correo ya existe en autenticación")) {
    return {
      status: 409,
      error: "El correo ya existe en autenticación.",
      fieldErrors: {
        ownerEmail: "Correo ya registrado"
      }
    }
  }

  return { status: 500, error: message }
}

function getRoleName(roleId: string): string {
  const roleNames: Record<string, string> = {
    "tenant-admin": "Administrador",
    collaborator: "Colaborador",
    vendor: "Vendedor"
  }
  return roleNames[roleId] || "Usuario"
}

function getRolePermissions(roleId: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    "tenant-admin": ["all"],
    collaborator: ["invoices", "clients", "products"],
    vendor: ["invoices", "clients"]
  }
  return rolePermissions[roleId] || []
}

function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const nums = "23456789"
  const symbols = "!@#$%*?"
  const all = `${upper}${lower}${nums}${symbols}`

  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  const raw = [
    pick(upper),
    pick(lower),
    pick(nums),
    pick(symbols),
    ...Array.from({ length: 8 }).map(() => pick(all))
  ]

  return raw.sort(() => Math.random() - 0.5).join("")
}

export async function GET(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || undefined

    const tenants = await TenantService.getAllTenants(status || undefined)
    return NextResponse.json({
      success: true,
      tenants,
      total: tenants.length
    })
  } catch (error) {
    console.error("Error obteniendo tenants admin:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const callerEmail = request.headers.get("x-tenant-admin-email") || "unknown-admin"
    const planCode = String(body?.plan || "").trim().toUpperCase()

    let planLimits: {
      maxCompanies?: number | null
      maxDocumentsPerMonth?: number | null
    } = {}

    if (planCode) {
      const plansSnap = await getDocs(
        query(collection(db, "subscriptionPlans"), where("code", "==", planCode), where("isActive", "==", true))
      )
      const planData = plansSnap.docs[0]?.data()
      if (planData) {
        planLimits = {
          maxCompanies: Number(planData.maxCompanies || 0) || null,
          maxDocumentsPerMonth: Number(planData.maxDocumentsPerMonth || 0) || null
        }
      }
    }

    const createRequest: CreateTenantRequest = {
      ...body,
      maxUsers: null,
      maxCompanies: planLimits.maxCompanies ?? null,
      maxDocumentsPerMonth: planLimits.maxDocumentsPerMonth ?? null,
      createdBy: callerEmail
    }

    const tenantId = await TenantService.createTenant(createRequest)
    const ownerEmail = String(createRequest.ownerEmail || "").trim().toLowerCase()
    const temporaryPassword = generateTemporaryPassword()
    const roleId = "tenant-admin"

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, ownerEmail, temporaryPassword)
      const firebaseUser = userCredential.user

      await updateFirebaseProfile(firebaseUser, {
        displayName: createRequest.ownerName || createRequest.name
      })

      await setDoc(doc(db, "users", firebaseUser.uid), {
        name: createRequest.ownerName || createRequest.name,
        email: ownerEmail,
        status: "active",
        roleId,
        tenantId,
        mustChangePassword: true,
        temporaryPasswordGeneratedAt: Timestamp.now(),
        passwordChangedAt: null,
        lastLoginAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        profileImage: null,
        role: {
          name: getRoleName(roleId),
          permissions: getRolePermissions(roleId)
        },
        profile: {
          preferences: {
            notifications: true,
            language: "es",
            timezone: "America/Costa_Rica"
          }
        }
      })
    } catch (createUserError: any) {
      await deleteDoc(doc(db, "tenants", tenantId))
      if (createUserError?.code === "auth/email-already-in-use") {
        return NextResponse.json(
          { error: "No se pudo crear el tenant porque el correo ya existe en autenticación." },
          { status: 409 }
        )
      }
      throw createUserError
    }

    return NextResponse.json({
      success: true,
      tenantId,
      ownerEmail,
      temporaryPassword,
      message: "Tenant creado exitosamente"
    })
  } catch (error) {
    console.error("Error creando tenant admin:", error)
    const mapped = mapCreateTenantError(error)
    return NextResponse.json(
      {
        error: mapped.error,
        fieldErrors: mapped.fieldErrors || null
      },
      { status: mapped.status }
    )
  }
}
