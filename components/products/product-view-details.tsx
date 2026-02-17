"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Package,
  DollarSign,
  Percent,
  Calendar,
  Tag,
  FileText,
  Shield,
  Code
} from "lucide-react"
import { Product, UNIDADES_MEDIDA, TIPOS_IMPUESTO, TARIFAS_IMPUESTO } from '@/lib/product-types'

interface ProductViewDetailsProps {
  product: Product
}

export function ProductViewDetails({ product }: ProductViewDetailsProps) {
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
    
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'N/A'
    }
    
    try {
      return dateObj.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
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
    <div className="space-y-6">
      {/* Información Principal */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold">{product.detalle}</h3>
              <Badge 
                variant={product.activo ? "default" : "destructive"}
                className="text-sm"
              >
                {product.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Code className="w-4 h-4" />
              <span className="text-sm">Código CABYS: {product.codigoCABYS}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Precio */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold">Precio Unitario</h4>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(product.precioUnitario)}
            </p>
          </div>

          {/* Unidad de Medida */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Unidad de Medida</h4>
            </div>
            <p className="text-lg font-medium">
              {getUnidadMedida(product.unidadMedida)}
            </p>
            <p className="text-sm text-muted-foreground">Código: {product.unidadMedida}</p>
          </div>
        </div>
      </Card>

      {/* Información de Impuestos */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-purple-600" />
          Información de Impuestos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tipo de Impuesto</label>
            <p className="font-medium">{getTipoImpuesto(product.tipoImpuesto)}</p>
            <p className="text-xs text-muted-foreground">Código: {product.tipoImpuesto}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tarifa de Impuesto</label>
            <p className="font-medium">{getTarifaImpuesto(product.codigoTarifaImpuesto, product.tarifaImpuesto)}</p>
            <p className="text-xs text-muted-foreground">Código: {product.codigoTarifaImpuesto}</p>
          </div>
        </div>
      </Card>

      {/* Exoneración */}
      {product.tieneExoneracion && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Información de Exoneración
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.numeroDocumentoExoneracion && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número de Documento</label>
                <p className="font-medium">{product.numeroDocumentoExoneracion}</p>
              </div>
            )}
            {product.porcentajeExoneracion && product.porcentajeExoneracion > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Porcentaje de Exoneración</label>
                <p className="font-medium">{product.porcentajeExoneracion}%</p>
              </div>
            )}
            {product.nombreInstitucionExoneracion && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Institución</label>
                <p className="font-medium">{product.nombreInstitucionExoneracion}</p>
              </div>
            )}
            {product.fechaEmisionExoneracion && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de Emisión</label>
                <p className="font-medium">{formatDate(product.fechaEmisionExoneracion)}</p>
              </div>
            )}
            {product.montoExoneracion && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Monto Exonerado</label>
                <p className="font-medium">{formatCurrency(product.montoExoneracion)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Fechas */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          Fechas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
            <p className="font-medium">{formatDate(product.fechaCreacion)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
            <p className="font-medium">{formatDate(product.fechaActualizacion)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
