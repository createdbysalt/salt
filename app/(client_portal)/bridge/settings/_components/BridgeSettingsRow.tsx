interface BridgeSettingsRowProps {
  label: React.ReactNode
  description?: string
  children: React.ReactNode
}

export function BridgeSettingsRow({ label, description, children }: BridgeSettingsRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex items-center">
        {children}
      </div>
    </div>
  )
}
