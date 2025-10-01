"use client"

import { useAuth, useCompanies } from "@/lib/firebase-client"
import { CompanyCard } from "@/components/company/company-card"
import { AddCompanyCard } from "@/components/company/add-company-card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export default function SelectCompanyPage() {
  const { user, signOut } = useAuth()
  const { companies, loading } = useCompanies(user?.id)
  const router = useRouter()

  const handleCompanySelect = (companyId: string) => {
    // Store selected company in session/context
    localStorage.setItem("selectedCompanyId", companyId)
    router.push("/dashboard")
  }

  const handleAddCompany = () => {
    router.push("/onboarding/company")
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
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
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">¿Con cuál empresa desea trabajar?</h1>
            <p className="text-lg text-muted-foreground">Bienvenido, {user?.name || user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      {/* Company grid */}
      <div className="max-w-7xl mx-auto">
        {companies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">No tiene empresas registradas</h2>
            <p className="text-muted-foreground mb-8">Comience creando su primera empresa para empezar a facturar</p>
            <Button size="lg" onClick={handleAddCompany} className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear primera empresa
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} onClick={() => handleCompanySelect(company.id)} />
            ))}
            <AddCompanyCard onClick={handleAddCompany} />
          </div>
        )}
      </div>
    </div>
  )
}
