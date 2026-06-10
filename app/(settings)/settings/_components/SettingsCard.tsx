import { cn } from "@repo/utils"

interface SettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl divide-y divide-border/60",
        className
      )}
    >
      {children}
    </div>
  )
}
