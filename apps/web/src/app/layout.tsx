import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { ThemeManager } from '@/components/theme/theme-manager'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'doit.md', template: '%s — doit.md' },
  description: 'Notas, tarefas, pastas e calendário em um só lugar',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2f6bff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Caveat:wght@400;600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const raw = localStorage.getItem('doit:preferences'); const pref = raw ? JSON.parse(raw).theme : 'system'; const theme = pref === 'dark' || (pref !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); } catch { } })();`,
          }}
        />
      </head>
      <body className="bg-surface text-navy-900 antialiased">
        <ThemeManager />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
