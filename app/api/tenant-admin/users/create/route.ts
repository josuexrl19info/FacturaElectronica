import { NextRequest, NextResponse } from "next/server"
import {
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  getAuth
} from "firebase/auth"
import { doc, setDoc, Timestamp, getFirestore, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "@/lib/firebase-config"
import { assertTenantAdminAccess } from "@/lib/server/tenant-admin-guard"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

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

export async function POST(request: NextRequest) {
  const unauthorized = assertTenantAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, email, password, roleId, tenantId, status = "active" } = body
    const normalizedEmail = (email || "").trim().toLowerCase()

    if (!name || !normalizedEmail || !password || !roleId || !tenantId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: name, email, password, roleId, tenantId" },
        { status: 400 }
      )
    }

    const tenantRef = doc(db, "tenants", tenantId)
    const tenantSnap = await getDoc(tenantRef)
    if (!tenantSnap.exists()) {
      return NextResponse.json({ error: "El tenant seleccionado no existe" }, { status: 404 })
    }

    // Validación explícita: el correo no puede existir ya en otro tenant
    const usersRef = collection(db, "users")
    const existingUsers = await getDocs(query(usersRef, where("email", "==", normalizedEmail)))
    if (!existingUsers.empty) {
      return NextResponse.json(
        { error: "El correo ya existe como usuario en otra organización del sistema" },
        { status: 409 }
      )
    }

    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
    const firebaseUser = userCredential.user

    await updateFirebaseProfile(firebaseUser, { displayName: name })

    await setDoc(doc(db, "users", firebaseUser.uid), {
      name,
      email: normalizedEmail,
      status,
      roleId,
      tenantId,
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

    return NextResponse.json({
      success: true,
      id: firebaseUser.uid,
      message: "Usuario del tenant creado exitosamente"
    })
  } catch (error: any) {
    console.error("Error creando usuario tenant-admin:", error)
    if (error?.code === "auth/email-already-in-use") {
      return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 409 })
    }
    if (error?.code === "auth/weak-password") {
      return NextResponse.json({ error: "La contraseña es muy débil" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
