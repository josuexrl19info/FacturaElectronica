"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/products/product-card"
import { ProductForm } from "@/components/products/product-form"
import { ProductViewDetails } from "@/components/products/product-view-details"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProducts } from "@/hooks/use-products"
import { ProductFormData, Product } from "@/lib/product-types"
import { Plus, Search, Package, DollarSign, FileText, Loader2, RefreshCw, TrendingUp } from "lucide-react"

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { products, loading, error, fetchProducts, addProduct } = useProducts()

  const handleAddProduct = async (data: ProductFormData) => {
    try {
      // Obtener datos del usuario autenticado
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')

      if (!user.id || !user.tenantId) {
        throw new Error('Usuario no autenticado')
      }

      const url = isEditing && selectedProduct 
        ? `/api/products/update/${selectedProduct.id}`
        : '/api/products/create'
      const method = isEditing && selectedProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tenantId: user.tenantId,
          createdBy: user.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Error al ${isEditing ? 'actualizar' : 'crear'} producto`)
      }

      console.log(`✅ Producto ${isEditing ? 'actualizado' : 'creado'} exitosamente:`, result)
      
      // Cerrar formulario y refrescar lista
      handleCloseForm()
      fetchProducts()
      
    } catch (error) {
      console.error(`❌ Error al ${isEditing ? 'actualizar' : 'crear'} producto:`, error)
    }
  }

  const handleRefresh = () => {
    fetchProducts()
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowViewModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = !product.activo
      
      const response = await fetch(`/api/products/${product.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el estado del producto')
      }

      // Refrescar la lista de productos
      await fetchProducts()
    } catch (error) {
      console.error('Error al cambiar estado del producto:', error)
    }
  }

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setSelectedProduct(null)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setIsEditing(false)
    setSelectedProduct(null)
  }

  // Filtrar productos basado en el término de búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products

    const term = searchTerm.toLowerCase()
    return products.filter((product) =>
      product.detalle.toLowerCase().includes(term) ||
      product.codigoCABYS.includes(term) ||
      product.unidadMedida.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalProducts = products.length
    const activeProducts = products.filter(p => p.activo).length
    const totalValue = products.reduce((sum, p) => sum + p.precioUnitario, 0)
    const exoneratedProducts = products.filter(p => p.tieneExoneracion).length

    return {
      totalProducts,
      activeProducts,
      totalValue,
      exoneratedProducts
    }
  }, [products])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Productos y Servicios" description="Gestione su catálogo de productos y servicios" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CABYS o unidad de medida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <motion.div
                  animate={{ rotate: [0, 90, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Plus className="w-4 h-4" />
                </motion.div>
                Agregar Producto
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Package className="w-5 h-5 text-blue-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Productos</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    {stats.totalProducts}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {stats.activeProducts}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    {formatCurrency(stats.totalValue)}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"
                  whileHover={{ rotate: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <FileText className="w-5 h-5 text-orange-600" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">Exonerados</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    {stats.exoneratedProducts}
                  </motion.p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-2">Cargando productos...</h3>
            <p className="text-muted-foreground">Por favor espere mientras se cargan los datos</p>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-12 text-center border-destructive/20 bg-destructive/5">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-destructive">Error al cargar productos</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </Card>
        )}

        {/* Products List */}
        {!loading && !error && (
          <>
            <motion.div 
              className="grid grid-cols-1 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.05 // Stagger effect
                    }}
                  >
                    <ProductCard
                      product={product}
                      onEdit={handleEditProduct}
                      onToggleStatus={handleToggleStatus}
                      onView={handleViewProduct}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {filteredProducts.length === 0 && searchTerm && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground mb-4">
                  No hay productos que coincidan con "{searchTerm}"
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Limpiar búsqueda
                </Button>
              </Card>
            )}

            {/* No Products State */}
            {filteredProducts.length === 0 && !searchTerm && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No tienes productos aún</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primer producto o servicio para gestionar tu catálogo
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Producto
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm 
          onClose={handleCloseForm} 
          onSubmit={handleAddProduct}
          editingProduct={isEditing ? selectedProduct : undefined}
        />
      )}

      {/* View Product Modal */}
      {showViewModal && selectedProduct && (
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto w-full">
            <DialogHeader>
              <DialogTitle>Detalles del Producto</DialogTitle>
            </DialogHeader>
            <ProductViewDetails product={selectedProduct} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
