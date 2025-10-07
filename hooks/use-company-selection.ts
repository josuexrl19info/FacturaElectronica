"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  nombreComercial: string
  logo?: {
    fileName: string
    type: string
    size: number
    fileData: string
  }
  brandColor?: string
}

export function useCompanySelection() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const router = useRouter()

  const selectCompany = async (company: Company) => {
    try {
      console.log('🎯 selectCompany called with:', company)
      setIsLoading(true)
      setSelectedCompany(company)
      
      // Guardar en localStorage
      localStorage.setItem("selectedCompanyId", company.id)
      localStorage.setItem("selectedCompanyData", JSON.stringify({
        id: company.id,
        name: company.name,
        nombreComercial: company.nombreComercial,
        logo: company.logo,
        brandColor: company.brandColor
      }))

      // Simular tiempo de carga para mostrar la animación
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Redirigir al dashboard
      router.push("/dashboard")
      
    } catch (error) {
      console.error('Error selecting company:', error)
      setIsLoading(false)
      setSelectedCompany(null)
    }
  }

  return {
    isLoading,
    selectedCompany,
    selectCompany
  }
}
