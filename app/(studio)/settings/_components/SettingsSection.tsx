interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
