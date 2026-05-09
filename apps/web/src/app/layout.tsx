import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'doit.md', template: '%s — doit.md' },
  description: 'Notas, tarefas, projetos e calendário em um só lugar',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/logo-icon.svg', type: 'image/svg+xml' },
      { url: '/api/icon/192', sizes: '192x192', type: 'image/png' },
      { url: '/api/icon/512', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/api/icon/192', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'doit.md',
  },
  applicationName: 'doit.md',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#2f6bff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-surface text-navy-900 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
