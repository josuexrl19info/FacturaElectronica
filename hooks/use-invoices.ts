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
      
      return !!(user.tenantId && selectedCompanyId && user.id)
    } catch (error) {
      return false
    }
  }, [])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar si los datos de autenticación están disponibles
      if (!checkAuthData()) {
        return
      }

      // Obtener datos del usuario autenticado
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')

      if (!user.tenantId || !selectedCompanyId) {
        return
      }

      const response = await fetch(`/api/invoices?tenantId=${user.tenantId}&companyId=${selectedCompanyId}`)
      
      if (!response.ok) {
        throw new Error('Error al obtener facturas')
      }

      const data = await response.json()
      setInvoices(data.invoices || [])
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

      // Refrescar la lista de facturas después de crear
      await fetchInvoices()
      
      return result.invoiceId
    } catch (err) {
      console.error('Error al crear factura:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage) // Propagar el error para que el modal lo maneje
    } finally {
      setLoading(false)
    }
  }, [fetchInvoices])

  // Effect para verificar cuando los datos de autenticación estén disponibles
  useEffect(() => {
    const checkAndFetch = () => {
      const authDataOk = checkAuthData()
      
      if (authDataOk) {
        setIsReady(true)
        fetchInvoices()
      } else {
        setIsReady(true) // Marcar como listo incluso sin datos para mostrar la UI
        // Solo intentar una vez más después de un breve delay
        setTimeout(() => {
          const authDataOkRetry = checkAuthData()
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
