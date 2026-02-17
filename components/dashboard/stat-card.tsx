import { Card } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  color: string
  compact?: boolean
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, color, compact = false }: StatCardProps) {
  const valueStr = String(value)
  const isLongValue = valueStr.length > 20 || valueStr.includes('/')
  
  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground mb-1`}>{title}</p>
          <h3 className={`${isLongValue || compact ? 'text-lg' : 'text-3xl'} font-bold mb-2 break-words`}>{value}</h3>
          {change && (
            <p
              className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${
                changeType === "positive"
                  ? "text-green-600"
                  : changeType === "negative"
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl flex items-center justify-center flex-shrink-0`}
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className={`${compact ? 'w-4 h-4' : 'w-6 h-6'}`} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}
