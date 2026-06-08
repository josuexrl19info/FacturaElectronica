"use client"

import { useCallback, useMemo, useState } from "react"
import { useCompanyPersonalization } from "@/components/providers/company-theme-provider"
import { buildPreviewInvoiceData } from "@/lib/pdf-builder/preview-invoice-data"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PdfBuilderPalette } from "@/components/pdf-builder/pdf-builder-palette"
import { PdfBuilderCanvas } from "@/components/pdf-builder/pdf-builder-canvas"
import { PdfBuilderPreview } from "@/components/pdf-builder/pdf-builder-preview"
import { PdfBlockProperties } from "@/components/pdf-builder/pdf-block-properties"
import { createBlockFromType, getPaletteItem } from "@/lib/pdf-builder/block-catalog"
import { DEFAULT_INVOICE_PDF_TEMPLATE } from "@/lib/pdf-builder/default-template"
import {
  CANVAS_DROP_ID,
  appendToColumn,
  collectAllBlockIds,
  findBlock,
  insertBlockAtRoot,
  moveBlockInTree,
  parseColumnDropId,
  removeBlockById,
  setContainerColumns,
  updateBlockTree,
} from "@/lib/pdf-builder/tree-utils"
import type { InvoicePdfTemplate, PdfBlockType } from "@/lib/pdf-builder/types"

type InvoicePdfBuilderProps = {
  template: InvoicePdfTemplate
  onChange: (template: InvoicePdfTemplate) => void
}

export function InvoicePdfBuilder({ template, onChange }: InvoicePdfBuilderProps) {
  const { companyData } = useCompanyPersonalization()
  const previewData = useMemo(() => buildPreviewInvoiceData(companyData), [companyData])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const sortableIds = useMemo(() => collectAllBlockIds(template.blocks), [template.blocks])
  const selectedBlock = useMemo(
    () => (selectedId ? findBlock(template.blocks, selectedId) : null),
    [selectedId, template.blocks]
  )

  const addBlockToRoot = useCallback(
    (type: PdfBlockType) => {
      const block = createBlockFromType(type)
      onChange({ ...template, blocks: [...template.blocks, block] })
      setSelectedId(block.id)
    },
    [template, onChange]
  )

  const placeNewBlockFromPalette = useCallback(
    (type: PdfBlockType, overId: string) => {
      const newBlock = createBlockFromType(type)

      const drop = parseColumnDropId(overId)
      if (drop) {
        onChange({
          ...template,
          blocks: appendToColumn(template.blocks, drop.containerId, drop.columnIndex, newBlock),
        })
        setSelectedId(newBlock.id)
        return
      }

      if (overId === CANVAS_DROP_ID) {
        addBlockToRoot(type)
        return
      }

      const overOnCanvas = sortableIds.includes(overId)
      if (overOnCanvas) {
        onChange({ ...template, blocks: insertBlockAtRoot(template.blocks, newBlock, overId) })
        setSelectedId(newBlock.id)
        return
      }

      addBlockToRoot(type)
    },
    [template, onChange, addBlockToRoot, sortableIds]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragLabel(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith("palette-")) {
      const type = active.data.current?.type as PdfBlockType
      if (type) placeNewBlockFromPalette(type, overId)
      return
    }

    const nextBlocks = moveBlockInTree(template.blocks, activeId, overId)
    onChange({ ...template, blocks: nextBlocks })
  }

  const handleRemove = (id: string) => {
    onChange({ ...template, blocks: removeBlockById(template.blocks, id) })
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const pointer = pointerWithin(args)
        if (pointer.length > 0) return pointer
        return rectIntersection(args)
      }}
      onDragStart={(e) => {
        const type = e.active.data.current?.type as PdfBlockType | undefined
        const source = e.active.data.current?.source as string | undefined
        if (type) {
          setActiveDragLabel(getPaletteItem(type)?.label || null)
        } else if (source === "canvas") {
          const blockType = e.active.data.current?.blockType as PdfBlockType | undefined
          setActiveDragLabel(getPaletteItem(blockType || "custom-text")?.label || "Componente")
        }
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Armador de PDF</h3>
            <p className="text-xs text-muted-foreground">Arrastra para mover · suelta en columnas · sin duplicar</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange({
              ...DEFAULT_INVOICE_PDF_TEMPLATE,
              primaryColor: template.primaryColor,
              accentColor: template.accentColor,
            })
            setSelectedId(null)
          }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restablecer diseño
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_400px]">
        <div className="rounded-xl border bg-background/80 p-3 xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
          <PdfBuilderPalette onAddBlock={addBlockToRoot} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-xl border bg-background/80 p-3">
            <PdfBlockProperties
              template={template}
              selectedBlock={selectedBlock}
              onTemplateChange={onChange}
              onBlockChange={(blockId, updater) =>
                onChange({ ...template, blocks: updateBlockTree(template.blocks, blockId, updater) })
              }
              onRemoveBlock={handleRemove}
              onContainerColumnsChange={(containerId, columns) =>
                onChange({ ...template, blocks: setContainerColumns(template.blocks, containerId, columns) })
              }
            />
          </div>

          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <PdfBuilderCanvas
              blocks={template.blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRemove={handleRemove}
              onContainerColumnsChange={(containerId, columns) =>
                onChange({ ...template, blocks: setContainerColumns(template.blocks, containerId, columns) })
              }
            />
          </SortableContext>
        </div>

        <div className="xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto">
          <PdfBuilderPreview template={template} data={previewData} companyName={previewData.company.commercialName} />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragLabel ? (
          <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">{activeDragLabel}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
