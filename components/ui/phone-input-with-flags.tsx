/**
 * Componente para entrada de teléfono con selector de banderas de países
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { ChevronDown, Phone } from 'lucide-react'

// Lista de países comunes para Costa Rica
const countries = [
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
]

interface PhoneInputWithFlagsProps {
  value: {
    countryCode: string
    phoneNumber: string
  }
  onChange: (value: { countryCode: string; phoneNumber: string }) => void
  label?: string
  description?: string
  className?: string
}

export function PhoneInputWithFlags({ 
  value, 
  onChange, 
  label = "Teléfono",
  description,
  className 
}: PhoneInputWithFlagsProps) {
  const [selectedCountry, setSelectedCountry] = useState(() => 
    countries.find(c => c.dialCode === value.countryCode) || countries[0]
  )

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.dialCode === countryCode)
    if (country) {
      setSelectedCountry(country)
      onChange({
        countryCode: country.dialCode,
        phoneNumber: value.phoneNumber
      })
    }
  }

  const handlePhoneChange = (phoneNumber: string) => {
    // Solo permitir números
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '')
    onChange({
      countryCode: value.countryCode,
      phoneNumber: cleanNumber
    })
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <div className="flex gap-2">
        {/* Selector de país */}
        <Select value={selectedCountry.dialCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-[160px] h-12 border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-mono">{selectedCountry.dialCode}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.dialCode}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm font-mono">{country.dialCode}</span>
                  <span className="text-xs text-muted-foreground ml-2">{country.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Input de teléfono */}
        <Input
          type="tel"
          placeholder="Ej: 8888-8888"
          value={value.phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="flex-1 h-12"
        />
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
