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

interface UserMenuProps {
  currentCompany?: {
    name: string
    logo?: string
  }
}

export function UserMenu({ currentCompany }: UserMenuProps) {
  const router = useRouter()

  const handleChangeCompany = () => {
    router.push("/select-company")
  }

  const handleSettings = () => {
    router.push("/dashboard/settings")
  }

  const handleProfile = () => {
    router.push("/dashboard/settings?tab=profile")
  }

  const handleLogout = () => {
    router.push("/")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="gap-2 h-auto py-2 px-3 hover:bg-accent/50 transition-colors flex items-center gap-2 bg-transparent border-none outline-none cursor-pointer">
          <div className="flex items-center gap-2">
            {currentCompany?.logo ? (
              <img
                src={currentCompany.logo || "/placeholder.svg"}
                alt={currentCompany.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                {currentCompany?.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{currentCompany?.name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ver opciones</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
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