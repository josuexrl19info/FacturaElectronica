import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar } from "lucide-react"

const reportTypes = [
  {
    title: "Reporte de Ventas",
    description: "Resumen de ventas por período",
    icon: FileText,
  },
  {
    title: "Reporte de Clientes",
    description: "Listado y análisis de clientes",
    icon: FileText,
  },
  {
    title: "Reporte de Productos",
    description: "Inventario y movimientos",
    icon: FileText,
  },
  {
    title: "Reporte Tributario",
    description: "Documentos para declaraciones",
    icon: FileText,
  },
]

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Reportes" description="Genere y descargue reportes del sistema" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <Card key={report.title} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                    <Calendar className="w-4 h-4" />
                    Seleccionar Período
                  </Button>
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Generar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
