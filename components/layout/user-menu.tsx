"use client"

import { Building2, Settings, User, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface UserMenuProps {
  currentCompany?: {
    name: string
    logo?: string
  }
}

export function UserMenu({ currentCompany }: UserMenuProps) {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleChangeCompany = () => {
    router.push("/select-company")
  }

  const handleSettings = () => {
    router.push("/dashboard/settings")
  }

  const handleProfile = () => {
    router.push("/dashboard/settings?tab=profile")
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.push("/")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="gap-2 h-auto py-2 px-3 hover:bg-accent/50 transition-colors flex items-center gap-2 bg-transparent border-none outline-none cursor-pointer">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
              <AvatarFallback className="text-xs font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('') || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{user?.name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user?.role?.name || "Usuario"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
              <AvatarFallback className="text-sm font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('') || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {user?.role?.name || "Usuario"}
              </Badge>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleChangeCompany} className="gap-2 cursor-pointer">
          <Building2 className="w-4 h-4" />
          <span>Cambiar de Empresa</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleProfile} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettings} className="gap-2 cursor-pointer">
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive">
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}