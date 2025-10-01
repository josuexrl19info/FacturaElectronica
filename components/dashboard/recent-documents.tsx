import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

const mockDocuments = [
  {
    id: "FE-001-2025",
    type: "Factura Electrónica",
    client: "Corporación XYZ S.A.",
    amount: "₡125,000.00",
    status: "Aceptado",
    date: "2025-01-10",
  },
  {
    id: "TE-045-2025",
    type: "Tiquete Electrónico",
    client: "Cliente General",
    amount: "₡45,500.00",
    status: "Aceptado",
    date: "2025-01-10",
  },
  {
    id: "FE-002-2025",
    type: "Factura Electrónica",
    client: "Distribuidora ABC",
    amount: "₡890,000.00",
    status: "Pendiente",
    date: "2025-01-09",
  },
  {
    id: "NC-001-2025",
    type: "Nota de Crédito",
    client: "Corporación XYZ S.A.",
    amount: "₡25,000.00",
    status: "Aceptado",
    date: "2025-01-09",
  },
]

export function RecentDocuments() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Documentos Recientes</h2>
        <Button variant="ghost" size="sm">
          Ver todos
        </Button>
      </div>

      <div className="space-y-4">
        {mockDocuments.map((doc) => (
          <div key={doc.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{doc.id}</p>
                <Badge
                  variant={doc.status === "Aceptado" ? "default" : "secondary"}
                  className={doc.status === "Aceptado" ? "bg-green-500" : ""}
                >
                  {doc.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{doc.client}</p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-bold">{doc.amount}</p>
              <p className="text-xs text-muted-foreground">{doc.date}</p>
            </div>

            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
