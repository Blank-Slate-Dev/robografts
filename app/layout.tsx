// robografts/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RoboGrafts — Follicle Detection System',
  description: 'AI-powered hair follicle detection for robotic FUE procedures',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#050c1a' }}>{children}</body>
    </html>
  )
}
