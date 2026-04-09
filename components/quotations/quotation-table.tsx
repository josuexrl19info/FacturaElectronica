"use client"

import { useMemo, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PRODUCT_CATALOG } from "@/components/quotations/mock-data"
import { QuotationLine } from "@/components/quotations/types"
import { Product } from "@/lib/product-types"
import { useProducts } from "@/hooks/use-products"
import { Plus, Search, Trash2 } from "lucide-react"

type QuotationTableProps = {
  lines: QuotationLine[]
  onUpdateLine: (id: string, field: keyof QuotationLine, value: string | number) => void
  onDeleteLine: (id: string) => void
  onAddLine: () => void
  onAddProductLine: (params: { product: string; price: number; taxRate: number; productId?: string }) => void
}

function moveFocusToNextCell(currentId: string) {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-qt-cell]"))
  const currentIndex = all.findIndex((element) => element.dataset.qtCell === currentId)
  if (currentIndex === -1) return
  const next = all[currentIndex + 1]
  if (next) next.focus()
}

function calculateLineTotal(quantity: number, price: number, taxRate: number, lineDiscountPercent: number): number {
  const grossSubtotal = quantity * price
  const lineDiscount = grossSubtotal * (lineDiscountPercent / 100)
  const netSubtotal = grossSubtotal - lineDiscount
  return netSubtotal + netSubtotal * (taxRate / 100)
}

export function QuotationTable({ lines, onUpdateLine, onDeleteLine, onAddLine, onAddProductLine }: QuotationTableProps) {
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const { products, loading: loadingProducts } = useProducts()
  const productOptions = useMemo(() => PRODUCT_CATALOG.map((item) => item.name), [])
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => String(product.detalle || "").toLowerCase().includes(term))
  }, [productSearch, products])

  const columns = useMemo<ColumnDef<QuotationLine>[]>(
    () => [
      {
        accessorKey: "product",
        header: "Producto",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Textarea
              value={row.original.product}
              rows={1}
              className="w-[260px] min-h-[40px] resize-none overflow-hidden py-2"
              data-qt-cell={`${row.original.id}-product`}
              placeholder="Escribe el producto o servicio"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  moveFocusToNextCell(`${row.original.id}-product`)
                }
              }}
              onChange={(event) => {
                const value = event.target.value
                event.currentTarget.style.height = "auto"
                event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`
                onUpdateLine(row.original.id, "product", value)

                const suggested = PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === value.toLowerCase())
                if (!suggested) return
                onUpdateLine(row.original.id, "productId", suggested.id)
                onUpdateLine(row.original.id, "price", suggested.defaultPrice)
                onUpdateLine(row.original.id, "taxRate", suggested.taxRate)
                onUpdateLine(
                  row.original.id,
                  "total",
                  calculateLineTotal(
                    row.original.quantity,
                    suggested.defaultPrice,
                    suggested.taxRate,
                    row.original.lineDiscountPercent,
                  ),
                )
              }}
            />
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Cantidad",
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            value={row.original.quantity === 0 ? "" : row.original.quantity}
            className="w-[84px]"
            placeholder="Cant."
            data-qt-cell={`${row.original.id}-quantity`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                moveFocusToNextCell(`${row.original.id}-quantity`)
              }
            }}
            onChange={(event) => {
              const quantity = Number(event.target.value || 0)
              onUpdateLine(row.original.id, "quantity", quantity)
              onUpdateLine(
                row.original.id,
                "total",
                calculateLineTotal(quantity, row.original.price, row.original.taxRate, row.original.lineDiscountPercent),
              )
            }}
          />
        ),
      },
      {
        accessorKey: "price",
        header: "Precio",
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            value={row.original.price === 0 ? "" : row.original.price}
            placeholder="Precio"
            data-qt-cell={`${row.original.id}-price`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                moveFocusToNextCell(`${row.original.id}-price`)
              }
            }}
            onChange={(event) => {
              const price = Number(event.target.value || 0)
              onUpdateLine(row.original.id, "price", price)
              onUpdateLine(
                row.original.id,
                "total",
                calculateLineTotal(row.original.quantity, price, row.original.taxRate, row.original.lineDiscountPercent),
              )
            }}
          />
        ),
      },
      {
        accessorKey: "lineDiscountPercent",
        header: "Descuento %",
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            max={100}
            value={row.original.lineDiscountPercent === 0 ? "" : row.original.lineDiscountPercent}
            placeholder="0"
            data-qt-cell={`${row.original.id}-line-discount`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                moveFocusToNextCell(`${row.original.id}-line-discount`)
              }
            }}
            onChange={(event) => {
              const lineDiscountPercent = Number(event.target.value || 0)
              onUpdateLine(row.original.id, "lineDiscountPercent", lineDiscountPercent)
              onUpdateLine(
                row.original.id,
                "total",
                calculateLineTotal(row.original.quantity, row.original.price, row.original.taxRate, lineDiscountPercent),
              )
            }}
          />
        ),
      },
      {
        accessorKey: "taxRate",
        header: "Impuesto",
        cell: ({ row }) => (
          <Select
            value={String(row.original.taxRate)}
            onValueChange={(value) => {
              const taxRate = Number(value)
              onUpdateLine(row.original.id, "taxRate", taxRate)
              onUpdateLine(
                row.original.id,
                "total",
                calculateLineTotal(row.original.quantity, row.original.price, taxRate, row.original.lineDiscountPercent),
              )
            }}
          >
            <SelectTrigger data-qt-cell={`${row.original.id}-tax`} className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="1">1%</SelectItem>
              <SelectItem value="2">2%</SelectItem>
              <SelectItem value="4">4%</SelectItem>
              <SelectItem value="13">13%</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <p className="text-right font-medium">
            {row.original.total.toLocaleString("es-CR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => onDeleteLine(row.original.id)} aria-label="Eliminar linea">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        ),
      },
    ],
    [onDeleteLine, onUpdateLine, productOptions],
  )

  const table = useReactTable({
    data: lines,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="p-4 border-primary/20 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-base">Detalle de cotizacion</h3>
          <p className="text-xs text-muted-foreground mt-1">Edicion inline con foco en teclado y descuento por linea.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setProductModalOpen(true)}>
            <Search className="h-4 w-4" />
            Buscar producto
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onAddLine}>
            <Plus className="h-4 w-4" />
            Agregar linea
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm min-w-[940px]">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-2 py-2 text-left font-medium text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-3xl border-primary/20">
          <DialogHeader>
            <DialogTitle>Productos disponibles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Buscar por detalle del producto..."
            />
            <div className="max-h-[420px] overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70">
                  <tr>
                    <th className="text-left px-3 py-2">Detalle</th>
                    <th className="text-left px-3 py-2">IVA</th>
                    <th className="text-right px-3 py-2">Precio</th>
                    <th className="text-right px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        Cargando productos...
                      </td>
                    </tr>
                  )}
                  {!loadingProducts &&
                    filteredProducts.map((product: Product) => (
                      <tr key={product.id} className="border-t">
                        <td className="px-3 py-2">{product.detalle}</td>
                        <td className="px-3 py-2">{product.tarifaImpuesto}%</td>
                        <td className="px-3 py-2 text-right">
                          {Number(product.precioUnitario || 0).toLocaleString("es-CR")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onAddProductLine({
                                product: String(product.detalle || ""),
                                price: Number(product.precioUnitario || 0),
                                taxRate: Number(product.tarifaImpuesto || 13),
                                productId: product.id,
                              })
                              setProductModalOpen(false)
                            }}
                          >
                            Agregar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {!loadingProducts && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        No hay productos para este criterio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

