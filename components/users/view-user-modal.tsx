"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserProfile } from "@/lib/firebase-users"
import { 
  Mail, 
  Calendar, 
  Clock, 
  Shield, 
  Globe,
  Bell,
  User
} from "lucide-react"

interface ViewUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
}

export function ViewUserModal({ open, onOpenChange, user }: ViewUserModalProps) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Detalles del Usuario
          </DialogTitle>
          <DialogDescription>
            Información completa del usuario del sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del usuario */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profileImage || "/placeholder-user.jpg"} />
              <AvatarFallback className="text-lg">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default">
                  {user.role?.name || 'Usuario'}
                </Badge>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Información detallada */}
          <div className="grid gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Información del Sistema
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Miembro desde:</span>
                  <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Último acceso:</span>
                  <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Preferencias
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Idioma:</span>
                  <span>{user.profile?.preferences?.language === 'es' ? 'Español' : 'English'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Zona horaria:</span>
                  <span>{user.profile?.preferences?.timezone || 'America/Costa_Rica'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Bell className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Notificaciones:</span>
                  <Badge variant={user.profile?.preferences?.notifications ? 'default' : 'secondary'}>
                    {user.profile?.preferences?.notifications ? 'Activas' : 'Inactivas'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permisos
              </h4>
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">Este usuario tiene acceso a:</p>
                <div className="flex flex-wrap gap-1">
                  {user.role?.permissions?.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission === 'all' ? 'Acceso completo' : permission}
                    </Badge>
                  )) || (
                    <Badge variant="outline" className="text-xs">
                      Sin permisos específicos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
