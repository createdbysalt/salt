interface SettingsSectionProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
  return (
    <section className="space-y-3.5">
      <div className="flex items-start justify-between gap-4 px-1">
        <div className="max-w-xl">
          <h2 className="text-[0.95rem] font-medium leading-6 text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
