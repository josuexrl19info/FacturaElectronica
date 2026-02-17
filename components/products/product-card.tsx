"use client"

import { motion } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Edit, 
  Eye, 
  Package,
  DollarSign,
  Percent,
  Calendar,
  Tag,
  FileText,
  Power,
  PowerOff
} from "lucide-react"
import { Product, UNIDADES_MEDIDA, TIPOS_IMPUESTO, TARIFAS_IMPUESTO } from '@/lib/product-types'

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onToggleStatus?: (product: Product) => void
  onView?: (product: Product) => void
}

export function ProductCard({ product, onEdit, onToggleStatus, onView }: ProductCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Verificar que la fecha sea válida
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida recibida:', date)
      return 'N/A'
    }
    
    // Verificar que toLocaleDateString existe y es una función
    if (typeof dateObj.toLocaleDateString !== 'function') {
      console.warn('toLocaleDateString no es una función para:', dateObj)
      return 'N/A'
    }
    
    try {
      return dateObj.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha:', date)
      return 'N/A'
    }
  }

  const getUnidadMedida = (codigo: string) => {
    return UNIDADES_MEDIDA.find(u => u.codigo === codigo)?.descripcion || codigo
  }

  const getTipoImpuesto = (codigo: string) => {
    return TIPOS_IMPUESTO.find(t => t.codigo === codigo)?.descripcion || codigo
  }

  const getTarifaImpuesto = (codigo: string, porcentaje: number) => {
    return TARIFAS_IMPUESTO.find(t => t.codigo === codigo && t.porcentaje === porcentaje)?.descripcion || `${porcentaje}%`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="p-4 hover:shadow-md transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary/60 cursor-pointer">
        <div className="flex items-start gap-3">
          {/* Icono del producto */}
          <motion.div 
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm"
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Package className="w-5 h-5" />
          </motion.div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold truncate">{product.detalle}</h3>
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {product.codigoCABYS}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {getUnidadMedida(product.unidadMedida)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {getTarifaImpuesto(product.codigoTarifaImpuesto, product.tarifaImpuesto)}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <motion.div 
                className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={{ x: 10 }}
                animate={{ x: 0 }}
              >
                {onView && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(product)} title="Ver detalles">
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(product)} title="Editar producto">
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
                {onToggleStatus && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 ${product.activo ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                    onClick={() => onToggleStatus(product)}
                    title={product.activo ? 'Inactivar producto' : 'Activar producto'}
                  >
                    {product.activo ? (
                      <PowerOff className="w-3 h-3" />
                    ) : (
                      <Power className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </motion.div>
            </div>

            {/* Información de precio y impuestos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <DollarSign className="w-3 h-3 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-600 text-xs">
                    {formatCurrency(product.precioUnitario)}
                  </p>
                  <p className="text-xs text-muted-foreground">Precio unitario</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">
                    {getTipoImpuesto(product.tipoImpuesto)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tipo de impuesto</p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(product.fechaActualizacion)}
                </span>
                {product.tieneExoneracion && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    Exonerado
                  </Badge>
                )}
              </div>

              {/* Estado del producto */}
              <Badge 
                variant={product.activo ? "default" : "destructive"}
                className="text-xs px-1.5 py-0.5"
              >
                {product.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            {/* Información de exoneración */}
            {product.tieneExoneracion && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                  {product.numeroDocumentoExoneracion && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Documento:</span> {product.numeroDocumentoExoneracion}
                    </p>
                  )}
                  {product.porcentajeExoneracion && product.porcentajeExoneracion > 0 && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Exoneración:</span> {product.porcentajeExoneracion}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
