"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { userService, UserProfile } from "@/lib/firebase-users"
import { passwordService } from "@/lib/firebase-password"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToastNotification } from "@/components/providers/toast-provider"
import { Key, Mail, Calendar, Clock, Lock, Camera, X, Loader2 } from "lucide-react"

export function ProfileSettingsPanel() {
  const toast = useToastNotification()
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: "",
    notifications: true,
    language: "es",
    timezone: "America/Costa_Rica",
  })
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const loadCurrentProfile = async () => {
      try {
        const profile = await userService.getCurrentUserProfile()
        setCurrentProfile(profile)
        setProfileForm({
          name: profile?.name || "",
          notifications: profile?.profile?.preferences?.notifications || true,
          language: profile?.profile?.preferences?.language || "es",
          timezone: profile?.profile?.preferences?.timezone || "America/Costa_Rica",
        })
        setProfileImage(profile?.profileImage || null)
      } catch (error) {
        console.error("Error al cargar perfil:", error)
      }
    }

    void loadCurrentProfile()
  }, [])

  useEffect(() => {
    if (!currentProfile) return

    const hasChanges =
      profileForm.name !== currentProfile.name ||
      profileForm.notifications !== currentProfile.profile?.preferences?.notifications ||
      profileForm.language !== currentProfile.profile?.preferences?.language ||
      profileForm.timezone !== currentProfile.profile?.preferences?.timezone ||
      profileImage !== currentProfile.profileImage

    setHasUnsavedChanges(hasChanges)
  }, [profileForm, profileImage, currentProfile])

  const handleProfileUpdate = async () => {
    try {
      setImageLoading(true)

      if (profileImage) {
        await userService.updateProfileImage(profileImage)
      }

      await userService.updateCurrentUserProfile({
        name: profileForm.name,
        profile: {
          preferences: {
            notifications: profileForm.notifications,
            language: profileForm.language,
            timezone: profileForm.timezone,
          },
        },
      })

      const updatedProfile = await userService.getCurrentUserProfile()
      setCurrentProfile(updatedProfile)
      setProfileImage(updatedProfile?.profileImage || null)
      setHasUnsavedChanges(false)

      toast.success("Perfil actualizado", "Tus cambios se han guardado correctamente")
    } catch (error) {
      console.error("Error al actualizar perfil:", error)
      toast.error("Error al actualizar", "No se pudieron guardar los cambios. Intenta de nuevo.")
    } finally {
      setImageLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      setPasswordLoading(true)
      await passwordService.sendPasswordResetEmail()
      setShowPasswordDialog(false)
      toast.success("Enlace enviado", "Se ha enviado un enlace de restablecimiento a tu correo electrónico")
    } catch (error: unknown) {
      console.error("Error al enviar email de restablecimiento:", error)
      toast.error(
        "Error al enviar enlace",
        error instanceof Error ? error.message : "No se pudo enviar el email de restablecimiento"
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Archivo inválido", "Por favor selecciona un archivo de imagen válido")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagen muy grande", "La imagen no puede ser mayor a 5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setProfileImage((e.target?.result as string) || null)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Mi Perfil</h2>
          <p className="text-muted-foreground">Administre su información personal y preferencias</p>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profileImage || "/placeholder-user.jpg"} />
                  <AvatarFallback className="text-lg">
                    {currentProfile?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <label htmlFor="profile-image" className="cursor-pointer">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary transition-colors hover:bg-primary/80">
                      <Camera className="h-3 w-3 text-primary-foreground" />
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
                {profileImage ? (
                  <button
                    type="button"
                    onClick={() => setProfileImage(null)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive transition-colors hover:bg-destructive/80"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                ) : null}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{currentProfile?.name || "Cargando..."}</h3>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {currentProfile?.email || "Cargando..."}
                </p>
                <Badge variant="default" className="mt-1">
                  {currentProfile?.role?.name || "Usuario"}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Ingrese su nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" value={currentProfile?.email || ""} disabled className="bg-muted" />
                  <p className="mt-1 text-xs text-muted-foreground">El correo electrónico no se puede cambiar</p>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowPasswordDialog(true)}>
                  <Key className="h-4 w-4" />
                  Cambiar contraseña
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Preferencias</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Notificaciones</Label>
                  <p className="text-sm text-muted-foreground">Recibir notificaciones del sistema</p>
                </div>
                <Switch
                  id="notifications"
                  checked={profileForm.notifications}
                  onCheckedChange={(checked) => setProfileForm({ ...profileForm, notifications: checked })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={profileForm.language}
                    onValueChange={(value) => setProfileForm({ ...profileForm, language: value })}
                  >
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
                  <Select
                    value={profileForm.timezone}
                    onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value })}
                  >
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

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Información del Sistema</h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Último acceso:{" "}
                  {currentProfile?.lastLoginAt ? new Date(currentProfile.lastLoginAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Miembro desde:{" "}
                  {currentProfile?.createdAt ? new Date(currentProfile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Estado: {currentProfile?.status === "active" ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

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

      <div
        className={`fixed bottom-8 left-1/2 z-50 -translate-x-1/2 transform transition-all duration-500 ease-out ${
          hasUnsavedChanges ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <Button onClick={handleProfileUpdate} disabled={imageLoading} className="rounded-full px-6 shadow-lg">
          {imageLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </>
  )
}
