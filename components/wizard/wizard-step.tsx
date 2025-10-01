"use client"

import { cn } from "@/lib/utils"

interface WizardStepProps {
  step: number
  currentStep: number
  title: string
  description?: string
}

export function WizardStep({ step, currentStep, title, description }: WizardStepProps) {
  const isActive = step === currentStep
  const isCompleted = step < currentStep

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold transition-all",
          isActive && "border-primary bg-primary text-primary-foreground scale-110",
          isCompleted && "border-primary bg-primary text-primary-foreground",
          !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        {isCompleted ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <div className="flex-1">
        <h3 className={cn("font-semibold", isActive && "text-primary")}>{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}
