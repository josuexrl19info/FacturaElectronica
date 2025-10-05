'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Download, Copy, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface HaciendaStatusModalProps {
  isOpen: boolean
  onClose: () => void
  haciendaSubmission: any
  consecutivo: string
}

export function HaciendaStatusModal({ isOpen, onClose, haciendaSubmission, consecutivo }: HaciendaStatusModalProps) {
  const [showXml, setShowXml] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Si no hay haciendaSubmission, mostrar mensaje informativo
  if (!haciendaSubmission) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estado de Hacienda - {consecutivo}</DialogTitle>
            <DialogDescription>
              No hay información de envío a Hacienda disponible
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Esta factura no ha sido enviada a Hacienda o no hay información de estado disponible.
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Decodificar el XML de respuesta
  const decodeResponseXml = () => {
    try {
      if (haciendaSubmission['respuesta-xml']) {
        const decoded = atob(haciendaSubmission['respuesta-xml'])
        return decoded
      }
      return 'No hay respuesta XML disponible'
    } catch (error) {
      console.error('Error decodificando XML:', error)
      return 'Error al decodificar XML'
    }
  }

  // Obtener icono según estado
  const getStatusIcon = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'aceptado':
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rechazado':
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'procesando':
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
  }

  // Obtener color del badge según estado
  const getStatusBadgeColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'aceptado':
      case 'accepted':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'rechazado':
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'procesando':
      case 'processing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    }
  }

  // Copiar al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "Contenido copiado al portapapeles",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive"
      })
    }
  }

  // Descargar XML
  const downloadXml = () => {
    try {
      const xmlContent = decodeResponseXml()
      const blob = new Blob([xmlContent], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `respuesta-hacienda-${consecutivo}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Descargado",
        description: "XML de respuesta descargado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el XML",
        variant: "destructive"
      })
    }
  }

  const estado = haciendaSubmission['ind-estado'] || haciendaSubmission.estado || haciendaSubmission.state
  const xmlDecodificado = decodeResponseXml()


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(estado)}
            Estado de Envío a Hacienda - {consecutivo}
          </DialogTitle>
          <DialogDescription>
            Información detallada del envío a Hacienda
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Estado y información básica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Estado</h4>
              <Badge className={getStatusBadgeColor(estado)}>
                {estado || 'Desconocido'}
              </Badge>
            </div>
            
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm text-gray-600 mb-1">Fecha</h4>
              <p className="text-sm">
                {haciendaSubmission.fecha ? new Date(haciendaSubmission.fecha).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Clave en sección separada */}
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Clave de Hacienda</h4>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-xs font-mono break-all select-all">
                {haciendaSubmission.clave || 'N/A'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Mensaje de error de Hacienda */}
          {haciendaSubmission.DetalleMensaje && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">Mensaje de Error de Hacienda</h4>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">
                  {haciendaSubmission.DetalleMensaje}
                </p>
              </div>
            </div>
          )}

          {/* XML de respuesta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-600">Respuesta XML de Hacienda</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowXml(!showXml)}
                className="flex items-center gap-1"
              >
                {showXml ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showXml ? 'Ocultar' : 'Mostrar'} XML
              </Button>
            </div>

            {showXml && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-80 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {xmlDecodificado}
                </pre>
              </div>
            )}
          </div>

          {/* Datos completos con XML decodificado */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">Datos Completos de Respuesta</h4>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg max-h-60 overflow-auto">
              <pre className="text-xs font-mono leading-relaxed">
                {JSON.stringify({
                  ...haciendaSubmission,
                  'respuesta-xml-decoded': xmlDecodificado
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
