"use client"

import { useAuth } from "@/lib/firebase-client"
import { NetflixCompanyCard } from "@/components/company/netflix-company-card"
import { AddCompanyCard } from "@/components/company/add-company-card"
import { CompanyLoadingAnimation } from "@/components/ui/company-loading-animation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, Plus, TrendingUp, Users, Calendar } from "lucide-react"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanySelection } from "@/hooks/use-company-selection"
import { motion } from "framer-motion"

export default function SelectCompanyPage() {
  const { user, signOut } = useAuth()
  const { companies, loading, error } = useCompanies()
  const { isLoading, selectedCompany, selectCompany } = useCompanySelection()
  const router = useRouter()

  const handleCompanySelect = async (company: any) => {
    console.log('🎯 handleCompanySelect called with:', company)
    await selectCompany(company)
  }

  const handleCompanyEdit = (companyId: string) => {
    console.log('Edit company:', companyId)
    router.push(`/onboarding/company?edit=${companyId}`)
  }

  const handleAddCompany = () => {
    router.push("/onboarding/company")
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Mostrar animación de carga si se está seleccionando una empresa
  if (isLoading && selectedCompany) {
    return (
      <CompanyLoadingAnimation
        companyName={selectedCompany.nombreComercial}
        companyLogo={selectedCompany.logo}
        brandColor={selectedCompany.brandColor}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando empresas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">InvoSell</h1>
                <p className="text-sm text-muted-foreground">por InnovaSellCR</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-2">¿Con cuál empresa desea trabajar?</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={user?.name || user?.email} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {(user?.name || user?.email)?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold">Bienvenido, {user?.name || user?.email}</p>
                <p className="text-sm text-muted-foreground">Selecciona una empresa para continuar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle System Info */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">Sistema operativo</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{companies.length} empresas disponibles</span>
          </div>
        </div>
      </div>

      {/* Company grid - Netflix Style */}
      <div className="max-w-7xl mx-auto">
        {error ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-destructive">Error al cargar empresas</h2>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button size="lg" onClick={() => window.location.reload()} variant="outline" className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reintentar
            </Button>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Bienvenido a InvoSell!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Comience creando su primera empresa para empezar a facturar y gestionar su negocio de manera profesional.
            </p>
            <Button size="lg" onClick={handleAddCompany} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Plus className="w-5 h-5" />
              Crear mi primera empresa
            </Button>
          </div>
        ) : (
          <>
            {/* Section Header */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Mis Empresas</h3>
              <p className="text-muted-foreground">
                Selecciona una empresa para comenzar a trabajar o edita la información existente.
              </p>
            </div>

            {/* Netflix-style grid */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {companies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <NetflixCompanyCard 
                    company={company} 
                    onSelect={() => handleCompanySelect(company)}
                    onEdit={() => handleCompanyEdit(company.id)}
                  />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: companies.length * 0.1 }}
              >
                <AddCompanyCard onClick={handleAddCompany} />
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-7xl mx-auto mt-16">
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border border-primary/20">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">💡 Consejos para comenzar</h3>
            <p className="text-muted-foreground">Algunos tips para aprovechar al máximo InvoSell</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Configuración Inicial</h4>
              <p className="text-sm text-muted-foreground">Completa los datos fiscales de tu empresa para facturar correctamente</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Facturación Rápida</h4>
              <p className="text-sm text-muted-foreground">Crea facturas en segundos con nuestros formularios intuitivos</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Reportes Detallados</h4>
              <p className="text-sm text-muted-foreground">Analiza el rendimiento de tu negocio con gráficos en tiempo real</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Multi-Empresa</h4>
              <p className="text-sm text-muted-foreground">Gestiona múltiples empresas desde una sola cuenta</p>
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-12 flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="gap-2 bg-transparent hover:bg-destructive/10 hover:text-destructive border-destructive/20 hover:border-destructive/40"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Necesitas ayuda? Nuestro equipo de <span className="font-semibold text-primary">InnovaSellCR</span> está aquí para apoyarte.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
