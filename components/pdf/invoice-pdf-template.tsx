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
            <div>
              {data.company.logo && (
                <img src={data.company.logo || "/placeholder.svg"} alt={data.company.name} className="h-16 mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2">{data.company.name}</h1>
              <p className="text-sm text-gray-600">Cédula: {data.company.id}</p>
              <p className="text-sm text-gray-600">{data.company.phone}</p>
              <p className="text-sm text-gray-600">{data.company.email}</p>
              <p className="text-sm text-gray-600 mt-1">{data.company.address}</p>
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
      <div className="mb-8 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
        <p className="text-xs font-semibold text-gray-700 mb-1">Clave Numérica:</p>
        <p className="text-sm font-mono break-all">{data.key}</p>
      </div>

      {/* Client info */}
      <div className="mb-8 p-6 border border-gray-200 rounded-lg">
        <h2 className="text-sm font-bold text-gray-700 mb-3">FACTURAR A:</h2>
        <p className="font-semibold text-lg">{data.client.name}</p>
        <p className="text-sm text-gray-600">Cédula: {data.client.id}</p>
        {data.client.phone && <p className="text-sm text-gray-600">{data.client.phone}</p>}
        {data.client.email && <p className="text-sm text-gray-600">{data.client.email}</p>}
        {data.client.address && <p className="text-sm text-gray-600 mt-1">{data.client.address}</p>}
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
