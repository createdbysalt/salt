interface SettingsPageProps {
  title: string
  children: React.ReactNode
}

export function SettingsPage({ title, children }: SettingsPageProps) {
  return (
    <div className="flex flex-1 flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-medium mb-8">{title}</h1>
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  )
}
