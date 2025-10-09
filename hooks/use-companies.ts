"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase-client'

interface Company {
  id: string
  name: string
  nombreComercial: string
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
  consecutiveNT?: number
}

export function useCompanies() {
  const { user, loading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('🔍 useCompanies - authLoading:', authLoading, 'user:', user)

  useEffect(() => {
    const fetchCompanies = async () => {
      // Esperar a que termine la autenticación
      if (authLoading) {
        return
      }

      if (!user?.id) {
        console.log('🔍 No hay usuario autenticado')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 Fetching companies for tenantId:', user.tenantId)
        const response = await fetch(`/api/companies?tenantId=${user.tenantId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Error al cargar empresas')
        }

        setCompanies(data)
      } catch (err: any) {
        console.error('Error fetching companies:', err)
        setError(err.message || 'Error al cargar empresas')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [user, authLoading])

  return { companies, loading, error }
}
