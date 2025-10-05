"use client"

import { forwardRef } from "react"

interface InvoiceData {
  number: string
  key: string
  date: string
  dueDate?: string
  company: {
    name: string
    id: string
    phone: string
    email: string
    address: string
    logo?: string
  }
  client: {
    name: string
    id: string
    phone?: string
    email?: string
    address?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    total: number
  }>
  subtotal: number
  totalDiscount: number
  totalTax: number
  totalExempt: number
  total: number
  notes?: string
}

interface InvoicePDFTemplateProps {
  data: InvoiceData
}

export const InvoicePDFTemplate = forwardRef<HTMLDivElement, InvoicePDFTemplateProps>(({ data }, ref) => {
  // Debug: Verificar datos del logo
  console.log('🔍 DEBUG Template - Logo exists:', !!data.company.logo)
  console.log('🔍 DEBUG Template - Logo type:', typeof data.company.logo)
  
  // Verificar si el logo es válido y procesarlo
  let processedLogo = null
  let hasValidLogo = false
  
  if (data.company.logo) {
    if (data.company.logo.startsWith('data:') || 
        data.company.logo.startsWith('http') ||
        data.company.logo.startsWith('/')) {
      // Ya tiene prefijo válido
      processedLogo = data.company.logo
      hasValidLogo = true
      console.log('✅ Logo ya tiene prefijo válido')
    } else {
      // Es Base64 puro, agregar prefijo
      processedLogo = `data:image/png;base64,${data.company.logo}`
      hasValidLogo = true
      console.log('✅ Logo Base64 puro convertido con prefijo')
    }
  }
  
  console.log('🔍 DEBUG Template - Has valid logo:', hasValidLogo)
  console.log('🔍 DEBUG Template - Processed logo length:', processedLogo?.length || 0)
  
  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 p-12 max-w-4xl mx-auto"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header with gradient */}
      <div className="mb-8">
        <div
          className="h-3 rounded-t-lg"
          style={{
            background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
          }}
        />
        <div className="border-x border-b border-gray-200 p-8 rounded-b-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {/* Logo Section - Solo si existe y es válido */}
              {hasValidLogo && (
                <div className="flex-shrink-0">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <img 
                      src={processedLogo || ''} 
                      alt={`Logo de ${data.company.name}`} 
                      className="h-20 w-20 object-contain"
                      style={{
                        maxHeight: '80px',
                        maxWidth: '80px',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.error('❌ Error cargando logo:', processedLogo?.substring(0, 100))
                        console.error('❌ Error details:', e)
                        console.error('❌ Logo length:', processedLogo?.length)
                      }}
                      onLoad={() => {
                        console.log('✅ Logo cargado exitosamente en PDF')
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Company Info - Ocupa todo el ancho si no hay logo */}
              <div className={hasValidLogo ? "flex-1" : "w-full"}>
                <h1 className="text-3xl font-bold mb-2 text-gray-800">{data.company.name}</h1>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Cédula:</span>
                    {data.company.id}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Teléfono:</span>
                    {data.company.phone}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Email:</span>
                    {data.company.email}
                  </p>
                  <p className="text-sm text-gray-600 flex items-start">
                    <span className="font-medium text-gray-500 mr-2 mt-0.5">Dirección:</span>
                    <span className="leading-relaxed">{data.company.address}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className="inline-block px-4 py-2 rounded-lg text-white font-bold text-lg mb-2"
                style={{
                  background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
                }}
              >
                FACTURA ELECTRÓNICA
              </div>
              <p className="text-sm font-semibold">No. {data.number}</p>
              <p className="text-xs text-gray-600 mt-2">Fecha: {data.date}</p>
              {data.dueDate && <p className="text-xs text-gray-600">Vencimiento: {data.dueDate}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Clave numérica */}
      <div className="mb-8 p-5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
        <div className="flex items-center mb-3">
          <div 
            className="w-1 h-5 rounded-full mr-3"
            style={{
              background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
            }}
          />
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Clave Numérica de Factura Electrónica:</p>
        </div>
        <div className="bg-white p-3 rounded-md border border-teal-100">
          <p className="text-sm font-mono text-gray-800 break-all leading-relaxed">{data.key}</p>
        </div>
      </div>

      {/* Client info */}
      <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
        <div className="flex items-center mb-4">
          <div 
            className="w-1 h-6 rounded-full mr-3"
            style={{
              background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
            }}
          />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">FACTURAR A:</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-lg text-gray-800 mb-2">{data.client.name}</p>
            <p className="text-sm text-gray-600 flex items-center">
              <span className="font-medium text-gray-500 mr-2">Cédula:</span>
              {data.client.id}
            </p>
          </div>
          
          <div className="space-y-1">
            {data.client.phone && (
              <p className="text-sm text-gray-600 flex items-center">
                <span className="font-medium text-gray-500 mr-2">Teléfono:</span>
                {data.client.phone}
              </p>
            )}
            {data.client.email && (
              <p className="text-sm text-gray-600 flex items-center">
                <span className="font-medium text-gray-500 mr-2">Email:</span>
                {data.client.email}
              </p>
            )}
          </div>
        </div>
        
        {data.client.address && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 flex items-start">
              <span className="font-medium text-gray-500 mr-2 mt-0.5">Dirección:</span>
              <span className="leading-relaxed">{data.client.address}</span>
            </p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="text-white text-sm"
              style={{
                background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
              }}
            >
              <th className="text-left p-3 rounded-tl-lg">Descripción</th>
              <th className="text-center p-3">Cantidad</th>
              <th className="text-right p-3">Precio Unit.</th>
              <th className="text-right p-3">Descuento</th>
              <th className="text-right p-3">IVA</th>
              <th className="text-right p-3 rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-3 text-sm">{item.description}</td>
                <td className="p-3 text-center text-sm">{item.quantity}</td>
                <td className="p-3 text-right text-sm">₡{item.unitPrice.toLocaleString("es-CR")}</td>
                <td className="p-3 text-right text-sm">₡{item.discount.toLocaleString("es-CR")}</td>
                <td className="p-3 text-right text-sm">₡{item.tax.toLocaleString("es-CR")}</td>
                <td className="p-3 text-right text-sm font-semibold">₡{item.total.toLocaleString("es-CR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-semibold">₡{data.subtotal.toLocaleString("es-CR")}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Descuento Total:</span>
            <span className="text-sm font-semibold text-red-600">-₡{data.totalDiscount.toLocaleString("es-CR")}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">IVA (13%):</span>
            <span className="text-sm font-semibold">₡{data.totalTax.toLocaleString("es-CR")}</span>
          </div>
          {data.totalExempt > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Exoneración:</span>
              <span className="text-sm font-semibold text-green-600">-₡{data.totalExempt.toLocaleString("es-CR")}</span>
            </div>
          )}
          <div
            className="flex justify-between py-3 mt-2 px-4 rounded-lg text-white"
            style={{
              background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
            }}
          >
            <span className="font-bold">TOTAL:</span>
            <span className="font-bold text-xl">₡{data.total.toLocaleString("es-CR")}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Notas:</h3>
          <p className="text-sm text-gray-600">{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-8 border-t border-gray-200">
        <p className="text-xs text-gray-500">Este documento es una representación impresa de una Factura Electrónica</p>
        <p className="text-xs text-gray-500 mt-1">Autorizado mediante resolución del Ministerio de Hacienda</p>
        <div
          className="h-1 w-32 mx-auto mt-4 rounded-full"
          style={{
            background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0891b2 100%)",
          }}
        />
      </div>
    </div>
  )
})

InvoicePDFTemplate.displayName = "InvoicePDFTemplate"
