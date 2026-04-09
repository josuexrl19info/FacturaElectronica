"use client"

import { Card } from "@/components/ui/card"
import { QuotationLine, QuotationSettings } from "@/components/quotations/types"

type QuotationSidebarProps = {
  lines: QuotationLine[]
  settings: QuotationSettings
}

function formatMoney(value: number, currency: "CRC" | "USD" | "EUR"): string {
  const locale = currency === "CRC" ? "es-CR" : "en-US"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function computeSummary(lines: QuotationLine[], discountPercent: number) {
  const itemLines = lines.filter((line) => line.type === "item")
  const subtotalBruto = itemLines.reduce((acc, line) => acc + line.quantity * line.price, 0)
  const descuentoPorLinea = itemLines.reduce(
    (acc, line) => acc + line.quantity * line.price * (line.lineDiscountPercent / 100),
    0,
  )
  const subtotalNeto = subtotalBruto - descuentoPorLinea
  const taxes = itemLines.reduce((acc, line) => {
    const base = line.quantity * line.price * (1 - line.lineDiscountPercent / 100)
    return acc + base * (line.taxRate / 100)
  }, 0)
  const descuentoGlobal = subtotalNeto * (discountPercent / 100)
  const total = subtotalNeto + taxes - descuentoGlobal
  return { subtotalBruto, descuentoPorLinea, subtotalNeto, taxes, descuentoGlobal, total }
}

export function QuotationSidebar({ lines, settings }: QuotationSidebarProps) {
  const summary = computeSummary(lines, settings.discountPercent)

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
        <h3 className="font-semibold text-base">Resumen</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal bruto</span>
            <span>{formatMoney(summary.subtotalBruto, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Descuento por linea</span>
            <span>- {formatMoney(summary.descuentoPorLinea, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal neto</span>
            <span>{formatMoney(summary.subtotalNeto, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Impuestos</span>
            <span>{formatMoney(summary.taxes, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Descuento global</span>
            <span>- {formatMoney(summary.descuentoGlobal, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatMoney(summary.total, settings.currency)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

