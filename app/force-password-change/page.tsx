"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/firebase-client"

export default function ForcePasswordChangePage() {
  const router = useRouter()
  const { user, loading, changeTemporaryPassword, signOut } = useAuth()
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/")
      return
    }
    if (!user.mustChangePassword) {
      router.push("/select-company")
    }
  }, [loading, user, router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!temporaryPassword.trim()) {
      setError("Debes ingresar la contraseña temporal.")
      return
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmación de contraseña no coincide.")
      return
    }

    if (temporaryPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente de la temporal.")
      return
    }

    try {
      setSubmitting(true)
      await changeTemporaryPassword(temporaryPassword, newPassword)
      setSuccess("Contraseña actualizada correctamente. Serás redirigido a selección de empresas.")
      setTimeout(() => {
        router.push("/select-company")
      }, 1200)
    } catch (err: any) {
      const message = err?.message || "No se pudo actualizar la contraseña."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Validando sesión...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Actualización obligatoria de contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tu contraseña temporal y define una nueva contraseña para continuar.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="temporaryPassword">Contraseña temporal</Label>
            <Input
              id="temporaryPassword"
              type="password"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              placeholder="Ingresa tu contraseña temporal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={async () => {
                await signOut()
                router.push("/")
              }}
              disabled={submitting}
            >
              Cerrar sesión
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
