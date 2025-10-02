"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"
import { authService } from "./firebase-auth"
import { User } from "./firebase-config"

// Auth Context
interface AuthContextType {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const userData = await authService.signIn(email, password)
      setUser(userData)
    } catch (error) {
      setLoading(false)
      throw error
    }
    setLoading(false)
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      setLoading(false)
      throw error
    }
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Companies Context - This will be updated to use real Firestore data
interface CompaniesContextType {
  companies: any[]
  loading: boolean
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined)

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with real Firestore query for tenants
    // For now, we'll use mock data
    const mockCompanies = [
      {
        id: "1",
        name: "Tech Solutions CR",
        logo: "/tech-company-logo.jpg",
        primaryColor: "#10b981",
        legalName: "Tech Solutions Costa Rica S.A.",
        taxId: "3-101-123456",
        commercialActivity: "Desarrollo de Software",
        province: "San José",
        canton: "San José",
        district: "Carmen",
        address: "Av. Central, San José",
        phone: "+506 2222-3333",
        email: "info@techsolutions.cr",
        ownerId: "1",
        collaborators: ["1", "2"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      },
    ]

    const timer = setTimeout(() => {
      setCompanies(mockCompanies)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <CompaniesContext.Provider value={{ companies, loading }}>
      {children}
    </CompaniesContext.Provider>
  )
}

export function useCompanies(userId?: string) {
  const context = useContext(CompaniesContext)
  if (context === undefined) {
    throw new Error("useCompanies must be used within a CompaniesProvider")
  }
  return context
}