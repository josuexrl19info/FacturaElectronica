"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  MessageSquare,
  Mail,
} from "lucide-react"

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Documentos",
    icon: FileText,
    href: "/dashboard/documents",
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/dashboard/clients",
  },
  {
    title: "Productos",
    icon: Package,
    href: "/dashboard/products",
  },
  {
    title: "Reportes",
    icon: BarChart3,
    href: "/dashboard/reports",
  },
  {
    title: "Pruebas de Correo",
    icon: Mail,
    href: "/dashboard/email-test",
  },
  {
    title: "Configuración",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

interface SidebarProps {
  company: {
    name: string
    logo?: string
    primaryColor: string
  }
}

export function Sidebar({ company }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-card via-card to-card/95 border-r border-border/50 backdrop-blur-xl transition-all duration-300 z-40 flex flex-col shadow-xl",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="p-4 border-b border-border/50 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary-subtle opacity-50" />
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg relative z-10 gradient-primary">
          {company.name.charAt(0)}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 relative z-10">
            <h2 className="font-bold truncate text-gradient">{company.name}</h2>
            <p className="text-xs text-muted-foreground">InvoSell por InnovaSellCR</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isActive
                      ? "gradient-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                      : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 text-muted-foreground hover:text-foreground hover:scale-[1.02]",
                    collapsed && "justify-center",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform duration-300",
                      isActive && "scale-110",
                      !isActive && "group-hover:scale-110",
                    )}
                  />
                  {!collapsed && <span className="flex-1 font-medium">{item.title}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-xl border scale-95 group-hover:scale-100">
                      {item.title}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-border/50 space-y-2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary-subtle opacity-30" />
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 relative z-10 hover:bg-primary/10 transition-all duration-300",
            collapsed && "justify-center px-0",
          )}
          asChild
        >
          <Link href="/select-company">
            <Building2 className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Cambiar Empresa</span>}
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground relative z-10 hover:bg-destructive/10 hover:text-destructive transition-all duration-300",
            collapsed && "justify-center px-0",
          )}
          asChild
        >
          <Link href="/">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </Link>
        </Button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-7 h-7 gradient-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 border-2 border-background"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

    </aside>
  )
}
