"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
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
  Shield,
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
    title: "Configuración",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

interface SidebarProps {
  company?: {
    id: string
    name: string // Razón Social
    nombreComercial: string // Nombre Comercial
    logo?: {
      fileName: string
      type: string
      size: number
      fileData: string
    }
    logoUrl?: string
    brandColor: string
  }
}

export function Sidebar({ company }: SidebarProps) {
  // Valores por defecto si no hay empresa (para panel de admin)
  const companyData = company || {
    id: 'admin',
    name: 'Super Administrador',
    nombreComercial: 'Admin Panel',
    brandColor: '#6366f1'
  }
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  
  // Detectar si estamos en rutas de admin
  const isAdminRoute = pathname?.startsWith('/admin')

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-card via-card to-card/95 border-r border-border/50 backdrop-blur-xl transition-all duration-300 z-40 flex flex-col shadow-xl",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <motion.div 
        className="p-4 border-b border-border/50 flex items-center gap-3 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 gradient-primary-subtle opacity-50" />
        <motion.div 
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg relative z-10 bg-white border-2 border-white overflow-hidden"
          whileHover={{ scale: 1.05, rotate: 2 }}
          transition={{ duration: 0.2 }}
        >
          {companyData.logoUrl ? (
            <img 
              src={companyData.logoUrl} 
              alt={companyData.nombreComercial} 
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <span className="text-xl font-bold text-primary">
              {companyData.nombreComercial.charAt(0)}
            </span>
          )}
        </motion.div>
        {!collapsed && (
          <motion.div 
            className="flex-1 min-w-0 relative z-10"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="font-bold text-lg truncate text-gradient leading-tight">
              {companyData.nombreComercial}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              InvoSell por InnovaSellCR
            </p>
          </motion.div>
        )}
      </motion.div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <motion.ul 
          className="space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Admin Menu Item - Solo mostrar si estamos en rutas de admin */}
          {isAdminRoute && (
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <motion.div
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    pathname === "/admin" || pathname?.startsWith("/admin/")
                      ? "gradient-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                      : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 text-muted-foreground hover:text-foreground hover:scale-[1.02]",
                    collapsed && "justify-center",
                  )}
                >
                  <Shield
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform duration-300",
                      (pathname === "/admin" || pathname?.startsWith("/admin/")) && "scale-110",
                    )}
                  />
                  {!collapsed && <span className="flex-1 font-medium">Super Admin</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-xl border scale-95 group-hover:scale-100">
                      Super Admin
                    </div>
                  )}
                </Link>
              </motion.div>
            </motion.li>
          )}
          
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))

            return (
              <motion.li 
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + (index * 0.05) }}
              >
                <motion.div
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
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
                </motion.div>
              </motion.li>
            )
          })}
        </motion.ul>
      </nav>

      <motion.div 
        className="p-3 border-t border-border/50 space-y-2 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="absolute inset-0 gradient-primary-subtle opacity-30" />
        <motion.div
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
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
        </motion.div>

        <motion.div
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
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
        </motion.div>
      </motion.div>

      <motion.button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-7 h-7 gradient-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 border-2 border-background"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </motion.div>
      </motion.button>

    </aside>
  )
}
