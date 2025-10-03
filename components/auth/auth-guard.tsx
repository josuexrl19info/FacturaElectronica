/**
 * Componente para proteger rutas que requieren autenticación
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  redirectTo = '/', 
  fallback 
}: AuthGuardProps) {
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth()
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🛡️ AuthGuard: Auth state changed:', user ? 'authenticated' : 'not authenticated')
      
      if (!user) {
        console.log('🚪 AuthGuard: Redirecting to:', redirectTo)
        router.push(redirectTo)
      }
    })

    return () => unsubscribe()
  }, [router, redirectTo])

  // Mostrar fallback mientras se verifica la autenticación
  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando autenticación...</p>
      </div>
    </div>
  )
}

/**
 * HOC para proteger páginas completas
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard redirectTo={redirectTo}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}
