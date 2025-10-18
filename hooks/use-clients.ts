import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase-client'

export interface Client {
  id: string
  name: string
  commercialName?: string
  identification: string
  identificationType: string
  email: string
  phone: string
  phoneCountryCode: string
  province: string
  canton: string
  district: string
  otrasSenas: string
  economicActivity: {
    codigo: string
    descripcion: string
    estado: string
  }
  exemption?: {
    isExempt: boolean
    exemptionType?: string
    documentNumber?: string
    documentDate?: string
    institutionName?: string
    institutionNameOthers?: string
    tariffExempted?: number
    observations?: string
  }
  // Nuevo formato de exoneración
  tieneExoneracion?: boolean
  exoneracion?: {
    tipoDocumento: string
    tipoDocumentoOtro?: string
    numeroDocumento: string
    nombreLey?: string
    articulo?: string
    inciso?: string
    porcentajeCompra?: string
    nombreInstitucion: string
    nombreInstitucionOtros?: string
    fechaEmision: string
    tarifaExonerada: number
    montoExoneracion?: string
  }
  tenantId: string
  createdBy: string
  createdAt: Date
  updatedBy: string
  updatedAt: Date
  status: 'active' | 'inactive' | 'suspended'
  totalInvoices: number
  totalAmount: number
  companyIds: string[]
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchClients = async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const selectedCompanyId = localStorage.getItem('selectedCompanyId')
      const params = new URLSearchParams({
        tenantId: user.tenantId
      })

      if (selectedCompanyId) {
        params.append('companyId', selectedCompanyId)
      }

      const response = await fetch(`/api/clients?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar clientes')
      }

      setClients(result.clients || [])
    } catch (err) {
      console.error('Error al cargar clientes:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const addClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev])
  }

  const updateClient = (clientId: string, updatedData: Partial<Client>) => {
    setClients(prev => 
      prev.map(client => 
        client.id === clientId ? { ...client, ...updatedData } : client
      )
    )
  }

  const removeClient = (clientId: string) => {
    setClients(prev => prev.filter(client => client.id !== clientId))
  }

  useEffect(() => {
    fetchClients()
  }, [user?.tenantId])

  return {
    clients,
    loading,
    error,
    fetchClients,
    addClient,
    updateClient,
    removeClient
  }
}
