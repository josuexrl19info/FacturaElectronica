"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FileText, Receipt, CreditCard, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type DocumentType = 'facturas' | 'tiquetes' | 'notas-credito' | 'notas-debito'

interface DocumentTypeTabsProps {
  activeType: DocumentType
  onTypeChange: (type: DocumentType) => void
  className?: string
}

const documentTypes = [
  {
    id: 'facturas' as DocumentType,
    label: 'Facturas',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    description: 'Facturas electrónicas'
  },
  {
    id: 'tiquetes' as DocumentType,
    label: 'Tiquetes',
    icon: Receipt,
    color: 'from-green-500 to-green-600',
    description: 'Tiquetes electrónicos'
  },
  {
    id: 'notas-credito' as DocumentType,
    label: 'Notas de Crédito',
    icon: Plus,
    color: 'from-purple-500 to-purple-600',
    description: 'Notas de crédito'
  },
  {
    id: 'notas-debito' as DocumentType,
    label: 'Notas de Débito',
    icon: Minus,
    color: 'from-orange-500 to-orange-600',
    description: 'Notas de débito'
  }
]

export function DocumentTypeTabs({ activeType, onTypeChange, className }: DocumentTypeTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Tab Navigation */}
      <div className="relative mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {documentTypes.map((type, index) => {
            const Icon = type.icon
            const isActive = activeType === type.id
            
            return (
              <motion.div
                key={type.id}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full h-auto p-4 flex flex-col items-center gap-2 relative overflow-hidden transition-all duration-300",
                    isActive && "text-white shadow-lg"
                  )}
                  onClick={() => onTypeChange(type.id)}
                >
                  {/* Background Gradient for Active Tab */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r opacity-100",
                          type.color
                        )}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <motion.div
                      animate={isActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-white" : "text-muted-foreground"
                      )} />
                    </motion.div>
                    
                    <div className="text-center">
                      <p className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-white" : "text-foreground"
                      )}>
                        {type.label}
                      </p>
                      <p className={cn(
                        "text-xs transition-colors",
                        isActive ? "text-white/80" : "text-muted-foreground"
                      )}>
                        {type.description}
                      </p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            )
          })}
        </div>
        
        {/* Animated Background Indicator */}
        <motion.div
          className="absolute bottom-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 via-purple-500 to-orange-500 rounded-full opacity-20"
          initial={{ width: "25%" }}
          animate={{
            width: activeType === 'facturas' ? "25%" : 
                   activeType === 'tiquetes' ? "50%" :
                   activeType === 'notas-credito' ? "75%" : "100%",
            x: activeType === 'facturas' ? "0%" : 
               activeType === 'tiquetes' ? "25%" :
               activeType === 'notas-credito' ? "50%" : "75%"
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>
      
    </div>
  )
}

// Hook para manejar el estado de los tabs
export function useDocumentTabs() {
  const [activeType, setActiveType] = useState<DocumentType>('facturas')
  
  const changeType = (type: DocumentType) => {
    setActiveType(type)
  }
  
  return {
    activeType,
    changeType
  }
}
