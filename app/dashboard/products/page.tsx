"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ProductForm } from "@/components/products/product-form"
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from "lucide-react"

const mockProducts = [
  {
    id: "1",
    type: "product",
    name: "Laptop Dell Inspiron 15",
    description: "Laptop empresarial con procesador Intel i7",
    sku: "DELL-INS-15-001",
    cabysCode: "4620101010000",
    cabysDescription: "Computadoras portátiles",
    price: 850000,
    cost: 650000,
    taxRate: 13,
    stock: 15,
    minStock: 5,
    unit: "unidad",
  },
  {
    id: "2",
    type: "service",
    name: "Consultoría en TI",
    description: "Servicio de consultoría tecnológica por hora",
    sku: "",
    cabysCode: "8111501010000",
    cabysDescription: "Servicios de consultoría en tecnología",
    price: 45000,
    cost: 0,
    taxRate: 13,
    stock: 0,
    minStock: 0,
    unit: "hora",
  },
  {
    id: "3",
    type: "product",
    name: "Mouse Inalámbrico Logitech",
    description: "Mouse ergonómico inalámbrico",
    sku: "LOG-MX-001",
    cabysCode: "4320101010000",
    cabysDescription: "Dispositivos de entrada",
    price: 25000,
    cost: 15000,
    taxRate: 13,
    stock: 3,
    minStock: 10,
    unit: "unidad",
  },
]

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState(mockProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "product" | "service">("all")

  const handleAddProduct = (data: any) => {
    console.log("New product:", data)
    setShowForm(false)
    // Add to products list
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.cabysCode.includes(searchTerm)

    const matchesType = filterType === "all" || product.type === filterType

    return matchesSearch && matchesType
  })

  const lowStockProducts = products.filter((p) => p.type === "product" && p.stock <= p.minStock)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Productos y Servicios" description="Gestione su catálogo de productos y servicios" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o CABYS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filterType === "product" ? "default" : "outline"}
                onClick={() => setFilterType("product")}
                size="sm"
              >
                Productos
              </Button>
              <Button
                variant={filterType === "service" ? "default" : "outline"}
                onClick={() => setFilterType("service")}
                size="sm"
              >
                Servicios
              </Button>
            </div>
          </div>

          <Button onClick={() => setShowForm(true)} className="gap-2 w-full md:w-auto">
            <Plus className="w-4 h-4" />
            Agregar Producto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Productos</p>
            <p className="text-3xl font-bold">{products.filter((p) => p.type === "product").length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Servicios</p>
            <p className="text-3xl font-bold">{products.filter((p) => p.type === "service").length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Valor Inventario</p>
            <p className="text-3xl font-bold">
              ₡
              {products
                .filter((p) => p.type === "product")
                .reduce((sum, p) => sum + p.cost * p.stock, 0)
                .toLocaleString("es-CR")}
            </p>
          </Card>
          <Card className="p-6 border-orange-500/50">
            <p className="text-sm text-muted-foreground mb-1">Stock Bajo</p>
            <p className="text-3xl font-bold text-orange-600">{lowStockProducts.length}</p>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="p-4 border-orange-500/50 bg-orange-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-600">Productos con stock bajo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {lowStockProducts.map((p) => p.name).join(", ")} necesitan reabastecimiento
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <Badge variant={product.type === "product" ? "default" : "secondary"}>
                          {product.type === "product" ? "Producto" : "Servicio"}
                        </Badge>
                        {product.type === "product" && product.stock <= product.minStock && (
                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                            Stock Bajo
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        {product.sku && (
                          <span className="text-muted-foreground">
                            SKU: <span className="font-mono">{product.sku}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          CABYS: <span className="font-mono">{product.cabysCode}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="font-bold">₡{product.price.toLocaleString("es-CR")}</p>
                    </div>
                    {product.type === "product" && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Costo</p>
                          <p className="font-bold">₡{product.cost.toLocaleString("es-CR")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stock</p>
                          <p className="font-bold">
                            {product.stock} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Margen</p>
                          <p className="font-bold text-green-600">
                            {(((product.price - product.cost) / product.price) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </>
                    )}
                    {product.type === "service" && (
                      <div>
                        <p className="text-sm text-muted-foreground">Unidad</p>
                        <p className="font-bold">{product.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No se encontraron productos</h3>
            <p className="text-muted-foreground">Intente con otros términos de búsqueda o filtros</p>
          </Card>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && <ProductForm onClose={() => setShowForm(false)} onSubmit={handleAddProduct} />}
    </div>
  )
}
