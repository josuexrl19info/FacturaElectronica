"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Building2, Save, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useToastNotification } from "@/components/providers/toast-provider"

export default function CreateTenantPage() {
  const router = useRouter()
  const toast = useToastNotification()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    plan: 'basic' as 'basic' | 'premium' | 'enterprise',
    status: 'active' as 'active' | 'inactive' | 'suspended' | 'trial',
    maxCompanies: '',
    maxUsers: '',
    maxDocumentsPerMonth: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validaciones
      if (!formData.name || !formData.ownerName || !formData.ownerEmail) {
        toast.error('Campos requeridos', 'Por favor completa todos los campos obligatorios')
        setLoading(false)
        return
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.ownerEmail)) {
        toast.error('Email inválido', 'Por favor ingresa un email válido')
        setLoading(false)
        return
      }

      // Preparar datos
      const payload = {
        name: formData.name,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone || undefined,
        plan: formData.plan,
        status: formData.status,
        maxCompanies: formData.maxCompanies ? parseInt(formData.maxCompanies) : undefined,
        maxUsers: formData.maxUsers ? parseInt(formData.maxUsers) : undefined,
        maxDocumentsPerMonth: formData.maxDocumentsPerMonth ? parseInt(formData.maxDocumentsPerMonth) : undefined,
        notes: formData.notes || undefined
      }

      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear tenant')
      }

      toast.success('Tenant creado', `El tenant "${formData.name}" se ha creado exitosamente`)
      router.push(`/admin/tenants/${data.tenantId}`)
    } catch (error) {
      console.error('Error al crear tenant:', error)
      toast.error('Error', error instanceof Error ? error.message : 'Error desconocido al crear tenant')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Crear Nuevo Tenant" 
        description="Registra una nueva licencia en el sistema"
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/admin/tenants">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a la lista
          </Button>
        </Link>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Tenant *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Empresa ABC S.A."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={formData.plan} onValueChange={(value: any) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="suspended">Suspendido</SelectItem>
                      <SelectItem value="trial">Prueba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Información del Propietario */}
            <div>
              <h3 className="text-lg font-bold mb-4">Información del Propietario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerName">Nombre del Propietario *</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Email del Propietario *</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPhone">Teléfono (Opcional)</Label>
                  <Input
                    id="ownerPhone"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="+506 2222-3333"
                  />
                </div>
              </div>
            </div>

            {/* Límites */}
            <div>
              <h3 className="text-lg font-bold mb-4">Límites (Opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxCompanies">Máx. Empresas</Label>
                  <Input
                    id="maxCompanies"
                    type="number"
                    value={formData.maxCompanies}
                    onChange={(e) => setFormData({ ...formData, maxCompanies: e.target.value })}
                    placeholder="Sin límite"
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsers">Máx. Usuarios</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                    placeholder="Sin límite"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDocumentsPerMonth">Máx. Documentos/Mes</Label>
                  <Input
                    id="maxDocumentsPerMonth"
                    type="number"
                    value={formData.maxDocumentsPerMonth}
                    onChange={(e) => setFormData({ ...formData, maxDocumentsPerMonth: e.target.value })}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre este tenant..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/admin/tenants">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Crear Tenant
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}
