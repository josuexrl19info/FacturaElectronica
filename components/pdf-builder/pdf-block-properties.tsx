"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import type { ContainerColumns, InvoicePdfTemplate, PdfBlock } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"
import { getPaletteItem } from "@/lib/pdf-builder/block-catalog"
import { DEFAULT_LOGO_HEIGHT_PX, DEFAULT_LOGO_WIDTH_PX } from "@/lib/pdf-builder/block-defaults"
import { applyLogoDimensionsToTemplate } from "@/lib/pdf-builder/tree-utils"
import { isValidHexColor } from "@/lib/theme/company-theme.utils"

type PdfBlockPropertiesProps = {
  template: InvoicePdfTemplate
  selectedBlock: PdfBlock | null
  onTemplateChange: (template: InvoicePdfTemplate) => void
  onBlockChange: (blockId: string, updater: (block: PdfBlock) => PdfBlock) => void
  onRemoveBlock: (blockId: string) => void
  onContainerColumnsChange?: (containerId: string, columns: ContainerColumns) => void
}

export function PdfBlockProperties({
  template,
  selectedBlock,
  onTemplateChange,
  onBlockChange,
  onRemoveBlock,
  onContainerColumnsChange,
}: PdfBlockPropertiesProps) {
  const patch = (updater: (b: PdfBlock) => PdfBlock) => {
    if (!selectedBlock) return
    onBlockChange(selectedBlock.id, updater)
  }

  const patchProps = (partial: NonNullable<PdfBlock["props"]>) => {
    patch((b) => ({ ...b, props: { ...b.props, ...partial } }))
  }

  const templateLogoW = template.logoWidth ?? DEFAULT_LOGO_WIDTH_PX
  const templateLogoH = template.logoHeight ?? DEFAULT_LOGO_HEIGHT_PX

  const setLogoDimensions = (width: number, height: number) => {
    onTemplateChange(applyLogoDimensionsToTemplate(template, width, height))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Propiedades</h3>
          <p className="text-[11px] text-muted-foreground">
            {selectedBlock
              ? `Editando: ${getPaletteItem(selectedBlock.type)?.label || selectedBlock.type}`
              : "Selecciona un bloque en el lienzo"}
          </p>
        </div>
        {selectedBlock ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => onRemoveBlock(selectedBlock.id)}
          >
            <Trash2 className="h-3 w-3" />
            Eliminar bloque
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Documento</p>
        <ColorField label="Color principal" value={template.primaryColor} onChange={(v) => onTemplateChange({ ...template, primaryColor: v })} />
        <ColorField label="Color acento" value={template.accentColor} onChange={(v) => onTemplateChange({ ...template, accentColor: v })} />
        <InlineSwitch label="Logo global" checked={template.showLogo} onChange={(c) => onTemplateChange({ ...template, showLogo: c })} />
        <Field label="Ancho logo (px)" className="w-[100px]">
          <Input
            type="number"
            min={16}
            max={480}
            className="h-8 text-xs"
            value={templateLogoW}
            onChange={(e) => setLogoDimensions(Number(e.target.value), templateLogoH)}
          />
        </Field>
        <Field label="Alto logo (px)" className="w-[100px]">
          <Input
            type="number"
            min={16}
            max={480}
            className="h-8 text-xs"
            value={templateLogoH}
            onChange={(e) => setLogoDimensions(templateLogoW, Number(e.target.value))}
          />
        </Field>
        <Field label="Página" className="w-[100px]">
          <Select value={template.pageSize} onValueChange={(v) => onTemplateChange({ ...template, pageSize: v as "a4" | "letter" })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Carta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {selectedBlock ? (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-primary">Componente</p>

          {isContainerBlock(selectedBlock.type) && (
            <>
              <InlineSwitch
                label="Mostrar título"
                checked={Boolean(selectedBlock.props?.showTitle)}
                onChange={(c) => patchProps({ showTitle: c })}
              />
              {selectedBlock.props?.showTitle ? (
                <Field label="Título" className="min-w-[140px] flex-1">
                  <Input
                    className="h-8 text-xs"
                    value={selectedBlock.props?.title || ""}
                    onChange={(e) => patchProps({ title: e.target.value })}
                    placeholder="Ej. Encabezado"
                  />
                </Field>
              ) : null}
              <Field label="Columnas" className="w-[120px]">
                <Select
                  value={String(selectedBlock.props?.columns || 2)}
                  onValueChange={(v) => onContainerColumnsChange?.(selectedBlock.id, Number(v) as ContainerColumns)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 columna</SelectItem>
                    <SelectItem value="2">2 columnas</SelectItem>
                    <SelectItem value="3">3 columnas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Espaciado" className="w-[88px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.gap ?? 8} onChange={(e) => patchProps({ gap: Number(e.target.value) })} />
              </Field>
              <Field label="Padding" className="w-[88px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.padding ?? 10} onChange={(e) => patchProps({ padding: Number(e.target.value) })} />
              </Field>
              <p className="w-full border-t border-border/50 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Apariencia
              </p>
              <InlineSwitch
                label="Fondo"
                checked={Boolean(selectedBlock.props?.backgroundEnabled)}
                onChange={(c) => patchProps({ backgroundEnabled: c })}
              />
              {selectedBlock.props?.backgroundEnabled ? (
                <ColorField
                  label="Color fondo"
                  value={selectedBlock.props?.backgroundColor || "#f5f3ff"}
                  onChange={(v) => patchProps({ backgroundColor: v })}
                />
              ) : null}
              <InlineSwitch
                label="Borde"
                checked={Boolean(selectedBlock.props?.borderEnabled)}
                onChange={(c) => patchProps({ borderEnabled: c })}
              />
              {selectedBlock.props?.borderEnabled ? (
                <>
                  <ColorField
                    label="Color borde"
                    value={selectedBlock.props?.borderColor || "#c4b5fd"}
                    onChange={(v) => patchProps({ borderColor: v })}
                  />
                  <Field label="Grosor" className="w-[72px]">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-xs"
                      value={selectedBlock.props?.borderWidth ?? 1}
                      onChange={(e) => patchProps({ borderWidth: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Estilo" className="w-[110px]">
                    <Select
                      value={selectedBlock.props?.borderStyle || "solid"}
                      onValueChange={(v) => patchProps({ borderStyle: v as "solid" | "dashed" | "dotted" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Sólido</SelectItem>
                        <SelectItem value="dashed">Guiones</SelectItem>
                        <SelectItem value="dotted">Puntos</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Radio" className="w-[72px]">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-xs"
                      value={selectedBlock.props?.borderRadius ?? 8}
                      onChange={(e) => patchProps({ borderRadius: Number(e.target.value) })}
                    />
                  </Field>
                </>
              ) : null}
            </>
          )}

          {selectedBlock.type === "logo" && (
            <>
              <Field label="Ancho (px)" className="w-[88px]">
                <Input
                  type="number"
                  min={16}
                  max={480}
                  className="h-8 text-xs"
                  value={selectedBlock.props?.logoWidth ?? templateLogoW}
                  onChange={(e) => setLogoDimensions(Number(e.target.value), selectedBlock.props?.logoHeight ?? templateLogoH)}
                />
              </Field>
              <Field label="Alto (px)" className="w-[88px]">
                <Input
                  type="number"
                  min={16}
                  max={480}
                  className="h-8 text-xs"
                  value={selectedBlock.props?.logoHeight ?? templateLogoH}
                  onChange={(e) => setLogoDimensions(selectedBlock.props?.logoWidth ?? templateLogoW, Number(e.target.value))}
                />
              </Field>
            </>
          )}

          {selectedBlock.type === "company-name" && (
            <>
              <Field label="Nombre" className="min-w-[160px]">
                <Select value={selectedBlock.props?.nameDisplay || "both"} onValueChange={(v) => patchProps({ nameDisplay: v as "commercial" | "legal" | "both" })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="legal">Razón social</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <InlineSwitch label="Negrita" checked={selectedBlock.props?.nameBold !== false} onChange={(c) => patchProps({ nameBold: c })} />
              <Field label="Fuente" className="w-[80px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.nameFontSize ?? 14} onChange={(e) => patchProps({ nameFontSize: Number(e.target.value) })} />
              </Field>
            </>
          )}

          {(selectedBlock.type === "custom-text" || selectedBlock.type === "legal-text") && (
            <>
              {selectedBlock.type === "custom-text" && (
                <Field label="Texto" className="min-w-[160px] flex-1">
                  <Input className="h-8 text-xs" value={selectedBlock.props?.text || ""} onChange={(e) => patchProps({ text: e.target.value })} />
                </Field>
              )}
              <Field label="Fuente" className="w-[80px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.fontSize ?? 10} onChange={(e) => patchProps({ fontSize: Number(e.target.value) })} />
              </Field>
              <InlineSwitch label="Negrita" checked={Boolean(selectedBlock.props?.bold)} onChange={(c) => patchProps({ bold: c })} />
              <Field label="Alineación" className="w-[110px]">
                <Select value={selectedBlock.props?.align || "left"} onValueChange={(v) => patchProps({ align: v as "left" | "center" | "right" })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Izquierda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Derecha</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {selectedBlock.type === "document-badge" && (
            <>
              <Field label="Fuente" className="w-[80px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.badgeFontSize ?? 10} onChange={(e) => patchProps({ badgeFontSize: Number(e.target.value) })} />
              </Field>
              <InlineSwitch label="Negrita" checked={selectedBlock.props?.bold !== false} onChange={(c) => patchProps({ bold: c })} />
            </>
          )}

          {(selectedBlock.type === "emitter-info" || selectedBlock.type === "receiver-info") && (
            <InfoFieldsEditor block={selectedBlock} onPatch={patchProps} isReceiver={selectedBlock.type === "receiver-info"} />
          )}

          {selectedBlock.type === "document-meta" && (
            <DocumentMetaFieldsEditor block={selectedBlock} onPatch={patchProps} />
          )}

          {selectedBlock.type === "custom-image" && (
            <>
              <Field label="URL" className="min-w-[180px] flex-1">
                <Input className="h-8 text-xs" placeholder="https://..." value={selectedBlock.props?.imageUrl || ""} onChange={(e) => patchProps({ imageUrl: e.target.value })} />
              </Field>
              <Field label="Ancho" className="w-[80px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.imageWidth ?? 120} onChange={(e) => patchProps({ imageWidth: Number(e.target.value) })} />
              </Field>
              <Field label="Alto" className="w-[80px]">
                <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.imageHeight ?? 48} onChange={(e) => patchProps({ imageHeight: Number(e.target.value) })} />
              </Field>
            </>
          )}

          {selectedBlock.type === "spacer" && (
            <Field label="Altura (px)" className="w-[88px]">
              <Input type="number" className="h-8 text-xs" value={selectedBlock.props?.height ?? 10} onChange={(e) => patchProps({ height: Number(e.target.value) })} />
            </Field>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-2 text-center text-[11px] text-muted-foreground">
          Haz clic en un bloque del lienzo para editar sus propiedades
        </p>
      )}
    </div>
  )
}

function DocumentMetaFieldsEditor({
  block,
  onPatch,
}: {
  block: PdfBlock
  onPatch: (p: NonNullable<PdfBlock["props"]>) => void
}) {
  const fields = block.props?.documentMetaFields || {}
  const toggle = (key: keyof NonNullable<typeof fields>, val: boolean) => {
    onPatch({ documentMetaFields: { ...fields, [key]: val } })
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-2">
      <Field label="Columnas" className="w-[120px]">
        <Select
          value={String(block.props?.documentMetaColumns ?? 1)}
          onValueChange={(v) => onPatch({ documentMetaColumns: Number(v) as 1 | 2 })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 columna</SelectItem>
            <SelectItem value="2">2 columnas</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <span className="text-[10px] font-medium text-muted-foreground">Mostrar:</span>
      <InlineSwitch label="Consecutivo" checked={fields.consecutivo !== false} onChange={(c) => toggle("consecutivo", c)} />
      <InlineSwitch label="Clave" checked={fields.clave !== false} onChange={(c) => toggle("clave", c)} />
      <InlineSwitch label="Fecha" checked={fields.fecha !== false} onChange={(c) => toggle("fecha", c)} />
      <InlineSwitch label="Moneda" checked={fields.moneda !== false} onChange={(c) => toggle("moneda", c)} />
      <InlineSwitch label="Forma de pago" checked={fields.formaPago !== false} onChange={(c) => toggle("formaPago", c)} />
      <InlineSwitch label="Condición" checked={fields.condicionVenta !== false} onChange={(c) => toggle("condicionVenta", c)} />
    </div>
  )
}

function InfoFieldsEditor({
  block,
  onPatch,
  isReceiver,
}: {
  block: PdfBlock
  onPatch: (p: NonNullable<PdfBlock["props"]>) => void
  isReceiver: boolean
}) {
  const fields = block.props?.showFields || {}
  const toggle = (key: keyof NonNullable<typeof fields>, val: boolean) => {
    onPatch({ showFields: { ...fields, [key]: val } })
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-2">
      <span className="text-[10px] font-medium text-muted-foreground">Campos:</span>
      <InlineSwitch label="Cédula" checked={fields.id !== false} onChange={(c) => toggle("id", c)} />
      <InlineSwitch label="Teléfono" checked={fields.phone !== false} onChange={(c) => toggle("phone", c)} />
      <InlineSwitch label="Email" checked={fields.email !== false} onChange={(c) => toggle("email", c)} />
      <InlineSwitch label="Dirección" checked={fields.address !== false} onChange={(c) => toggle("address", c)} />
      {isReceiver ? (
        <InlineSwitch label="Actividad" checked={fields.economicActivity !== false} onChange={(c) => toggle("economicActivity", c)} />
      ) : null}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function InlineSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-md border border-border/60 bg-background px-2.5">
      <Label className="whitespace-nowrap text-[10px]">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const picker = isValidHexColor(value) ? value : "#000000"
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-1.5">
        <input type="color" value={picker} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" />
        <Input className="h-6 w-[72px] border-0 bg-transparent px-1 text-[10px] shadow-none focus-visible:ring-0" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}
