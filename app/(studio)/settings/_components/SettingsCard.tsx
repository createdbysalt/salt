import { cn } from "@repo/utils"

interface SettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card divide-y", className)}>
      {children}
    </div>
  )
}
