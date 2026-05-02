import { cn } from "@repo/utils"

interface TableSettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function TableSettingsCard({ children, className }: TableSettingsCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card divide-y", className)}>
      {children}
    </div>
  )
}
