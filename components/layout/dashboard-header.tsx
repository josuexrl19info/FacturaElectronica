"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserMenu } from "./user-menu"

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const currentCompany = {
    name: "Tech Solutions CR",
    logo: "/tech-company-logo.jpg",
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-balance">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9 w-64" />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <UserMenu currentCompany={currentCompany} />
        </div>
      </div>
    </header>
  )
}
