import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase-client'
import { Product } from '@/lib/product-types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchProducts = async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/products?tenantId=${user.tenantId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar productos')
      }

      setProducts(result.products || [])
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const addProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev])
  }

  const updateProduct = (productId: string, updatedData: Partial<Product>) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId ? { ...product, ...updatedData } : product
      )
    )
  }

  const removeProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId))
  }

  useEffect(() => {
    fetchProducts()
  }, [user?.tenantId])

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    removeProduct
  }
}
