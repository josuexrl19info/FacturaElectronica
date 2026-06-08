"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/firebase-client"
import { UserProfile } from "@/lib/firebase-users"
import { CreateUserModal } from "@/components/users/create-user-modal"
import { ViewUserModal } from "@/components/users/view-user-modal"
import { Users, UserPlus, Mail, Eye } from "lucide-react"

type UsersSettingsPanelProps = {
  embedded?: boolean
}

export function UsersSettingsPanel({ embedded = false }: UsersSettingsPanelProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showViewUserModal, setShowViewUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  const loadUsers = async () => {
    if (!user?.tenantId) {
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users?tenantId=${user.tenantId}`)
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La respuesta del servidor no es JSON válido")
      }

      const data = await response.json()
      if (response.ok) {
        setUsers(data.users || [])
      } else {
        console.error("Error al cargar usuarios:", data.error)
        setUsers([])
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void loadUsers()
    }
  }, [user])

  const handleViewUser = (userToView: UserProfile) => {
    setSelectedUser(userToView)
    setShowViewUserModal(true)
  }

  return (
    <>
      <div className="space-y-6">
        {!embedded ? (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
              <p className="text-muted-foreground">Administre los usuarios del sistema</p>
            </div>
            <Button className="flex items-center gap-2" onClick={() => setShowCreateUserModal(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button className="flex items-center gap-2" onClick={() => setShowCreateUserModal(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={item.profileImage || "/placeholder-user.jpg"} />
                      <AvatarFallback>
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {item.email}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="default">{item.role.name}</Badge>
                        <Badge variant={item.status === "active" ? "default" : "destructive"}>
                          {item.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Último acceso: {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString() : "N/A"}
                    </p>
                    <Button variant="ghost" size="sm" title="Ver detalles del usuario" onClick={() => handleViewUser(item)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {users.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No hay usuarios</h3>
                <p className="mb-4 text-muted-foreground">Aún no hay usuarios registrados en el sistema</p>
                <Button className="flex items-center gap-2" onClick={() => setShowCreateUserModal(true)}>
                  <UserPlus className="h-4 w-4" />
                  Agregar Primer Usuario
                </Button>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      {user?.tenantId ? (
        <CreateUserModal
          open={showCreateUserModal}
          onOpenChange={setShowCreateUserModal}
          onUserCreated={loadUsers}
          tenantId={user.tenantId}
        />
      ) : null}

      <ViewUserModal open={showViewUserModal} onOpenChange={setShowViewUserModal} user={selectedUser} />
    </>
  )
}
