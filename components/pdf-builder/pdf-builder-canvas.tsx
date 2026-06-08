"use client"

import { useDroppable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPaletteItem } from "@/lib/pdf-builder/block-catalog"
import { cn } from "@/lib/utils"
import { containerBoxStyle } from "@/lib/pdf-builder/container-styles"
import { CANVAS_DROP_ID, ensureContainerSlots, getColumnDropId } from "@/lib/pdf-builder/tree-utils"
import type { ContainerColumns, PdfBlock } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"

type PdfBuilderCanvasProps = {
  blocks: PdfBlock[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onContainerColumnsChange: (containerId: string, columns: ContainerColumns) => void
}

function BlockChip({
  block,
  selected,
  onSelect,
  onRemove,
  dragHandle,
  compact,
}: {
  block: PdfBlock
  selected: boolean
  onSelect: () => void
  onRemove: () => void
  dragHandle?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md border px-2 py-1.5 transition ${
        compact ? "text-[9px]" : "text-[10px]"
      } ${selected ? "border-primary bg-primary/15 ring-1 ring-primary/40" : "border-border/70 bg-muted/30 hover:border-primary/40"}`}
    >
      {dragHandle}
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left font-medium"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {getPaletteItem(block.type)?.label || block.type}
      </button>
      <button
        type="button"
        className="rounded p-0.5 text-destructive hover:bg-destructive/10"
        title="Quitar"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onRemove()
        }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function SortableCanvasBlock({
  block,
  selectedId,
  onSelect,
  onRemove,
  onContainerColumnsChange,
  compact,
  renderContainer,
}: {
  block: PdfBlock
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onContainerColumnsChange: (containerId: string, columns: ContainerColumns) => void
  compact?: boolean
  renderContainer?: (block: PdfBlock) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { source: "canvas", blockType: block.type },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }
  const dragHandle = (
    <button
      type="button"
      className="cursor-grab shrink-0 text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )

  if (isContainerBlock(block.type) && renderContainer) {
    return (
      <div ref={setNodeRef} style={style} className="space-y-1">
        <div className="flex items-center gap-1 px-0.5">
          {dragHandle}
          <span className="text-[8px] text-muted-foreground">Arrastrar contenedor</span>
        </div>
        {renderContainer(block)}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <BlockChip
        block={block}
        selected={selectedId === block.id}
        onSelect={() => onSelect(block.id)}
        onRemove={() => onRemove(block.id)}
        dragHandle={dragHandle}
        compact={compact}
      />
    </div>
  )
}

function ColumnDropStack({
  containerId,
  columnIndex,
  blocks,
  selectedId,
  onSelect,
  onRemove,
  onContainerColumnsChange,
}: {
  containerId: string
  columnIndex: number
  blocks: PdfBlock[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onContainerColumnsChange: (containerId: string, columns: ContainerColumns) => void
}) {
  const dropId = getColumnDropId(containerId, columnIndex)
  const { setNodeRef, isOver } = useDroppable({ id: dropId })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[72px] space-y-1.5 rounded-lg border-2 border-dashed p-1.5 transition ${
        isOver ? "border-primary bg-primary/10" : "border-border/50 bg-background/80"
      }`}
    >
      <p className="text-center text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Col {columnIndex + 1}</p>
      {blocks.length === 0 ? (
        <p className="py-4 text-center text-[9px] text-muted-foreground">Soltar aquí</p>
      ) : (
        blocks.map((block) => (
          <SortableCanvasBlock
            key={block.id}
            block={block}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
            onContainerColumnsChange={onContainerColumnsChange}
            compact
            renderContainer={(nested) => (
              <ContainerNode
                block={nested}
                selectedId={selectedId}
                onSelect={onSelect}
                onRemove={onRemove}
                onContainerColumnsChange={onContainerColumnsChange}
                depth={1}
              />
            )}
          />
        ))
      )}
    </div>
  )
}

function ContainerNode({
  block,
  selectedId,
  onSelect,
  onRemove,
  onContainerColumnsChange,
  depth,
}: {
  block: PdfBlock
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onContainerColumnsChange: (containerId: string, columns: ContainerColumns) => void
  depth: number
}) {
  const normalized = ensureContainerSlots(block)
  const cols = (normalized.props?.columns || 2) as ContainerColumns
  const selected = selectedId === normalized.id
  const boxStyle = containerBoxStyle(normalized.props)
  const noVisualStyle = !normalized.props?.backgroundEnabled && !normalized.props?.borderEnabled

  return (
    <div
      className={cn(
        "space-y-2 p-2.5 transition-shadow",
        depth > 0 ? "ml-0.5" : "",
        noVisualStyle && "border border-dashed border-border/35",
        selected && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
      )}
      style={{
        ...boxStyle,
        padding: normalized.props?.padding ?? 10,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(normalized.id)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {normalized.props?.showTitle && normalized.props.title ? (
            <p className="truncate text-xs font-semibold">{normalized.props.title}</p>
          ) : (
            <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">Contenedor</p>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Select
            value={String(cols)}
            onValueChange={(v) => onContainerColumnsChange(normalized.id, Number(v) as ContainerColumns)}
          >
            <SelectTrigger className="h-7 w-[108px] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 columna</SelectItem>
              <SelectItem value="2">2 columnas</SelectItem>
              <SelectItem value="3">3 columnas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRemove(normalized.id)
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>

      <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : cols === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {normalized.columnSlots!.map((slot, colIdx) => (
          <ColumnDropStack
            key={slot.id}
            containerId={normalized.id}
            columnIndex={colIdx}
            blocks={slot.blocks}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
            onContainerColumnsChange={onContainerColumnsChange}
          />
        ))}
      </div>
    </div>
  )
}

function SortableRootBlock({
  block,
  selectedId,
  onSelect,
  onRemove,
  onContainerColumnsChange,
}: {
  block: PdfBlock
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onContainerColumnsChange: (containerId: string, columns: ContainerColumns) => void
}) {
  if (isContainerBlock(block.type)) {
    return (
      <SortableCanvasBlock
        block={block}
        selectedId={selectedId}
        onSelect={onSelect}
        onRemove={onRemove}
        onContainerColumnsChange={onContainerColumnsChange}
        renderContainer={(nested) => (
          <ContainerNode
            block={nested}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
            onContainerColumnsChange={onContainerColumnsChange}
            depth={0}
          />
        )}
      />
    )
  }

  return (
    <SortableCanvasBlock
      block={block}
      selectedId={selectedId}
      onSelect={onSelect}
      onRemove={onRemove}
      onContainerColumnsChange={onContainerColumnsChange}
    />
  )
}

export function PdfBuilderCanvas({
  blocks,
  selectedId,
  onSelect,
  onRemove,
  onContainerColumnsChange,
}: PdfBuilderCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID })

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Lienzo del diseño</h3>
        <p className="text-[11px] text-muted-foreground">
          Elige columnas en cada contenedor · arrastra componentes · ✕ para quitar
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[400px] space-y-2 rounded-xl border-2 border-dashed p-3 transition ${
          isOver ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
        }`}
      >
        {blocks.length === 0 ? (
          <p className="py-20 text-center text-xs text-muted-foreground">Agrega un contenedor desde Layouts rápidos</p>
        ) : (
          blocks.map((block) => (
            <SortableRootBlock
              key={block.id}
              block={block}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
              onContainerColumnsChange={onContainerColumnsChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
