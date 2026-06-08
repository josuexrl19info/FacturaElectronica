"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FileText } from "lucide-react"
import type { InvoicePersonalization } from "@/lib/theme/company-personalization.types"
import { DEFAULT_COMPANY_THEME } from "@/lib/theme/company-theme.presets"
import { isValidHexColor, sanitizeHexColor } from "@/lib/theme/company-theme.utils"

type InvoicesPersonalizationTabProps = {
  draftInvoices: InvoicePersonalization
  onChange: (value: InvoicePersonalization) => void
}

export function InvoicesPersonalizationTab({ draftInvoices, onChange }: InvoicesPersonalizationTabProps) {
  const headerPreview = sanitizeHexColor(draftInvoices.headerColor, DEFAULT_COMPANY_THEME.primaryColor)
  const tablePreview = sanitizeHexColor(draftInvoices.tableAccentColor, DEFAULT_COMPANY_THEME.accentColor)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="space-y-5 border-primary/15 p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Apariencia de facturas</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ColorField
            id="invoiceHeaderColor"
            label="Color de encabezado PDF"
            value={draftInvoices.headerColor}
            onChange={(value) => onChange({ ...draftInvoices, headerColor: value })}
          />
          <ColorField
            id="invoiceTableAccent"
            label="Color de tablas / detalle"
            value={draftInvoices.tableAccentColor}
            onChange={(value) => onChange({ ...draftInvoices, tableAccentColor: value })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-primary/10 p-3">
          <div>
            <Label htmlFor="showLogoOnPdf">Mostrar logo en PDF</Label>
            <p className="text-xs text-muted-foreground">Incluye el logo de la empresa en documentos generados.</p>
          </div>
          <Switch
            id="showLogoOnPdf"
            checked={draftInvoices.showLogoOnPdf}
            onCheckedChange={(checked) => onChange({ ...draftInvoices, showLogoOnPdf: checked })}
          />
        </div>
      </Card>

      <Card className="h-fit space-y-3 border-primary/15 p-5">
        <h3 className="text-lg font-semibold">Vista previa factura</h3>
        <div className="overflow-hidden rounded-xl border">
          <div className="px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: headerPreview }}>
            Factura Electrónica
          </div>
          <div className="space-y-2 bg-background p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emisor</span>
              <span>Empresa demo</span>
            </div>
            <div
              className="rounded-md px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: tablePreview }}
            >
              Detalle de líneas
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const pickerValue = isValidHexColor(value) ? value : "#000000"

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-11 w-14 cursor-pointer rounded-md border bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
          placeholder="#2dd4bf"
          className="h-11 flex-1 rounded-md border bg-background px-3 text-sm"
        />
      </div>
    </div>
  )
}
