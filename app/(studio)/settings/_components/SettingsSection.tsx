interface SettingsSectionProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
