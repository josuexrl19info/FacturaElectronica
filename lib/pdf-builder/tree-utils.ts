import { defaultPropsForType } from "@/lib/pdf-builder/block-defaults"
import type { ContainerColumns, PdfBlock, PdfBlockType, PdfColumnSlot } from "@/lib/pdf-builder/types"
import { isContainerBlock } from "@/lib/pdf-builder/types"

export const CANVAS_DROP_ID = "pdf-canvas"

function newSlotId(): string {
  return `col_${Math.random().toString(36).slice(2, 9)}`
}

function resolveContainerColumns(block: PdfBlock): ContainerColumns {
  const raw = block.props?.columns
  const parsed = typeof raw === "string" ? parseInt(raw, 10) : Number(raw)
  if (parsed === 1 || parsed === 2 || parsed === 3) return parsed
  if (block.type === "columns-3") return 3
  if (block.type === "columns-2") return 2
  return 2
}

function dedupeBlocksById(blocks: PdfBlock[]): PdfBlock[] {
  const seen = new Set<string>()
  return blocks.filter((block) => {
    if (seen.has(block.id)) return false
    seen.add(block.id)
    return true
  })
}

const SINGLETON_COLUMN_TYPES = new Set<PdfBlock["type"]>([
  "logo",
  "document-badge",
  "company-name",
  "emitter-info",
  "receiver-info",
  "document-meta",
  "line-items",
  "totals",
  "notes",
  "legal-text",
  "divider",
])

function dedupeSingletonTypesInColumn(blocks: PdfBlock[]): PdfBlock[] {
  const seenTypes = new Set<string>()
  return blocks.filter((block) => {
    if (!SINGLETON_COLUMN_TYPES.has(block.type)) return true
    if (seenTypes.has(block.type)) return false
    seenTypes.add(block.type)
    return true
  })
}

function sanitizeSlotBlocks(blocks: PdfBlock[]): PdfBlock[] {
  return dedupeSingletonTypesInColumn(dedupeBlocksById(blocks))
}

function slotHasBlocks(slots: PdfColumnSlot[] | undefined): boolean {
  return Boolean(slots?.some((slot) => slot.blocks.length > 0))
}

function migrateLegacyChildrenToSlots(block: PdfBlock, columns: ContainerColumns): PdfColumnSlot[] {
  const slots = createColumnSlots(columns)
  const children = (block.children || []).filter(Boolean) as PdfBlock[]
  if (children.length === 0) return slots

  const isLegacyColumnLayout =
    block.type === "columns-2" ||
    block.type === "columns-3" ||
    (!slotHasBlocks(block.columnSlots) && children.length <= columns)

  if (isLegacyColumnLayout) {
    children.forEach((child, index) => {
      if (!child || Array.isArray(child)) return
      const columnIndex = Math.min(index, columns - 1)
      slots[columnIndex].blocks.push(child)
    })
    return slots
  }

  children.forEach((child, index) => {
    if (!child || Array.isArray(child)) return
    slots[index % columns].blocks.push(child)
  })
  return slots
}

function dedupeMirroredLegacyBlocks(
  slots: PdfColumnSlot[],
  children: PdfBlock[] | undefined,
  columns: ContainerColumns
): PdfColumnSlot[] {
  if (!children?.length) {
    return slots.map((slot) => ({ ...slot, blocks: sanitizeSlotBlocks(slot.blocks) }))
  }

  return slots.map((slot, columnIndex) => {
    let blocks = sanitizeSlotBlocks(slot.blocks)
    const legacyChild = children[columnIndex]
    if (!legacyChild || Array.isArray(legacyChild)) {
      return { ...slot, blocks }
    }

    const sameType = blocks.filter((block) => block.type === legacyChild.type)
    if (sameType.length > 1) {
      let kept = false
      blocks = blocks.filter((block) => {
        if (block.type !== legacyChild.type) return true
        if (!kept) {
          kept = true
          return true
        }
        return false
      })
    }

    return { ...slot, blocks }
  })
}

export function createColumnSlots(count: ContainerColumns): PdfColumnSlot[] {
  return Array.from({ length: count }, () => ({
    id: newSlotId(),
    blocks: [],
  }))
}

export function getColumnDropId(containerId: string, columnIndex: number): string {
  return `col-slot:${containerId}:${columnIndex}`
}

export function parseColumnDropId(id: string): { containerId: string; columnIndex: number } | null {
  if (!id.startsWith("col-slot:")) return null
  const lastColon = id.lastIndexOf(":")
  if (lastColon <= 9) return null
  const containerId = id.slice(9, lastColon)
  const columnIndex = Number(id.slice(lastColon + 1))
  if (Number.isNaN(columnIndex)) return null
  return { containerId, columnIndex }
}

export function ensureContainerSlots(block: PdfBlock): PdfBlock {
  if (!isContainerBlock(block.type)) return block

  const columns = resolveContainerColumns(block)
  const existingSlots = block.columnSlots
  const slotsMatchColumns = existingSlots?.length === columns

  let slots: PdfColumnSlot[]

  if (slotsMatchColumns && slotHasBlocks(existingSlots)) {
    slots = dedupeMirroredLegacyBlocks(existingSlots!, block.children, columns)
  } else if (slotsMatchColumns && !slotHasBlocks(existingSlots) && block.children?.length) {
    slots = migrateLegacyChildrenToSlots(block, columns).map((slot) => ({
      ...slot,
      blocks: sanitizeSlotBlocks(slot.blocks),
    }))
  } else if (slotsMatchColumns) {
    slots = existingSlots!.map((slot) => ({ ...slot, blocks: sanitizeSlotBlocks(slot.blocks) }))
  } else {
    const legacyBlocks = slotHasBlocks(existingSlots)
      ? existingSlots!.flatMap((slot) => slot.blocks)
      : ((block.children || []).filter(Boolean) as PdfBlock[])
    slots = createColumnSlots(columns)
    legacyBlocks.forEach((child, index) => {
      if (!child || Array.isArray(child)) return
      slots[index % columns].blocks.push(child)
    })
    slots = slots.map((slot) => ({ ...slot, blocks: sanitizeSlotBlocks(slot.blocks) }))
  }

  return {
    ...block,
    type: "container",
    props: { ...defaultPropsForType("container"), ...block.props, columns },
    columnSlots: slots,
    children: undefined,
  }
}

function mapEveryBlock(blocks: PdfBlock[], fn: (block: PdfBlock) => PdfBlock): PdfBlock[] {
  const walk = (list: PdfBlock[]): PdfBlock[] =>
    list.map((block) => {
      let current = fn(block)
      if (isContainerBlock(current.type) && current.columnSlots) {
        current = ensureContainerSlots(current)
        current = {
          ...current,
          columnSlots: current.columnSlots!.map((slot) => ({
            ...slot,
            blocks: walk(slot.blocks),
          })),
        }
      }
      return current
    })
  return walk(blocks)
}

export function findBlock(blocks: PdfBlock[], id: string): PdfBlock | null {
  let found: PdfBlock | null = null
  mapEveryBlock(blocks, (block) => {
    if (block.id === id) found = block
    return block
  })
  return found
}

export function updateBlockTree(blocks: PdfBlock[], blockId: string, updater: (b: PdfBlock) => PdfBlock): PdfBlock[] {
  return mapEveryBlock(blocks, (block) =>
    block.id === blockId ? updater(isContainerBlock(block.type) ? ensureContainerSlots(block) : block) : block
  )
}

export function removeBlockById(blocks: PdfBlock[], targetId: string): PdfBlock[] {
  const filtered = blocks.filter((b) => b.id !== targetId)
  return mapEveryBlock(filtered, (block) => {
    if (!isContainerBlock(block.type) || !block.columnSlots) return block
    const normalized = ensureContainerSlots(block)
    return {
      ...normalized,
      columnSlots: normalized.columnSlots!.map((slot) => ({
        ...slot,
        blocks: slot.blocks.filter((b) => b.id !== targetId),
      })),
    }
  })
}

export function appendToColumn(blocks: PdfBlock[], containerId: string, columnIndex: number, newBlock: PdfBlock): PdfBlock[] {
  return mapEveryBlock(blocks, (block) => {
    if (block.id !== containerId || !isContainerBlock(block.type)) return block
    const normalized = ensureContainerSlots(block)
    const slots = normalized.columnSlots!.map((slot, idx) =>
      idx === columnIndex ? { ...slot, blocks: [...slot.blocks, newBlock] } : slot
    )
    return { ...normalized, columnSlots: slots }
  })
}

export function setContainerColumns(blocks: PdfBlock[], containerId: string, columns: ContainerColumns): PdfBlock[] {
  return mapEveryBlock(blocks, (block) => {
    if (block.id !== containerId || !isContainerBlock(block.type)) return block
    const normalized = ensureContainerSlots(block)
    const allBlocks = normalized.columnSlots!.flatMap((s) => s.blocks)
    const newSlots = createColumnSlots(columns)
    allBlocks.forEach((child, i) => {
      newSlots[i % columns].blocks.push(child)
    })
    return {
      ...normalized,
      props: { ...normalized.props, columns },
      columnSlots: newSlots,
    }
  })
}

export function insertBlockAtRoot(blocks: PdfBlock[], newBlock: PdfBlock, afterId?: string): PdfBlock[] {
  if (!afterId) return [...blocks, newBlock]
  const index = blocks.findIndex((b) => b.id === afterId)
  if (index < 0) return [...blocks, newBlock]
  const next = [...blocks]
  next.splice(index + 1, 0, newBlock)
  return next
}

export function moveRootBlocks(blocks: PdfBlock[], activeId: string, overId: string): PdfBlock[] {
  const oldIndex = blocks.findIndex((b) => b.id === activeId)
  const newIndex = blocks.findIndex((b) => b.id === overId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return blocks
  const next = [...blocks]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  return next
}

export type BlockLocation =
  | { kind: "root"; index: number }
  | { kind: "column"; containerId: string; columnIndex: number; index: number }

export function collectAllBlockIds(blocks: PdfBlock[]): string[] {
  const ids: string[] = []
  const walk = (list: PdfBlock[]) => {
    for (const block of list) {
      ids.push(block.id)
      if (isContainerBlock(block.type)) {
        const normalized = ensureContainerSlots(block)
        normalized.columnSlots?.forEach((slot) => walk(slot.blocks))
      }
    }
  }
  walk(blocks)
  return ids
}

export function findBlockLocation(blocks: PdfBlock[], targetId: string): BlockLocation | null {
  const rootIndex = blocks.findIndex((b) => b.id === targetId)
  if (rootIndex >= 0) return { kind: "root", index: rootIndex }

  let found: BlockLocation | null = null
  const walkContainer = (container: PdfBlock) => {
    if (found) return
    const normalized = ensureContainerSlots(container)
    normalized.columnSlots?.forEach((slot, columnIndex) => {
      slot.blocks.forEach((block, index) => {
        if (block.id === targetId) {
          found = { kind: "column", containerId: normalized.id, columnIndex, index }
        }
      })
      slot.blocks.forEach((block) => {
        if (isContainerBlock(block.type)) walkContainer(block)
      })
    })
  }

  blocks.forEach((block) => {
    if (isContainerBlock(block.type)) walkContainer(block)
  })
  return found
}

function mapContainers(
  blocks: PdfBlock[],
  containerId: string,
  mapper: (container: PdfBlock) => PdfBlock
): PdfBlock[] {
  return mapEveryBlock(blocks, (block) => {
    if (block.id === containerId && isContainerBlock(block.type)) {
      return mapper(ensureContainerSlots(block))
    }
    return block
  })
}

export function extractBlockById(
  blocks: PdfBlock[],
  targetId: string
): { blocks: PdfBlock[]; block: PdfBlock | null } {
  const rootIndex = blocks.findIndex((b) => b.id === targetId)
  if (rootIndex >= 0) {
    const next = [...blocks]
    const [block] = next.splice(rootIndex, 1)
    return { blocks: next, block }
  }

  let extracted: PdfBlock | null = null
  const next = mapEveryBlock(blocks, (block) => {
    if (!isContainerBlock(block.type) || !block.columnSlots || extracted) return block
    const normalized = ensureContainerSlots(block)
    let changed = false
    const columnSlots = normalized.columnSlots!.map((slot) => {
      const idx = slot.blocks.findIndex((b) => b.id === targetId)
      if (idx < 0) return slot
      changed = true
      const slotBlocks = [...slot.blocks]
      extracted = slotBlocks.splice(idx, 1)[0]
      return { ...slot, blocks: slotBlocks }
    })
    return changed ? { ...normalized, columnSlots } : block
  })

  return { blocks: next, block: extracted }
}

function insertInColumn(
  blocks: PdfBlock[],
  containerId: string,
  columnIndex: number,
  block: PdfBlock,
  atIndex?: number
): PdfBlock[] {
  return mapContainers(blocks, containerId, (container) => {
    const slots = container.columnSlots!.map((slot, idx) => {
      if (idx !== columnIndex) return slot
      const nextBlocks = [...slot.blocks]
      const insertAt = atIndex == null ? nextBlocks.length : Math.min(Math.max(atIndex, 0), nextBlocks.length)
      nextBlocks.splice(insertAt, 0, block)
      return { ...slot, blocks: nextBlocks }
    })
    return { ...container, columnSlots: slots }
  })
}

function insertAtRoot(blocks: PdfBlock[], block: PdfBlock, atIndex?: number): PdfBlock[] {
  const next = [...blocks]
  const insertAt = atIndex == null ? next.length : Math.min(Math.max(atIndex, 0), next.length)
  next.splice(insertAt, 0, block)
  return next
}

/** Mueve un bloque existente (no duplica). La paleta debe crear bloques nuevos aparte. */
export function moveBlockInTree(blocks: PdfBlock[], activeId: string, overId: string): PdfBlock[] {
  if (activeId === overId) return blocks

  const colDrop = parseColumnDropId(overId)
  if (colDrop?.containerId === activeId) return blocks

  let dest:
    | { kind: "root"; index: number }
    | { kind: "column"; containerId: string; columnIndex: number; index?: number }
    | null = null

  if (colDrop) {
    dest = { kind: "column", containerId: colDrop.containerId, columnIndex: colDrop.columnIndex }
  } else if (overId === CANVAS_DROP_ID) {
    dest = { kind: "root", index: blocks.length }
  } else {
    const overLoc = findBlockLocation(blocks, overId)
    if (!overLoc) return blocks
    dest = overLoc
  }

  const { blocks: withoutActive, block: moved } = extractBlockById(blocks, activeId)
  if (!moved) return blocks

  if (dest.kind === "root") {
    return insertAtRoot(withoutActive, moved, dest.index)
  }

  return insertInColumn(withoutActive, dest.containerId, dest.columnIndex, moved, dest.index)
}

export function normalizeBlockTree(blocks: PdfBlock[]): PdfBlock[] {
  return blocks.map((b) => {
    const block = isContainerBlock(b.type) ? ensureContainerSlots(b) : b
    if (isContainerBlock(block.type) && block.columnSlots) {
      return {
        ...block,
        columnSlots: block.columnSlots.map((slot) => ({
          ...slot,
          blocks: sanitizeSlotBlocks(normalizeBlockTree(slot.blocks)),
        })),
      }
    }
    return block
  })
}

export function isLayoutBlock(type: PdfBlockType): boolean {
  return isContainerBlock(type)
}

export function columnSlotCount(block: PdfBlock): number {
  return (block.props?.columns || 2) as ContainerColumns
}

export const getColumnSlotId = getColumnDropId
export function assignToColumnSlot(blocks: PdfBlock[], parentId: string, index: number, newBlock: PdfBlock) {
  return appendToColumn(blocks, parentId, index, newBlock)
}
export function appendToSection(blocks: PdfBlock[], parentId: string, newBlock: PdfBlock) {
  return appendToColumn(blocks, parentId, 0, newBlock)
}
export function getSectionDropId(id: string) {
  return getColumnDropId(id, 0)
}
export function parseSectionDropId(id: string) {
  const p = parseColumnDropId(id)
  return p?.containerId || null
}
export function parseColumnSlotId(id: string) {
  const p = parseColumnDropId(id)
  return p ? { parentId: p.containerId, index: p.columnIndex } : null
}
