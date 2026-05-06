import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'doit.md', template: '%s — doit.md' },
  description: 'Notas, tarefas, projetos e calendário em um só lugar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'doit.md',
  },
  applicationName: 'doit.md',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-surface text-slate-900 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
