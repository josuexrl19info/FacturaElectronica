import { ProductCatalogItem, QuotationLine } from "@/components/quotations/types"

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    id: "srv-001",
    name: "Cobertura fotografica por hora",
    description: "Servicio profesional de fotografia para eventos corporativos",
    defaultPrice: 75000,
    taxRate: 13,
    kind: "service",
  },
  {
    id: "srv-002",
    name: "Cobertura de video por camara/hora",
    description: "Grabacion multicamara con estabilizacion y audio base",
    defaultPrice: 98000,
    taxRate: 13,
    kind: "service",
  },
  {
    id: "srv-003",
    name: "Edicion express",
    description: "Entrega de material editado en 24 horas",
    defaultPrice: 65000,
    taxRate: 13,
    kind: "service",
  },
  {
    id: "prd-001",
    name: "Kit de iluminacion",
    description: "Set de iluminacion para interiores y escenarios medianos",
    defaultPrice: 45000,
    taxRate: 13,
    kind: "product",
  },
  {
    id: "srv-004",
    name: "Coordinacion de evento",
    description: "Planificacion y coordinacion operativa durante la ejecucion",
    defaultPrice: 120000,
    taxRate: 13,
    kind: "service",
  },
]

export const HISTORICAL_PRICING_BY_CLIENT: Record<string, number> = {
  "Cobertura fotografica por hora": 70000,
  "Cobertura de video por camara/hora": 95000,
  "Edicion express": 60000,
}

export function createEmptyLine(): QuotationLine {
  return {
    id: crypto.randomUUID(),
    product: "",
    quantity: 1,
    price: 0,
    lineDiscountPercent: 0,
    taxRate: 13,
    total: 0,
    type: "item",
  }
}

