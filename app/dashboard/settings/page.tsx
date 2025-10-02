"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/firebase-client"
import { userService, UserProfile } from "@/lib/firebase-users"
import { passwordService } from "@/lib/firebase-password"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CreateUserModal } from "@/components/users/create-user-modal"
import { ViewUserModal } from "@/components/users/view-user-modal"
import { useToastNotification } from "@/components/providers/toast-provider"
import { 
  Users, 
  Building2, 
  Bell, 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  UserPlus,
  Key,
  Mail,
  Phone,
  Calendar,
  User,
  Clock,
  Globe,
  Lock,
  Camera,
  X,
  Loader2
} from "lucide-react"


export default function SettingsPage() {
  const { user } = useAuth()
  const toast = useToastNotification()
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [profileForm, setProfileForm] = useState({
    name: '',
    notifications: true,
    language: 'es',
    timezone: 'America/Costa_Rica'
  })
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showViewUserModal, setShowViewUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // Cargar datos del usuario actual
  useEffect(() => {
    const loadCurrentProfile = async () => {
      try {
        const profile = await userService.getCurrentUserProfile()
        setCurrentProfile(profile)
        setProfileForm({
          name: profile?.name || '',
          notifications: profile?.profile?.preferences?.notifications || true,
          language: profile?.profile?.preferences?.language || 'es',
          timezone: profile?.profile?.preferences?.timezone || 'America/Costa_Rica'
        })
        setProfileImage(profile?.profileImage || null)
      } catch (error) {
        console.error('Error al cargar perfil:', error)
      }
    }

    const loadUsers = async () => {
      try {
        if (user?.tenantId) {
          const response = await fetch(`/api/users?tenantId=${user.tenantId}`)
          
          // Verificar el tipo de contenido
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            console.error('Respuesta no es JSON:', text)
            throw new Error('La respuesta del servidor no es JSON válido')
          }
          
          const data = await response.json()
          
          if (response.ok) {
            setUsers(data.users || [])
          } else {
            console.error('Error al cargar usuarios:', data.error)
          }
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error)
        setUsers([]) // Establecer array vacío en caso de error
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadCurrentProfile()
      loadUsers()
    }
  }, [user])

  // Detectar cambios en el formulario
  useEffect(() => {
    if (currentProfile) {
      const hasChanges = 
        profileForm.name !== currentProfile.name ||
        profileForm.notifications !== currentProfile.profile?.preferences?.notifications ||
        profileForm.language !== currentProfile.profile?.preferences?.language ||
        profileForm.timezone !== currentProfile.profile?.preferences?.timezone ||
        profileImage !== currentProfile.profileImage
      
      setHasUnsavedChanges(hasChanges)
    }
  }, [profileForm, profileImage, currentProfile])

  const handleProfileUpdate = async () => {
    try {
      setImageLoading(true)
      
      // Actualizar imagen si hay una nueva
      if (profileImage) {
        await userService.updateProfileImage(profileImage)
      }
      
      // Actualizar perfil
      await userService.updateCurrentUserProfile({
        name: profileForm.name,
        profile: {
          preferences: {
            notifications: profileForm.notifications,
            language: profileForm.language,
            timezone: profileForm.timezone
          }
        }
      })
      
      // Recargar perfil actualizado
      const updatedProfile = await userService.getCurrentUserProfile()
             setCurrentProfile(updatedProfile)
             setProfileImage(updatedProfile?.profileImage || null)
             setHasUnsavedChanges(false)

             toast.success(
               'Perfil actualizado',
               'Tus cambios se han guardado correctamente'
             )
           } catch (error) {
             console.error('Error al actualizar perfil:', error)
             toast.error(
               'Error al actualizar',
               'No se pudieron guardar los cambios. Intenta de nuevo.'
             )
    } finally {
      setImageLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      setPasswordLoading(true)
      await passwordService.sendPasswordResetEmail()
      
      // Cerrar el diálogo
      setShowPasswordDialog(false)
      
             // Mostrar mensaje de éxito
             toast.success(
               'Enlace enviado',
               'Se ha enviado un enlace de restablecimiento a tu correo electrónico'
             )
    } catch (error: any) {
      console.error('Error al enviar email de restablecimiento:', error)
      toast.error(
        'Error al enviar enlace',
        error.message || 'No se pudo enviar el email de restablecimiento'
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
             // Validar tipo de archivo
             if (!file.type.startsWith('image/')) {
               toast.error(
                 'Archivo inválido',
                 'Por favor selecciona un archivo de imagen válido'
               )
               return
             }

             // Validar tamaño (máximo 5MB)
             if (file.size > 5 * 1024 * 1024) {
               toast.error(
                 'Imagen muy grande',
                 'La imagen no puede ser mayor a 5MB'
               )
               return
             }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageRemove = () => {
    setProfileImage(null)
  }

  const handleUserCreated = async () => {
    // Recargar la lista de usuarios
    if (user?.tenantId) {
      setLoading(true)
      try {
        const response = await fetch(`/api/users?tenantId=${user.tenantId}`)
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('Respuesta no es JSON:', text)
          throw new Error('La respuesta del servidor no es JSON válido')
        }
        
        const data = await response.json()
        
        if (response.ok) {
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error al recargar usuarios:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleViewUser = (userToView: UserProfile) => {
    setSelectedUser(userToView)
    setShowViewUserModal(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Configuración" description="Administre la configuración del sistema" />

      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          {/* Tab de Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Mi Perfil</h2>
              <p className="text-muted-foreground">Administre su información personal y preferencias</p>
            </div>

            <div className="grid gap-6">
              {/* Información Personal */}
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profileImage || "/placeholder-user.jpg"} />
                      <AvatarFallback className="text-lg">
                        {currentProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <label htmlFor="profile-image" className="cursor-pointer">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors">
                          <Camera className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {profileImage && (
                      <button
                        onClick={handleImageRemove}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{currentProfile?.name || 'Cargando...'}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {currentProfile?.email || 'Cargando...'}
                    </p>
                    <Badge variant="default" className="mt-1">
                      {currentProfile?.role?.name || 'Usuario'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        placeholder="Ingrese su nombre completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        value={currentProfile?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        El correo electrónico no se puede cambiar
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => setShowPasswordDialog(true)}
                    >
                      <Key className="w-4 h-4" />
                      Cambiar contraseña
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Preferencias */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Preferencias</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications">Notificaciones</Label>
                      <p className="text-sm text-muted-foreground">Recibir notificaciones del sistema</p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={profileForm.notifications}
                      onCheckedChange={(checked) => setProfileForm({...profileForm, notifications: checked})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="language">Idioma</Label>
                      <Select value={profileForm.language} onValueChange={(value) => setProfileForm({...profileForm, language: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Zona horaria</Label>
                      <Select value={profileForm.timezone} onValueChange={(value) => setProfileForm({...profileForm, timezone: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Costa_Rica">Costa Rica (GMT-6)</SelectItem>
                          <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                          <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Información del Sistema */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div className="flex items-center gap-2">
                           <Clock className="w-4 h-4 text-muted-foreground" />
                           <span>Último acceso: {currentProfile?.lastLoginAt ? new Date(currentProfile.lastLoginAt).toLocaleDateString() : 'N/A'}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-muted-foreground" />
                           <span>Miembro desde: {currentProfile?.createdAt ? new Date(currentProfile.createdAt).toLocaleDateString() : 'N/A'}</span>
                         </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span>Estado: {currentProfile?.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </Card>

            </div>
          </TabsContent>

          {/* Tab de Usuarios */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
                <p className="text-muted-foreground">Administre los usuarios del sistema</p>
              </div>
                    <Button 
                      className="flex items-center gap-2"
                      onClick={() => setShowCreateUserModal(true)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Nuevo Usuario
                    </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando usuarios...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {users.map((user) => (
                  <Card key={user.id} className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.profileImage || "/placeholder-user.jpg"} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default">
                              {user.role.name}
                            </Badge>
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                              {user.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          Último acceso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Ver detalles del usuario"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {users.length === 0 && (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
                    <p className="text-muted-foreground mb-4">
                      Aún no hay usuarios registrados en el sistema
                    </p>
                           <Button 
                             className="flex items-center gap-2"
                             onClick={() => setShowCreateUserModal(true)}
                           >
                             <UserPlus className="w-4 h-4" />
                             Agregar Primer Usuario
                           </Button>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab de Roles */}
          <TabsContent value="roles" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Gestión de Roles</h2>
              <p className="text-muted-foreground">Configure permisos y roles del sistema</p>
            </div>

            <Card className="p-12 text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Próximamente</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                La gestión avanzada de roles y permisos estará disponible en una próxima actualización.
                Por ahora, los roles se configuran directamente desde la base de datos.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="font-medium mb-2">Roles actuales disponibles:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>• Administrador - Acceso completo</div>
                  <div>• Colaborador - Acceso limitado</div>
                  <div>• Vendedor - Solo ventas</div>
                </div>
              </div>
            </Card>
          </TabsContent>


        </Tabs>
      </div>

      {/* Diálogo de confirmación para cambio de contraseña */}
      <ConfirmDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        title="Cambiar contraseña"
        description="¿Desea cambiar su contraseña? Se le enviará un enlace por correo electrónico para realizar el cambio de contraseña de forma segura."
        confirmText="Enviar enlace"
        cancelText="Cancelar"
        onConfirm={handlePasswordReset}
        loading={passwordLoading}
      />

      {/* Modal para crear usuario */}
      {user?.tenantId && (
        <CreateUserModal
          open={showCreateUserModal}
          onOpenChange={setShowCreateUserModal}
          onUserCreated={handleUserCreated}
          tenantId={user.tenantId}
        />
      )}

      {/* Modal para ver detalles del usuario */}
      <ViewUserModal
        open={showViewUserModal}
        onOpenChange={setShowViewUserModal}
        user={selectedUser}
      />

      {/* Botón flotante para guardar cambios del perfil */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
        hasUnsavedChanges 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="relative">
          {/* Efecto de brillo sutil */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-sm"></div>
          
          {/* Botón principal */}
          <Button 
            onClick={handleProfileUpdate} 
            disabled={imageLoading}
            className="relative rounded-full px-6 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 border-0 backdrop-blur-sm"
          >
            {imageLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm font-medium">Guardando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Guardar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
