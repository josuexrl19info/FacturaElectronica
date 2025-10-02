"use client"

import { GeoDemo } from "@/components/demo/geo-demo"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Database, Zap, Globe } from "lucide-react"

export default function GeoDemoPage() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Sistema Geográfico de Costa Rica
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dropdowns dependientes con datos oficiales de la división territorial administrativa de Costa Rica
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Database className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold mb-2">Datos Oficiales</h3>
            <p className="text-sm text-muted-foreground">
              Basado en la división territorial administrativa 2022 del Registro Nacional
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold mb-2">Carga Dinámica</h3>
            <p className="text-sm text-muted-foreground">
              Los cantones y distritos se cargan automáticamente según la selección
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold mb-2">API Reutilizable</h3>
            <p className="text-sm text-muted-foreground">
              Servicio disponible para cualquier componente que necesite datos geográficos
            </p>
          </Card>
        </div>

        {/* Stats */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Estadísticas de Costa Rica</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="outline" className="mb-2">7</Badge>
              <p className="text-sm font-medium">Provincias</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">82</Badge>
              <p className="text-sm font-medium">Cantones</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">489</Badge>
              <p className="text-sm font-medium">Distritos</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">51,100</Badge>
              <p className="text-sm font-medium">km²</p>
            </div>
          </div>
        </Card>

        {/* Demo */}
        <GeoDemo />

        {/* Technical Info */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Información Técnica</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Archivos de Datos</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>/data/costa-rica/provincias.json</code></li>
                <li>• <code>/data/costa-rica/cantones.json</code></li>
                <li>• <code>/data/costa-rica/distritos.json</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">API Endpoints</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>GET /api/costa-rica/geo?type=provincias</code></li>
                <li>• <code>GET /api/costa-rica/geo?type=cantones&parent=1</code></li>
                <li>• <code>GET /api/costa-rica/geo?type=distritos&parent=101</code></li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
