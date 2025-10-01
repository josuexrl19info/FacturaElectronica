"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  onSubmit: () => void
  isLastStep: boolean
  canProceed: boolean
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSubmit,
  isLastStep,
  canProceed,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <Button variant="outline" onClick={onPrevious} disabled={currentStep === 1} className="gap-2 bg-transparent">
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </Button>

      <div className="text-sm text-muted-foreground">
        Paso {currentStep} de {totalSteps}
      </div>

      {isLastStep ? (
        <Button onClick={onSubmit} disabled={!canProceed} className="gap-2">
          Crear Empresa
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </Button>
      ) : (
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
