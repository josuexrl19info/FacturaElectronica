"use client"

import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"

interface AddCompanyCardProps {
  onClick: () => void
}

export function AddCompanyCard({ onClick }: AddCompanyCardProps) {
  return (
    <Card
      className="company-card relative overflow-hidden cursor-pointer group border-2 border-dashed hover:border-primary"
      onClick={onClick}
    >
      <div className="aspect-[4/3] flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 mb-4 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Plus className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <h3 className="text-xl font-bold text-center">Agregar Empresa</h3>
        <p className="text-sm text-muted-foreground text-center mt-1">Crear nueva empresa</p>
      </div>
    </Card>
  )
}
