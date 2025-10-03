"use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, User } from "lucide-react"

interface TaxIdInputCleanProps {
  value: {
    type: 'fisica' | 'juridica'
    number: string
  }
  onChange: (value: { type: 'fisica' | 'juridica', number: string }) => void
  onFormatTaxId: (value: string, type: 'fisica' | 'juridica') => string
  className?: string
}

export function TaxIdInputClean({ value, onChange, onFormatTaxId, className = "" }: TaxIdInputCleanProps) {
  const handleTypeChange = (type: 'fisica' | 'juridica') => {
    onChange({ ...value, type })
  }

  const handleNumberChange = (number: string) => {
    const formatted = onFormatTaxId(number, value.type)
    onChange({ ...value, number: formatted })
  }

  const getPlaceholder = () => {
    return value.type === 'fisica' ? '1-1234-5678' : '3-101-123456'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tipo de Cédula */}
        <div className="space-y-2">
          <Label htmlFor="taxIdType">Tipo de Cédula *</Label>
          <Select value={value.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-12 w-full min-w-[200px]">
              <SelectValue>
                <div className="flex items-center gap-2 justify-center">
                  {value.type === 'juridica' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="font-medium">{value.type === 'juridica' ? 'Jurídica' : 'Física'}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[200px]">
              <SelectItem value="fisica">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Física</span>
                </div>
              </SelectItem>
              <SelectItem value="juridica">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Jurídica</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Seleccione el tipo de identificación tributaria
          </p>
        </div>

        {/* Número de Cédula */}
        <div className="space-y-2">
          <Label htmlFor="taxId">Cédula *</Label>
          <Input
            id="taxId"
            placeholder={getPlaceholder()}
            value={value.number}
            onChange={(e) => handleNumberChange(e.target.value)}
            className="h-12 w-full min-w-[200px] font-mono tracking-wider"
            maxLength={value.type === 'fisica' ? 11 : 12} // Incluye guiones
          />
          <p className="text-sm text-muted-foreground">
            {value.type === 'fisica' 
              ? 'Cédula de identidad (9 dígitos)' 
              : 'Cédula jurídica (10 dígitos)'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
