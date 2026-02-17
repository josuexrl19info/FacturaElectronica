"use client"

import { motion } from "framer-motion"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { FileText, Clock, Sparkles } from "lucide-react"

export default function ReportsPage() {
  // Animación para el contenedor principal
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  // Animación para el texto principal
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  // Animación para el ícono
  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        duration: 0.8
      }
    }
  }

  // Animación para las partículas decorativas
  const particleVariants = {
    animate: {
      y: [0, -20, 0],
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.2, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  // Animación para el pulso del ícono
  const pulseVariants = {
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Reportes" description="Genere y descargue reportes del sistema" />

      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center min-h-[60vh]"
        >
          <Card className="p-12 max-w-2xl w-full relative overflow-hidden">
            {/* Partículas decorativas de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={particleVariants}
                  animate="animate"
                  style={{
                    position: "absolute",
                    left: `${15 + i * 15}%`,
                    top: `${20 + (i % 3) * 30}%`,
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "hsl(var(--primary))",
                    opacity: 0.3
                  }}
                  transition={{ delay: i * 0.3 }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6">
              {/* Ícono animado */}
              <motion.div
                variants={iconVariants}
                className="relative"
              >
                <motion.div
                  variants={pulseVariants}
                  animate="animate"
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <FileText className="w-12 h-12 text-primary" />
                </motion.div>
                
                {/* Anillo de pulso alrededor del ícono */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={{
                    scale: [1, 1.5, 1.5],
                    opacity: [0.5, 0, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </motion.div>

              {/* Texto principal */}
              <motion.div variants={textVariants} className="space-y-4">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Próximamente
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Estamos trabajando en una sección de reportes completa y poderosa. 
                  Muy pronto podrás generar y descargar reportes detallados de tu negocio.
                </p>
              </motion.div>

              {/* Íconos decorativos animados */}
              <motion.div
                variants={textVariants}
                className="flex items-center gap-4 text-muted-foreground"
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Clock className="w-5 h-5" />
                </motion.div>
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                </motion.div>
                <motion.div
                  animate={{
                    rotate: [0, -360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Clock className="w-5 h-5" />
                </motion.div>
              </motion.div>

              {/* Barra de progreso animada */}
              <motion.div
                variants={textVariants}
                className="w-full max-w-xs space-y-2"
              >
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "75%" }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">En desarrollo...</p>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
