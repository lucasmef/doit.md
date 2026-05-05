import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Clarity', template: '%s — Clarity' },
  description: 'Notas, tarefas, projetos e calendário em um só lugar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Clarity',
  },
  applicationName: 'Clarity',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body className="bg-surface text-slate-900 antialiased">
          {children}
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  )
}
