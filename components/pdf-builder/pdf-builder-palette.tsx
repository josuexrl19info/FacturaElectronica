"use client"

import { useDraggable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import {
  Badge,
  Building2,
  Calculator,
  Columns2,
  Columns3,
  Factory,
  FileKey,
  Image,
  ImagePlus,
  LayoutPanelTop,
  Minus,
  MoveVertical,
  Scale,
  StickyNote,
  Table,
  Type,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDF_BLOCK_CATALOG, PDF_LAYOUT_QUICK_ADD, PDF_PALETTE_CATEGORIES, getPaletteItem } from "@/lib/pdf-builder/block-catalog"
import type { PdfBlockType } from "@/lib/pdf-builder/types"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Image,
  Badge,
  Building2,
  Type,
  ImagePlus,
  Factory,
  User,
  FileKey,
  Table,
  Calculator,
  StickyNote,
  Columns2,
  Columns3,
  LayoutPanelTop,
  Minus,
  MoveVertical,
  Scale,
}

type PdfBuilderPaletteProps = {
  onAddBlock: (type: PdfBlockType) => void
}

function PaletteDraggable({
  type,
  label,
  description,
  icon,
  onAdd,
}: {
  type: PdfBlockType
  label: string
  description: string
  icon: string
  onAdd: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, source: "palette" },
  })
  const Icon = ICONS[icon] || Type

  return (
    <div ref={setNodeRef} className={`flex gap-1 ${isDragging ? "opacity-40" : ""}`}>
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-border/60 bg-background p-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-medium">{label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{description}</p>
        </div>
      </button>
      <Button type="button" variant="outline" size="icon" className="h-auto shrink-0 px-2" title="Agregar al lienzo" onClick={onAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function PdfBuilderPalette({ onAddBlock }: PdfBuilderPaletteProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Paleta de componentes</h3>
        <p className="text-[11px] text-muted-foreground">Arrastra, usa + o suelta dentro de un layout</p>
      </div>

      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Layout rápido</p>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 w-full justify-start gap-2 text-xs"
          onClick={() => onAddBlock("container")}
        >
          <LayoutPanelTop className="h-3.5 w-3.5" />
          Contenedor
        </Button>
        <p className="text-[10px] text-muted-foreground">Elige 1, 2 o 3 columnas desde el lienzo</p>
      </div>

      {PDF_PALETTE_CATEGORIES.map((cat) => {
        const items = PDF_BLOCK_CATALOG.filter(
          (i) => i.category === cat.id && (cat.id !== "layout" || !PDF_LAYOUT_QUICK_ADD.includes(i.type))
        )
        if (items.length === 0) return null
        return (
          <div key={cat.id} className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</p>
            <div className="space-y-1.5">
              {items.map((item) => (
                <PaletteDraggable
                  key={item.type}
                  type={item.type}
                  label={item.label}
                  description={item.description}
                  icon={item.icon}
                  onAdd={() => onAddBlock(item.type)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
