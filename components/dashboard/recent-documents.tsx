import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

function normalizeStatus(status?: string) {
  const value = (status || "").toLowerCase()
  if (value.includes("acept")) return "Aceptado"
  if (value.includes("rechaz")) return "Rechazado"
  return "Pendiente"
}

export type RecentDocumentFilter = "all" | "facturas" | "tiquetes" | "notas-credito"

export interface RecentDocumentItem {
  id: string
  type: string
  client: string
  amount: string
  status: string
  date: string
  kind?: RecentDocumentFilter
}

interface RecentDocumentsProps {
  documents: RecentDocumentItem[]
  loading?: boolean
  onViewAll?: () => void
}

export function RecentDocuments({ documents, loading = false, onViewAll }: RecentDocumentsProps) {
  const [filter, setFilter] = useState<RecentDocumentFilter>("all")

  const visibleDocuments = useMemo(() => {
    if (filter === "all") {
      return documents.slice(0, 10)
    }
    return documents.filter((doc) => doc.kind === filter).slice(0, 10)
  }, [documents, filter])

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Documentos Recientes</h2>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={filter === "facturas" ? "default" : "outline"}
          onClick={() => setFilter("facturas")}
        >
          Facturas
        </Button>
        <Button
          size="sm"
          variant={filter === "tiquetes" ? "default" : "outline"}
          onClick={() => setFilter("tiquetes")}
        >
          Tiquetes
        </Button>
        <Button
          size="sm"
          variant={filter === "notas-credito" ? "default" : "outline"}
          onClick={() => setFilter("notas-credito")}
        >
          Notas de crédito
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando documentos...</p>
      ) : visibleDocuments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay documentos recientes.</p>
      ) : (
        <div className="space-y-4">
          {visibleDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{doc.id}</p>
                  <Badge
                    variant={normalizeStatus(doc.status) === "Aceptado" ? "default" : "secondary"}
                    className={normalizeStatus(doc.status) === "Aceptado" ? "bg-green-500" : ""}
                  >
                    {normalizeStatus(doc.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{doc.client}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-bold">{doc.amount}</p>
                <p className="text-xs text-muted-foreground">{doc.date}</p>
              </div>

              <Button variant="ghost" size="icon" className="flex-shrink-0" aria-label="Ver documento">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
