"use client"

import { useState, useEffect } from "react"

// Mock Firebase client for demo purposes
// In production, replace with actual Firebase SDK

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate auth check
    const mockUser = {
      id: "user-1",
      email: "demo@facturacion.cr",
      name: "Usuario Demo",
    }
    setUser(mockUser)
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock sign in
    const mockUser = {
      id: "user-1",
      email,
      name: "Usuario Demo",
    }
    setUser(mockUser)
    return mockUser
  }

  const signOut = async () => {
    setUser(null)
  }

  return { user, loading, signIn, signOut }
}

export function useCompanies(userId: string | null) {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setCompanies([])
      setLoading(false)
      return
    }

    // Mock companies data
    const mockCompanies = [
      {
        id: "company-1",
        name: "TechCorp CR",
        legalName: "TechCorp Costa Rica S.A.",
        logo: "/tech-company-logo.jpg",
        primaryColor: "#10b981",
        taxId: "3-101-123456",
        ownerId: userId,
      },
      {
        id: "company-2",
        name: "Café Montaña",
        legalName: "Café de Montaña Sociedad Anónima",
        logo: "/coffee-company-logo.jpg",
        primaryColor: "#f59e0b",
        taxId: "3-101-789012",
        ownerId: userId,
      },
    ]

    setCompanies(mockCompanies)
    setLoading(false)
  }, [userId])

  return { companies, loading }
}
