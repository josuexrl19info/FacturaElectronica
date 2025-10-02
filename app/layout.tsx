import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import type React from "react"
import { Suspense } from "react"
import { AuthProvider, CompaniesProvider } from "@/lib/firebase-client"
import { ToastProvider } from "@/components/providers/toast-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sistema de Facturación Electrónica",
  description: "Sistema moderno de facturación electrónica para Costa Rica",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
        <html lang="es">
          <body className={`font-sans ${inter.variable} ${GeistMono.variable}`}>
            <AuthProvider>
              <CompaniesProvider>
                <ToastProvider>
                  <Suspense fallback={<div>Loading...</div>}>
                    {children}
                    <Analytics />
                  </Suspense>
                </ToastProvider>
              </CompaniesProvider>
            </AuthProvider>
          </body>
        </html>
  )
}
