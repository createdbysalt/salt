interface SettingsRowProps {
  label: React.ReactNode
  description?: string
  children: React.ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/25 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center sm:justify-end">
        {children}
      </div>
    </div>
  )
}
