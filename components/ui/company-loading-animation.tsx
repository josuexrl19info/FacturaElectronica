"use client"

import { motion } from "framer-motion"
import { Building2, CheckCircle, Sparkles } from "lucide-react"
import Image from "next/image"

interface CompanyLoadingAnimationProps {
  companyName: string
  companyLogo?: {
    fileName: string
    type: string
    size: number
    fileData: string
  }
  brandColor?: string
}

export function CompanyLoadingAnimation({ 
  companyName, 
  companyLogo, 
  brandColor = "#10b981" 
}: CompanyLoadingAnimationProps) {
  const logoUrl = companyLogo?.fileData 
    ? `data:${companyLogo.type};base64,${companyLogo.fileData}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-sm">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full opacity-20"
          style={{
            background: `conic-gradient(from 0deg, ${brandColor}20, transparent, ${brandColor}20)`
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full opacity-10"
          style={{
            background: `conic-gradient(from 180deg, ${brandColor}20, transparent, ${brandColor}20)`
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Logo Animation */}
        <div className="relative mb-8">
          <motion.div
            className="w-24 h-24 mx-auto bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-white"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2
            }}
          >
            {logoUrl ? (
              <Image 
                src={logoUrl} 
                alt={companyName} 
                width={80} 
                height={80} 
                className="object-contain p-2"
              />
            ) : (
              <Building2 className="w-12 h-12 text-primary" />
            )}
          </motion.div>

          {/* Sparkle Effects */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${20 + (i % 2) * 60}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: 360
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Company Name */}
        <motion.h1
          className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {companyName}
        </motion.h1>

        {/* Loading Text */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <motion.div
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.2,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.4,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <motion.p
            className="text-lg text-muted-foreground"
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Iniciando sesión...
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Preparando tu espacio de trabajo</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="w-64 h-1 bg-muted rounded-full mx-auto mt-8 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, ${brandColor})`
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 3,
              ease: "easeInOut",
              delay: 1.5
            }}
          />
        </motion.div>

        {/* Success Checkmark */}
        <motion.div
          className="mt-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: 4.5,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <motion.p
            className="text-green-500 font-semibold mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5 }}
          >
            ¡Listo!
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
