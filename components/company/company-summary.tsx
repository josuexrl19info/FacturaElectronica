"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CompanyWizardData } from "@/lib/company-wizard-types"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Key, 
  Shield, 
  CheckCircle,
  FileText,
  User
} from "lucide-react"

interface CompanySummaryProps {
  data: CompanyWizardData
}

export function CompanySummary({ data }: CompanySummaryProps) {
  const { personalInfo, atvCredentials, certificate } = data

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Resumen de la Empresa</h3>
        <p className="text-muted-foreground">
          Revise la información antes de crear la empresa
        </p>
      </div>

      {/* Información Personal */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <h4 className="text-lg font-semibold">Información Personal</h4>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {personalInfo.logo && (
              <Avatar className="w-16 h-16">
                <AvatarImage src={URL.createObjectURL(personalInfo.logo)} />
                <AvatarFallback>
                  {personalInfo.commercialName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h5 className="font-semibold text-lg">{personalInfo.commercialName}</h5>
              <p className="text-muted-foreground">{personalInfo.legalName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {personalInfo.taxIdType === 'juridica' ? 'Jurídica' : 'Física'}
                </Badge>
                <Badge variant="secondary">{personalInfo.taxId}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{personalInfo.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{personalInfo.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {personalInfo.province}, {personalInfo.canton}, {personalInfo.district}
              {personalInfo.barrio && `, ${personalInfo.barrio}`}
            </span>
          </div>
        </div>
      </Card>

      {/* Credenciales ATV */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Key className="w-4 h-4 text-blue-500" />
          </div>
          <h4 className="text-lg font-semibold">Credenciales ATV</h4>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono">{atvCredentials.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Client ID:</span>
            <span className="text-sm font-mono">{atvCredentials.clientId}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>URL de Recepción: {atvCredentials.receptionUrl}</p>
            <p>URL de Login: {atvCredentials.loginUrl}</p>
          </div>
        </div>
      </Card>

      {/* Certificado Digital */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          <h4 className="text-lg font-semibold">Certificado Digital</h4>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>

        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{certificate.p12File?.name || 'Certificado cargado'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Certificado validado y verificado para {personalInfo.legalName}
        </p>
      </Card>

      {/* Advertencia de seguridad */}
      <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h5 className="font-medium text-amber-800 dark:text-amber-200">
              Información de Seguridad
            </h5>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Todos los datos sensibles (contraseñas y certificados) serán encriptados 
              de forma segura antes de ser almacenados en la base de datos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
