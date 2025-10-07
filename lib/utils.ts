import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Devuelve la URL base para llamadas a APIs propias
// - En navegador: cadena vacía para usar rutas relativas (/api/...)
// - En Vercel (server): usa VERCEL_URL
// - Con variable propia: NEXT_PUBLIC_SITE_URL
// - En desarrollo server: http://localhost:3000
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return ''
  }
  // Prefiere una variable solo de servidor si está definida
  if (process.env.SITE_URL) {
    return process.env.SITE_URL
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
