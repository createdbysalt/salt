import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SALT Studio',
  description: 'Content management for SALT marketing site',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SanityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div style={{ position: 'fixed', inset: 0 }}>{children}</div>
}
