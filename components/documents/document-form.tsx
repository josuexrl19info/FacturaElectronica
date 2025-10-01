"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Search } from "lucide-react"

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
}

interface DocumentFormProps {
  type: "invoice" | "ticket" | "credit-note" | "debit-note"
  onSubmit: (data: any) => void
}

export function DocumentForm({ type, onSubmit }: DocumentFormProps) {
  const [client, setClient] = useState<any>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState("")

  const documentTitles = {
    invoice: "Factura Electrónica",
    ticket: "Tiquete Electrónico",
    "credit-note": "Nota de Crédito",
    "debit-note": "Nota de Débito",
  }

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 13,
      total: 0,
    }
    setLineItems([...lineItems, newItem])
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          // Recalculate total
          const subtotal = updated.quantity * updated.unitPrice
          const discountAmount = subtotal * (updated.discount / 100)
          const taxableAmount = subtotal - discountAmount
          const taxAmount = taxableAmount * (updated.tax / 100)
          updated.total = taxableAmount + taxAmount
          return updated
        }
        return item
      }),
    )
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice
    }, 0)

    const totalDiscount = lineItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice * (item.discount / 100)
    }, 0)

    const taxableAmount = subtotal - totalDiscount

    const totalTax = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice
      const itemDiscount = itemSubtotal * (item.discount / 100)
      const itemTaxable = itemSubtotal - itemDiscount
      return sum + itemTaxable * (item.tax / 100)
    }, 0)

    const total = taxableAmount + totalTax

    return { subtotal, totalDiscount, totalTax, total }
  }

  const totals = calculateTotals()

  const handleSubmit = () => {
    const documentData = {
      type,
      client,
      lineItems,
      notes,
      totals,
      date: new Date().toISOString(),
    }
    onSubmit(documentData)
  }

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Información del Cliente</h3>
        {!client ? (
          <Button
            variant="outline"
            className="w-full gap-2 bg-transparent"
            onClick={() => setClient({ name: "Cliente Demo" })}
          >
            <Search className="w-4 h-4" />
            Buscar Cliente
          </Button>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-semibold">{client.name}</p>
              <p className="text-sm text-muted-foreground">Cédula: 3-101-123456</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setClient(null)}>
              Cambiar
            </Button>
          </div>
        )}
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Detalle de Productos/Servicios</h3>
          <Button onClick={addLineItem} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Línea
          </Button>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay líneas agregadas</p>
            <p className="text-sm mt-1">Haga clic en "Agregar Línea" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        placeholder="Descripción del producto o servicio"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Precio Unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descuento (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateLineItem(item.id, "discount", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>IVA (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.tax}
                        onChange={(e) => updateLineItem(item.id, "tax", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <div className="text-right mt-4">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">
                        ₡{item.total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Totals */}
      {lineItems.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold mb-4">Resumen</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>₡{totals.subtotal.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Descuento</span>
                <span>-₡{totals.totalDiscount.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>IVA</span>
              <span>₡{totals.totalTax.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-2xl font-bold pt-3 border-t">
              <span>Total</span>
              <span>₡{totals.total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Notas Adicionales</h3>
        <Textarea
          placeholder="Información adicional, términos y condiciones, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!client || lineItems.length === 0} className="gap-2">
          Generar {documentTitles[type]}
        </Button>
      </div>
    </div>
  )
}
