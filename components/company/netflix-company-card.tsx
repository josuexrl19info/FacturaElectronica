"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2, Play, Building2, Calendar, MapPin } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { motion } from "framer-motion"

interface NetflixCompanyCardProps {
  company: {
    id: string
    name: string // Razón Social
    nombreComercial: string // Nombre Comercial
    identification: string
    identificationType: string
    logo?: {
      fileName: string
      type: string
      size: number
      fileData: string
    }
    brandColor: string
    status: string
    createdAt: any
    province: string
    canton: string
    district: string
    economicActivity?: {
      codigo: string
      descripcion: string
    }
  }
  onSelect: () => void
  onEdit: () => void
}

export function NetflixCompanyCard({ company, onSelect, onEdit }: NetflixCompanyCardProps) {
  const [imageError, setImageError] = useState(false)
  
  console.log('🎯 NetflixCompanyCard - company:', company)
  console.log('🎯 NetflixCompanyCard - createdAt:', company.createdAt, typeof company.createdAt)
  console.log('🎯 NetflixCompanyCard - atvCredentials:', company.atvCredentials)
  console.log('🎯 NetflixCompanyCard - environment:', company.atvCredentials?.environment)
  console.log('🎯 NetflixCompanyCard - onSelect:', onSelect)
  
  // Convertir fecha de creación
  let createdAt: Date | null = null
  
  if (company.createdAt) {
    // Si ya es un objeto Date (procesado por la API)
    if (company.createdAt instanceof Date) {
      createdAt = company.createdAt
    }
    // Si es un Timestamp de Firestore (fallback)
    else if (typeof company.createdAt.toDate === 'function') {
      createdAt = company.createdAt.toDate()
    }
    // Si es un string o número
    else if (typeof company.createdAt === 'string' || typeof company.createdAt === 'number') {
      createdAt = new Date(company.createdAt)
    }
    // Si es un objeto serializado de Firestore (fallback)
    else if (company.createdAt._seconds) {
      createdAt = new Date(company.createdAt._seconds * 1000)
    }
  }
  
  const formattedDate = createdAt && !isNaN(createdAt.getTime()) 
    ? createdAt.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Fecha no disponible'

  // Obtener código de provincia para mostrar nombre
  const getProvinceName = (code: string) => {
    const provinces: { [key: string]: string } = {
      '1': 'San José', '2': 'Alajuela', '3': 'Cartago', '4': 'Heredia',
      '5': 'Guanacaste', '6': 'Puntarenas', '7': 'Limón'
    }
    return provinces[code] || 'Costa Rica'
  }

  // Generar imagen base64 del logo
  const logoUrl = company.logo?.fileData 
    ? `data:${company.logo.type};base64,${company.logo.fileData}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
    >
      <Card 
        className="group relative overflow-hidden cursor-pointer bg-gradient-to-br from-card via-card to-card/80 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10"
        onClick={(e) => {
          console.log('🎯 Card clicked - calling onSelect')
          onSelect()
        }}
      >
      {/* Background gradient based on brand color */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${company.brandColor} 0%, transparent 100%)`
        }}
      />
      
      {/* Edit button - aparece en hover */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-lg rounded-md border border-border/50 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            console.log('🎯 Edit button clicked')
            onEdit()
          }}
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>

      {/* Environment badge */}
      <div className="absolute top-3 left-3 z-10">
        <Badge 
          variant={company.atvCredentials?.environment === 'sandbox' ? 'secondary' : 'default'}
          className={`text-xs bg-background/80 backdrop-blur-sm ${
            company.atvCredentials?.environment === 'sandbox' 
              ? 'text-orange-800 border-orange-200' 
              : 'text-green-800 border-green-200'
          }`}
        >
          {company.atvCredentials?.environment === 'sandbox' ? 'Empresa de Pruebas' : 'Empresa Productiva'}
        </Badge>
      </div>

      <div className="relative p-6">
        {/* Logo section */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center shadow-lg border border-border/20">
            {logoUrl && !imageError ? (
              <Image 
                src={logoUrl} 
                alt={company.nombreComercial} 
                fill 
                className="object-contain p-1"
                onError={() => setImageError(true)}
              />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate text-foreground">
              {company.nombreComercial}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {company.name}
            </p>
          </div>
        </div>

        {/* Company details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {company.identificationType === '01' ? 'Física' : 'Jurídica'}
            </Badge>
            <span className="text-muted-foreground font-mono">
              {company.identification}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {getProvinceName(company.province)}, Costa Rica
            </span>
          </div>

          {company.economicActivity && (
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Actividad:</span>
                <Badge variant="outline" className="text-xs">
                  {company.economicActivity.codigo}
                </Badge>
              </div>
              <p className="text-xs line-clamp-2">
                {company.economicActivity.descripcion}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Creada el {formattedDate}</span>
          </div>
        </div>

        {/* Action indicator */}
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-2 border border-border rounded-md bg-primary/5 text-primary transition-all duration-300 flex items-center justify-center gap-2 pointer-events-none">
            <Play className="w-4 h-4" />
            <span className="font-medium">Trabajar</span>
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
    </motion.div>
  )
}
