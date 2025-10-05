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
  const [providerTestResults, setProviderTestResults] = useState<any>(null)
  const [testingProviders, setTestingProviders] = useState(false)
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)
  const [runningDiagnostic, setRunningDiagnostic] = useState(false)
  
  // Estados para prueba de facturas aprobadas
  const [invoiceEmailResults, setInvoiceEmailResults] = useState<any>(null)
  const [testingInvoiceEmail, setTestingInvoiceEmail] = useState(false)

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

  const testEmailProviders = async () => {
    setTestingProviders(true)
    
    try {
      const response = await fetch('/api/email/test-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmails: {
            gmail: ['test@gmail.com'], // Reemplaza con tu email de Gmail
            icloud: ['test@icloud.com'], // Reemplaza con tu email de iCloud
            outlook: ['test@outlook.com'], // Reemplaza con tu email de Outlook
            yahoo: ['test@yahoo.com'] // Reemplaza con tu email de Yahoo
          }
        })
      })

      const result = await response.json()
      setProviderTestResults(result)

      if (result.success) {
        toast.success(
          'Pruebas de proveedores completadas',
          `Exitosos: ${result.summary.successful}, Fallidos: ${result.summary.failed}`
        )
      } else {
        toast.error(
          'Error en pruebas de proveedores',
          result.error || 'Error desconocido'
        )
      }

    } catch (error) {
      console.error('Error probando proveedores:', error)
      toast.error(
        'Error de conexión',
        'No se pudo conectar con el servicio de pruebas'
      )
    } finally {
      setTestingProviders(false)
    }
  }

  const runDiagnostic = async (diagnosticType: string = 'ip_blocking') => {
    setRunningDiagnostic(true)
    
    try {
      const response = await fetch('/api/email/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diagnosticType })
      })

      const result = await response.json()
      setDiagnosticResults(result)

      if (result.success) {
        const status = result.result.status || 'unknown'
        toast.success(
          'Diagnóstico completado',
          `Estado: ${status === 'ok' ? 'Saludable' : status === 'blocked' ? 'Bloqueado' : 'Limitado'}`
        )
      } else {
        toast.error(
          'Error en diagnóstico',
          result.error || 'Error desconocido'
        )
      }

    } catch (error) {
      console.error('Error ejecutando diagnóstico:', error)
      toast.error(
        'Error de conexión',
        'No se pudo conectar con el servicio de diagnóstico'
      )
    } finally {
      setRunningDiagnostic(false)
    }
  }

  const testInvoiceEmail = async () => {
    setTestingInvoiceEmail(true)
    setInvoiceEmailResults(null)
    
    try {
      const response = await fetch('/api/email/test-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testEmail: form.to,
          simulateApproval: true 
        })
      })
      
      const result = await response.json()
      setInvoiceEmailResults(result)
      
      if (result.success) {
        toast.success('Email de factura aprobada enviado exitosamente')
      } else {
        toast.error(`Error enviando email de factura: ${result.error}`)
      }
    } catch (error) {
      console.error('Error en prueba de factura:', error)
      toast.error('Error probando email de factura aprobada')
    } finally {
      setTestingInvoiceEmail(false)
    }
  }

  const testSimpleEmail = async () => {
    setTestingInvoiceEmail(true)
    setInvoiceEmailResults(null)
    
    try {
      const response = await fetch('/api/email/test-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testEmail: form.to,
          simulateApproval: false 
        })
      })
      
      const result = await response.json()
      setInvoiceEmailResults(result)
      
      if (result.success) {
        toast.success('Email simple enviado exitosamente')
      } else {
        toast.error(`Error enviando email simple: ${result.error}`)
      }
    } catch (error) {
      console.error('Error en email simple:', error)
      toast.error('Error probando email simple')
    } finally {
      setTestingInvoiceEmail(false)
    }
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

          {/* Botones de envío */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <Button
              onClick={testEmailProviders}
              disabled={testingProviders}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {testingProviders ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando Proveedores...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Probar Proveedores (Gmail, iCloud)
                </>
              )}
            </Button>

            <Button
              onClick={testInvoiceEmail}
              disabled={testingInvoiceEmail}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {testingInvoiceEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando Factura Aprobada...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Probar Email Factura Aprobada
                </>
              )}
            </Button>

            <Button
              onClick={testSimpleEmail}
              disabled={testingInvoiceEmail}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {testingInvoiceEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando Email Simple...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Probar Email Simple
                </>
              )}
            </Button>
          </div>

          {/* Botones de diagnóstico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => runDiagnostic('ip_blocking')}
              disabled={runningDiagnostic}
              variant="outline"
              className="w-full"
            >
              {runningDiagnostic ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Diagnosticando...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Diagnosticar IP Blocking
                </>
              )}
            </Button>
            
            <Button
              onClick={() => runDiagnostic('gmail_specific')}
              disabled={runningDiagnostic}
              variant="outline"
              className="w-full"
            >
              {runningDiagnostic ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Diagnosticando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Diagnóstico Gmail
                </>
              )}
            </Button>
            
            <Button
              onClick={() => runDiagnostic('full_diagnostic')}
              disabled={runningDiagnostic}
              variant="outline"
              className="w-full"
            >
              {runningDiagnostic ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Diagnosticando...
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 mr-2" />
                  Diagnóstico Completo
                </>
              )}
            </Button>
          </div>

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

      {/* Resultados de pruebas de proveedores */}
      {providerTestResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Resultados de Pruebas de Proveedores
            </CardTitle>
            <CardDescription>
              Análisis de entrega a diferentes proveedores de email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{providerTestResults.summary.total}</div>
                <div className="text-sm text-blue-600">Total Pruebas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{providerTestResults.summary.successful}</div>
                <div className="text-sm text-green-600">Exitosas</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{providerTestResults.summary.failed}</div>
                <div className="text-sm text-red-600">Fallidas</div>
              </div>
            </div>

            {/* Resultados por proveedor */}
            <div className="space-y-3">
              <h4 className="font-semibold">Resultados por Proveedor:</h4>
              {Object.entries(providerTestResults.summary.byProvider).map(([provider, stats]) => (
                <div key={provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{provider}</span>
                    <Badge variant={stats.failed === 0 ? "default" : "destructive"}>
                      {stats.successful}/{stats.successful + stats.failed}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {stats.failed > 0 && (
                      <span className="text-red-600">
                        {stats.errors.length} error(es)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recomendaciones */}
            {providerTestResults.recommendations && providerTestResults.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recomendaciones:</h4>
                <div className="space-y-2">
                  {providerTestResults.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-yellow-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detalles técnicos */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-sm text-gray-600">
                Ver detalles técnicos
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(providerTestResults.results, null, 2)}
                </pre>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Resultados de diagnóstico */}
      {diagnosticResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Resultados de Diagnóstico
            </CardTitle>
            <CardDescription>
              Análisis de problemas de entrega y bloqueo de IP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado del diagnóstico */}
            <div className="flex items-center gap-2">
              <span className="font-semibold">Estado:</span>
              <Badge 
                variant={
                  diagnosticResults.result?.status === 'ok' ? 'default' :
                  diagnosticResults.result?.status === 'blocked' ? 'destructive' :
                  diagnosticResults.result?.status === 'limited' ? 'secondary' : 'outline'
                }
              >
                {diagnosticResults.result?.status === 'ok' ? 'Saludable' :
                 diagnosticResults.result?.status === 'blocked' ? 'Bloqueado' :
                 diagnosticResults.result?.status === 'limited' ? 'Limitado' : 'Desconocido'}
              </Badge>
            </div>

            {/* Recomendaciones */}
            {diagnosticResults.result?.recommendations && (
              <div>
                <h4 className="font-semibold mb-2">Recomendaciones:</h4>
                <div className="space-y-2">
                  {diagnosticResults.result.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximos pasos */}
            {diagnosticResults.result?.nextSteps && (
              <div>
                <h4 className="font-semibold mb-2">Próximos Pasos:</h4>
                <div className="space-y-2">
                  {diagnosticResults.result.nextSteps.map((step: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-green-800">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información específica de Gmail */}
            {diagnosticResults.result?.gmailResult && (
              <div>
                <h4 className="font-semibold mb-2">Resultado Gmail:</h4>
                <div className={`p-3 rounded-lg ${
                  diagnosticResults.result.gmailResult.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="text-sm">
                    <div><strong>Estado:</strong> {diagnosticResults.result.gmailResult.success ? 'Exitoso' : 'Error'}</div>
                    {diagnosticResults.result.gmailResult.error && (
                      <div><strong>Error:</strong> {diagnosticResults.result.gmailResult.error}</div>
                    )}
                    {diagnosticResults.result.gmailResult.providerAnalysis && (
                      <div><strong>Análisis:</strong> {diagnosticResults.result.gmailResult.providerAnalysis.recommendation}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detalles técnicos */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-sm text-gray-600">
                Ver detalles técnicos del diagnóstico
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(diagnosticResults, null, 2)}
                </pre>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Resultados de pruebas de facturas aprobadas */}
      {invoiceEmailResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Resultados de Prueba de Facturas Aprobadas
            </CardTitle>
            <CardDescription>
              Resultado del envío de email para facturas aprobadas por Hacienda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado del envío */}
            <div className={`p-4 rounded-lg ${
              invoiceEmailResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {invoiceEmailResults.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  invoiceEmailResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {invoiceEmailResults.success ? 'Email Enviado Exitosamente' : 'Error Enviando Email'}
                </span>
              </div>
              
              {invoiceEmailResults.success ? (
                <div className="space-y-2 text-sm text-green-700">
                  <div><strong>Message ID:</strong> {invoiceEmailResults.messageId || 'N/A'}</div>
                  <div><strong>Enviado a:</strong> {invoiceEmailResults.deliveredTo?.join(', ') || 'N/A'}</div>
                  <div><strong>Fecha:</strong> {invoiceEmailResults.sentAt ? new Date(invoiceEmailResults.sentAt).toLocaleString('es-ES') : 'N/A'}</div>
                  <div><strong>Mensaje:</strong> {invoiceEmailResults.message || 'Email enviado correctamente'}</div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-red-700">
                  <div><strong>Error:</strong> {invoiceEmailResults.error || 'Error desconocido'}</div>
                  {invoiceEmailResults.details && (
                    <div><strong>Detalles:</strong> {invoiceEmailResults.details}</div>
                  )}
                </div>
              )}
            </div>

            {/* Información del endpoint */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🔧 Información del Endpoint</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div><strong>URL:</strong> http://localhost:8000/email</div>
                <div><strong>Método:</strong> POST</div>
                <div><strong>API Key:</strong> tu-api-key-super-secreta-123</div>
                <div><strong>Content-Type:</strong> application/json</div>
              </div>
            </div>

            {/* Próximos pasos */}
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">📋 Próximos Pasos</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <div>1. ✅ Verificar que el endpoint esté ejecutándose en localhost:8000</div>
                <div>2. 🔧 Configurar el endpoint real en producción</div>
                <div>3. 🧪 Probar con facturas reales aprobadas por Hacienda</div>
                <div>4. 📊 Monitorear logs de envío automático</div>
              </div>
            </div>

            {/* Detalles técnicos */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-sm text-gray-600">
                Ver respuesta completa del endpoint
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(invoiceEmailResults, null, 2)}
                </pre>
              </div>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
