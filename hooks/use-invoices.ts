import { useState, useEffect, useCallback } from 'react'
import { Invoice } from '@/lib/invoice-types'

interface UseInvoicesReturn {
  invoices: Invoice[]
  loading: boolean
  error: string | null
  fetchInvoices: () => Promise<void>
  createInvoice: (invoiceData: Partial<Invoice>) => Promise<string | null>
  isReady: boolean
}

export function useInvoices(): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const checkAuthData = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')
      
      console.log('🔍 checkAuthData - Datos encontrados:', {
        user: user,
        selectedCompanyId: selectedCompanyId,
        hasTenantId: !!user.tenantId,
        hasCompanyId: !!selectedCompanyId,
        hasUserId: !!user.id
      })
      
      const isValid = !!(user.tenantId && selectedCompanyId && user.id)
      console.log('✅ checkAuthData - Es válido:', isValid)
      
      return isValid
    } catch (error) {
      console.log('❌ checkAuthData - Error:', error)
      return false
    }
  }, [])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar si los datos de autenticación están disponibles
      if (!checkAuthData()) {
        console.log('🔍 Datos de autenticación no disponibles aún, esperando...')
        return
      }

      // Obtener datos del usuario autenticado
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')

      console.log('🔍 Intentando obtener facturas para:', { 
        tenantId: user.tenantId, 
        companyId: selectedCompanyId 
      })

      if (!user.tenantId || !selectedCompanyId) {
        console.log('❌ Datos de autenticación incompletos:', { 
          hasTenantId: !!user.tenantId, 
          hasCompanyId: !!selectedCompanyId 
        })
        return
      }

      const response = await fetch(`/api/invoices?tenantId=${user.tenantId}&companyId=${selectedCompanyId}`)
      
      if (!response.ok) {
        throw new Error('Error al obtener facturas')
      }

      const data = await response.json()
      console.log('📋 Respuesta del API:', data)
      setInvoices(data.invoices || [])
      console.log(`✅ Se obtuvieron ${data.invoices?.length || 0} facturas`)
    } catch (err) {
      console.error('❌ Error al obtener facturas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [checkAuthData])

  const createInvoice = useCallback(async (invoiceData: Partial<Invoice>): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Creando factura con datos:', invoiceData)

      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData), // Los datos ya vienen completos desde handleCreateInvoice
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear factura')
      }

      // Refrescar la lista de facturas
      console.log('🔄 Refrescando lista de facturas después de crear...')
      await fetchInvoices()
      console.log('✅ Lista de facturas refrescada')
      
      return result.invoiceId
    } catch (err) {
      console.error('Error al crear factura:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchInvoices])

  // Effect para verificar cuando los datos de autenticación estén disponibles
  useEffect(() => {
    console.log('🔄 useEffect ejecutándose - verificando datos de autenticación...')
    
    const checkAndFetch = () => {
      console.log('🔍 Verificando datos de autenticación...')
      const authDataOk = checkAuthData()
      console.log('✅ Datos de autenticación OK:', authDataOk)
      
      if (authDataOk) {
        setIsReady(true)
        console.log('🚀 Iniciando fetchInvoices...')
        fetchInvoices()
      } else {
        console.log('⏳ Datos de autenticación no disponibles, marcando como listo y esperando...')
        setIsReady(true) // Marcar como listo incluso sin datos para mostrar la UI
        // Solo intentar una vez más después de un breve delay
        setTimeout(() => {
          console.log('🔄 Reintentando después de 1 segundo...')
          const authDataOkRetry = checkAuthData()
          console.log('✅ Datos de autenticación OK en retry:', authDataOkRetry)
          if (authDataOkRetry) {
            fetchInvoices()
          }
        }, 1000)
      }
    }

    checkAndFetch()
  }, [checkAuthData, fetchInvoices])

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    isReady
  }
}
