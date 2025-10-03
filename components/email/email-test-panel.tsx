"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToastNotification } from '@/components/providers/toast-provider'
import { 
  Mail, 
  Send, 
  Paperclip, 
  Image, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Info,
  Loader2,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'

interface EmailAttachment {
  name: string
  size: number
  type: string
  file: File
}

export function EmailTestPanel() {
  const toast = useToastNotification()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Formulario principal
  const [form, setForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: 'Prueba de correo desde InvoSell',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 InvoSell - Sistema de Facturación</h1>
        </div>
        <div class="content">
            <h2>¡Hola {'{{nombre}}'}!</h2>
            <p>Este es un correo de prueba desde el sistema InvoSell.</p>
            <p>El sistema de correos está funcionando correctamente y puede enviar:</p>
            <ul>
                <li>✅ Correos HTML con estilos</li>
                <li>✅ Imágenes inline</li>
                <li>✅ Archivos adjuntos</li>
                <li>✅ Múltiples destinatarios</li>
                <li>✅ Variables dinámicas</li>
            </ul>
            <a href="#" class="button">Ver más información</a>
            <p>Saludos,<br>Equipo de InvoSell</p>
        </div>
        <div class="footer">
            <p>Este correo fue enviado desde InvoSell - Sistema de Facturación Electrónica</p>
        </div>
    </div>
</body>
</html>`,
    importance: 'Normal' as 'Low' | 'Normal' | 'High',
    isReadReceiptRequested: false,
    isDeliveryReceiptRequested: false
  })

  // Adjuntos
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])

  // Variables para template
  const [variables, setVariables] = useState({
    nombre: 'Usuario de Prueba',
    empresa: 'Mi Empresa',
    fecha: new Date().toLocaleDateString('es-ES')
  })

  // Resultados de envío
  const [lastResult, setLastResult] = useState<any>(null)

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const attachment: EmailAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      }
      setAttachments(prev => [...prev, attachment])
    })
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processHTMLContent = (html: string): string => {
    let processedHTML = html
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      processedHTML = processedHTML.replace(new RegExp(placeholder, 'g'), value)
    })
    return processedHTML
  }

  const sendTestEmail = async () => {
    setLoading(true)
    
    try {
      // Preparar adjuntos
      const emailAttachments = await Promise.all(
        attachments.map(async (attachment) => ({
          name: attachment.name,
          contentType: attachment.type,
          contentBytes: await convertFileToBase64(attachment.file),
          size: attachment.size
        }))
      )

      // Procesar contenido HTML con variables
      const processedHTML = processHTMLContent(form.htmlContent)

      // Preparar destinatarios
      const toRecipients = form.to.split(',').map(email => email.trim()).filter(Boolean)
      const ccRecipients = form.cc ? form.cc.split(',').map(email => email.trim()).filter(Boolean) : []
      const bccRecipients = form.bcc ? form.bcc.split(',').map(email => email.trim()).filter(Boolean) : []

      const payload = {
        to: toRecipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        subject: form.subject,
        htmlContent: processedHTML,
        attachments: emailAttachments,
        importance: form.importance,
        isReadReceiptRequested: form.isReadReceiptRequested,
        isDeliveryReceiptRequested: form.isDeliveryReceiptRequested
      }

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      setLastResult(result)

      if (result.success) {
        toast.success(
          'Correo enviado exitosamente',
          `Enviado a ${result.deliveredTo?.length || 0} destinatarios`
        )
      } else {
        toast.error(
          'Error enviando correo',
          result.error || 'Error desconocido'
        )
      }

    } catch (error) {
      console.error('Error enviando correo:', error)
      toast.error(
        'Error de conexión',
        'No se pudo conectar con el servicio de correos'
      )
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Panel de Pruebas de Correo
          </CardTitle>
          <CardDescription>
            Prueba el sistema de correos con diferentes configuraciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Destinatarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="to">Para (requerido)</Label>
              <Input
                id="to"
                value={form.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Múltiples correos separados por comas
              </p>
            </div>
            <div>
              <Label htmlFor="cc">CC</Label>
              <Input
                id="cc"
                value={form.cc}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                placeholder="copia@ejemplo.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bcc">BCC</Label>
              <Input
                id="bcc"
                value={form.bcc}
                onChange={(e) => handleInputChange('bcc', e.target.value)}
                placeholder="oculto@ejemplo.com"
                className="mt-1"
              />
            </div>
          </div>

          {/* Asunto y configuración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Asunto</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="importance">Importancia</Label>
              <Select value={form.importance} onValueChange={(value: any) => handleInputChange('importance', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Baja</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Variables para template */}
          <div>
            <Label>Variables del Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <Input
                placeholder="nombre"
                value={variables.nombre}
                onChange={(e) => setVariables(prev => ({ ...prev, nombre: e.target.value }))}
              />
              <Input
                placeholder="empresa"
                value={variables.empresa}
                onChange={(e) => setVariables(prev => ({ ...prev, empresa: e.target.value }))}
              />
              <Input
                placeholder="fecha"
                value={variables.fecha}
                onChange={(e) => setVariables(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Usa {'{{nombre}}'}, {'{{empresa}}'}, {'{{fecha}}'} en el contenido HTML
            </p>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="readReceipt"
                checked={form.isReadReceiptRequested}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, isReadReceiptRequested: checked }))}
              />
              <Label htmlFor="readReceipt">Confirmación de lectura</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="deliveryReceipt"
                checked={form.isDeliveryReceiptRequested}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, isDeliveryReceiptRequested: checked }))}
              />
              <Label htmlFor="deliveryReceipt">Confirmación de entrega</Label>
            </div>
          </div>

          <Separator />

          {/* Adjuntos */}
          <div>
            <Label>Adjuntos</Label>
            <div className="mt-2">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="mb-2"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Agregar Archivos
              </Button>
              
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{attachment.name}</span>
                        <Badge variant="secondary">{formatFileSize(attachment.size)}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contenido HTML */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="htmlContent">Contenido HTML</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPreview ? 'Ocultar' : 'Vista'} Previa
              </Button>
            </div>
            
            {showPreview ? (
              <div 
                className="border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: processHTMLContent(form.htmlContent) }}
              />
            ) : (
              <Textarea
                id="htmlContent"
                value={form.htmlContent}
                onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* Botón de envío */}
          <Button
            onClick={sendTestEmail}
            disabled={loading || !form.to || !form.subject}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Correo de Prueba
              </>
            )}
          </Button>

          {/* Resultado del último envío */}
          {lastResult && (
            <Card className={lastResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-sm ${
                  lastResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {lastResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Resultado del Envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Estado:</strong> {lastResult.success ? 'Exitoso' : 'Error'}</div>
                  {lastResult.messageId && <div><strong>ID:</strong> {lastResult.messageId}</div>}
                  {lastResult.sentAt && <div><strong>Enviado:</strong> {new Date(lastResult.sentAt).toLocaleString()}</div>}
                  {lastResult.deliveredTo && (
                    <div><strong>Entregado a:</strong> {lastResult.deliveredTo.join(', ')}</div>
                  )}
                  {lastResult.error && <div><strong>Error:</strong> {lastResult.error}</div>}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
