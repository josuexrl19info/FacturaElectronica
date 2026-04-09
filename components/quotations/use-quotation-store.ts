"use client"

import { create } from "zustand"
import { createEmptyLine } from "@/components/quotations/mock-data"
import { QuotationLine, QuotationSettings, QuotationStatus } from "@/components/quotations/types"

type QuotationStore = {
  status: QuotationStatus
  lines: QuotationLine[]
  settings: QuotationSettings
  autosaveAt: string | null
  setStatus: (status: QuotationStatus) => void
  setSettings: (settings: Partial<QuotationSettings>) => void
  addLine: () => void
  addProductLine: (params: { product: string; price: number; taxRate: number; productId?: string }) => void
  updateLine: (id: string, field: keyof QuotationLine, value: string | number) => void
  deleteLine: (id: string) => void
  resetDraft: () => void
}

function getPlusOneMonthIsoDate(): string {
  const now = new Date()
  const target = new Date(now)
  target.setMonth(target.getMonth() + 1)
  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, "0")
  const day = String(target.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function calculateLineTotal(quantity: number, price: number, taxRate: number, lineDiscountPercent: number): number {
  const grossSubtotal = quantity * price
  const lineDiscount = grossSubtotal * (lineDiscountPercent / 100)
  const netSubtotal = grossSubtotal - lineDiscount
  return netSubtotal + netSubtotal * (taxRate / 100)
}

function normalizeLine(line: QuotationLine): QuotationLine {
  const quantity = Number(line.quantity || 0)
  const price = Number(line.price || 0)
  const taxRate = Number(line.taxRate || 0)
  const lineDiscountPercent = Number(line.lineDiscountPercent || 0)
  return {
    ...line,
    quantity,
    price,
    taxRate,
    lineDiscountPercent,
    total: calculateLineTotal(quantity, price, taxRate, lineDiscountPercent),
  }
}

const defaultSettings: QuotationSettings = {
  currency: "CRC",
  dueDate: getPlusOneMonthIsoDate(),
  discountPercent: 0,
}

export const useQuotationStore = create<QuotationStore>((set) => ({
  status: "draft",
  lines: [createEmptyLine()],
  settings: defaultSettings,
  autosaveAt: null,
  setStatus: (status) => set({ status }),
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
      autosaveAt: new Date().toISOString(),
    })),
  addLine: () =>
    set((state) => ({
      lines: [...state.lines, createEmptyLine()],
      autosaveAt: new Date().toISOString(),
    })),
  addProductLine: ({ product, price, taxRate, productId }) =>
    set((state) => {
      const line = normalizeLine({
        ...createEmptyLine(),
        product,
        productId,
        price,
        taxRate,
      })
      return {
        lines: [...state.lines, line],
        autosaveAt: new Date().toISOString(),
      }
    }),
  updateLine: (id, field, value) =>
    set((state) => ({
      lines: state.lines.map((line) => {
        if (line.id !== id) return line

        const nextValue =
          field === "quantity" || field === "price" || field === "lineDiscountPercent" || field === "taxRate" || field === "total"
            ? Number(value || 0)
            : String(value ?? "")
        const updated = { ...line, [field]: nextValue } as QuotationLine
        return normalizeLine(updated)
      }),
      autosaveAt: new Date().toISOString(),
    })),
  deleteLine: (id) =>
    set((state) => {
      const lines = state.lines.filter((line) => line.id !== id)
      return {
        lines: lines.length ? lines : [createEmptyLine()],
        autosaveAt: new Date().toISOString(),
      }
    }),
  resetDraft: () =>
    set({
      status: "draft",
      lines: [createEmptyLine()],
      settings: { ...defaultSettings },
      autosaveAt: new Date().toISOString(),
    }),
}))

