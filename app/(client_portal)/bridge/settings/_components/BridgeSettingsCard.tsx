import { cn } from "@repo/utils"

interface BridgeSettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function BridgeSettingsCard({ children, className }: BridgeSettingsCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card divide-y", className)}>
      {children}
    </div>
  )
}
