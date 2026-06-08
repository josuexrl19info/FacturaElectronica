"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Palette } from "lucide-react"
import { THEME_PRESETS } from "@/lib/theme/company-theme.presets"
import type { CompanyTheme, ThemeRadius } from "@/lib/theme/company-theme.types"
import { isValidHexColor } from "@/lib/theme/company-theme.utils"

type SystemPersonalizationTabProps = {
  draftTheme: CompanyTheme
  onChange: (theme: CompanyTheme) => void
}

export function SystemPersonalizationTab({ draftTheme, onChange }: SystemPersonalizationTabProps) {
  function applyPreset(presetId: string) {
    const preset = THEME_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    onChange({ ...preset.theme })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="space-y-4 border-primary/15 p-5">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Plantillas rápidas</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const active = draftTheme.presetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-xl border p-3 text-left transition-all hover:border-primary/40 ${
                    active ? "border-primary bg-primary/10 shadow-sm" : "border-border/70"
                  }`}
                >
                  <div className="mb-2 flex gap-2">
                    <span className="h-8 w-8 rounded-lg border" style={{ backgroundColor: preset.theme.primaryColor }} />
                    <span className="h-8 w-8 rounded-lg border" style={{ backgroundColor: preset.theme.accentColor }} />
                  </div>
                  <p className="font-medium">{preset.label}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="space-y-5 border-primary/15 p-5">
          <h3 className="text-lg font-semibold">Colores del sistema</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorField
              id="primaryColor"
              label="Color principal"
              value={draftTheme.primaryColor}
              onChange={(value) => onChange({ ...draftTheme, presetId: null, primaryColor: value })}
            />
            <ColorField
              id="accentColor"
              label="Color de acento"
              value={draftTheme.accentColor}
              onChange={(value) => onChange({ ...draftTheme, presetId: null, accentColor: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Redondeado de interfaz</Label>
            <Select
              value={draftTheme.radius}
              onValueChange={(value) =>
                onChange({
                  ...draftTheme,
                  presetId: null,
                  radius: value as ThemeRadius,
                })
              }
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Suave</SelectItem>
                <SelectItem value="md">Estándar</SelectItem>
                <SelectItem value="lg">Redondeado</SelectItem>
                <SelectItem value="xl">Muy redondeado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      <Card className="h-fit space-y-4 border-primary/15 p-5">
        <h3 className="text-lg font-semibold">Vista previa</h3>
        <div className="space-y-3 rounded-xl border border-primary/15 bg-background/80 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Panel demo</span>
            <Badge>Activo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Botones, badges y acentos del sistema.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Acción principal</Button>
            <Button size="sm" variant="outline">
              Secundario
            </Button>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">
            Tarjeta con acento del tema actual.
          </div>
        </div>
      </Card>
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const pickerValue = isValidHexColor(value) ? value : "#000000"

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-11 w-14 cursor-pointer rounded-md border bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
          placeholder="#2dd4bf"
          className="h-11 flex-1 rounded-md border bg-background px-3 text-sm"
        />
      </div>
      {!isValidHexColor(value) ? (
        <p className="text-xs text-amber-600">Use formato hexadecimal válido (#RRGGBB).</p>
      ) : null}
    </div>
  )
}
