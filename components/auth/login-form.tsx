"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      router.push("/select-company")
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Mobile header - only visible on small screens */}
      <div className="text-center lg:hidden">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold">InvoSell</h1>
            <p className="text-sm text-muted-foreground">por InnovaSellCR</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Bienvenido de vuelta</h2>
        <p className="text-muted-foreground">Ingresa tus credenciales para acceder</p>
      </div>

      {/* Desktop header - only visible on large screens */}
      <div className="text-center hidden lg:block">
        <h2 className="text-3xl font-bold mb-2">¡Hola de nuevo!</h2>
        <p className="text-lg text-muted-foreground">Ingresa tus credenciales para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@empresa.cr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <a href="#" className="hover:text-primary">
            ¿Olvidó su contraseña?
          </a>
        </div>
      </form>
    </div>
  )
}
