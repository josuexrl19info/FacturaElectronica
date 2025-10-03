/**
 * Hook para manejar redirección automática al login si el usuario no está autenticado
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'

export function useAuthRedirect(redirectTo: string = '/') {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth()
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user ? 'authenticated' : 'not authenticated')
      
      if (user) {
        setUser(user)
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
        console.log('🚪 Redirecting to login...')
        router.push(redirectTo)
      }
    })

    return () => unsubscribe()
  }, [router, redirectTo])

  return { user, loading, isAuthenticated: !!user }
}

/**
 * Hook específico para validar autenticación en operaciones críticas
 * Simplificado para evitar problemas con Rules of Hooks
 */
export function useAuthGuard() {
  const { user, loading } = useAuthRedirect('/')
  
  return { user, loading }
}
