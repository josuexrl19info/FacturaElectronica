"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/firebase-client"
import { useCompanySelection } from "@/hooks/use-company-selection"
import { DocumentType } from "@/components/documents/document-type-tabs"

interface Document {
  id: string
  consecutivo: string
  clientId: string
  status: string
  total: number
  createdAt: any
  updatedAt?: any
  documentType?: string
  companyId: string
  tenantId: string
  subtotal: number
  totalImpuesto: number
  totalDescuento: number
  exchangeRate: number
  currency: string
  items: any[]
  [key: string]: any // Permitir propiedades adicionales
}

export function useDocuments(documentType: DocumentType) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { user } = useAuth()

  const checkAuthData = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
        const companyId = localStorage.getItem('selectedCompanyId')
        return !!(storedUser.tenantId && companyId && storedUser.id)
      }
      return false
    } catch (error) {
      return false
    }
  }, [])

  const fetchDocuments = useCallback(async () => {
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

      // Determinar qué tabla consultar según el tipo de documento
      let collectionName = 'invoices' // Por defecto facturas
      let filterField = 'documentType'
      let filterValue = documentType

      // Para tiquetes, usar tabla específica
      if (documentType === 'tiquetes') {
        collectionName = 'tickets'
        filterField = 'tenantId' // Los tiquetes no tienen documentType
        filterValue = user.tenantId
      }

      // Para notas de crédito
      if (documentType === 'notas-credito') {
        collectionName = 'creditNotes'
        filterField = 'tenantId'
        filterValue = user.tenantId
      }

      // Para notas de débito, no mostrar nada por ahora
      if (documentType === 'notas-debito') {
        setDocuments([])
        setLoading(false)
        return
      }

      // Construir la URL del API
      let apiUrl = `/api/invoices?tenantId=${user.tenantId}&companyId=${selectedCompanyId}`
      
      if (documentType === 'tiquetes') {
        apiUrl = `/api/tickets?tenantId=${user.tenantId}&companyId=${selectedCompanyId}`
      } else if (documentType === 'notas-credito') {
        apiUrl = `/api/credit-notes?tenantId=${user.tenantId}&companyId=${selectedCompanyId}`
      }

      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Error al obtener documentos')
      }

      const data = await response.json()
      
      // Para facturas, filtrar por documentType si existe
      let filteredDocuments = data.documents || data.invoices || data.creditNotes || []
      
      if (documentType === 'facturas') {
        // Mostrar solo facturas (documentType === 'facturas' o undefined para compatibilidad)
        filteredDocuments = filteredDocuments.filter((doc: any) => 
          !doc.documentType || doc.documentType === 'facturas'
        )
      }

      // Ordenar por consecutivo descendente para notas de crédito
      if (documentType === 'notas-credito') {
        filteredDocuments.sort((a: any, b: any) => {
          const consecutivoA = a.consecutivo || ''
          const consecutivoB = b.consecutivo || ''
          
          // Extraer número del consecutivo para comparación numérica
          const numeroA = parseInt(consecutivoA.replace(/[^\d]/g, '')) || 0
          const numeroB = parseInt(consecutivoB.replace(/[^\d]/g, '')) || 0
          
          return numeroB - numeroA // Descendente: mayor primero
        })
      }

      setDocuments(filteredDocuments)
    } catch (err) {
      console.error('Error al obtener documentos:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [documentType, checkAuthData])

  // Effect para verificar cuando los datos de autenticación estén disponibles
  useEffect(() => {
    const checkAndFetch = () => {
      const authDataOk = checkAuthData()
      
      if (authDataOk) {
        setIsReady(true)
        fetchDocuments()
      } else {
        setIsReady(true) // Marcar como listo incluso sin datos para mostrar la UI
        // Solo intentar una vez más después de un breve delay
        setTimeout(() => {
          const authDataOkRetry = checkAuthData()
          if (authDataOkRetry) {
            fetchDocuments()
          }
        }, 1000)
      }
    }

    checkAndFetch()
  }, [checkAuthData, fetchDocuments])

  return {
    documents,
    loading,
    error,
    isReady,
    fetchDocuments
  }
}
