export type QuotationStatus = "draft" | "sent" | "approved"

export type ProductCatalogItem = {
  id: string
  name: string
  description: string
  defaultPrice: number
  taxRate: number
  kind: "service" | "product"
}

export type QuotationLineType = "item" | "note" | "section" | "discount"

export type QuotationLine = {
  id: string
  productId?: string
  product: string
  quantity: number
  price: number
  lineDiscountPercent: number
  taxRate: number
  total: number
  type: QuotationLineType
}
export type CurrencyCode = "CRC" | "USD" | "EUR"

export type QuotationSettings = {
  currency: CurrencyCode
  dueDate: string
  discountPercent: number
}

export type QuotationContactData = {
  identification: string
  name: string
  phone: string
  email: string
  createAsClient: boolean
  existingClientId: string | null
  activityCode: string
  activityDescription: string
}

