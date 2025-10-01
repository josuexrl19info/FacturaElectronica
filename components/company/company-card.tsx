"use client"

import { Card } from "@/components/ui/card"
import Image from "next/image"

interface CompanyCardProps {
  company: {
    id: string
    name: string
    legalName: string
    logo?: string
    primaryColor: string
  }
  onClick: () => void
}

export function CompanyCard({ company, onClick }: CompanyCardProps) {
  return (
    <Card
      className="company-card relative overflow-hidden cursor-pointer group border-2 hover:border-primary"
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${company.primaryColor}15 0%, transparent 100%)`,
      }}
    >
      <div className="aspect-[4/3] flex flex-col items-center justify-center p-8 relative">
        {/* Logo */}
        <div className="relative w-24 h-24 mb-4 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm flex items-center justify-center">
          {company.logo ? (
            <Image src={company.logo || "/placeholder.svg"} alt={company.name} fill className="object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl font-bold"
              style={{ color: company.primaryColor }}
            >
              {company.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Company name */}
        <h3 className="text-xl font-bold text-center text-balance mb-1">{company.name}</h3>
        <p className="text-sm text-muted-foreground text-center text-balance">{company.legalName}</p>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Card>
  )
}
