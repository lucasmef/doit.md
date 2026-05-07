'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUI } from '@/store/ui'

const TABS = [
  {
    href: '/inbox',
    label: 'Inbox',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    href: '/today',
    label: 'Hoje',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  { href: '#capture', label: 'Novo', icon: null },
  {
    href: '/archive',
    label: 'Arquivo',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm3 8h4" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Projetos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { setQuickCaptureOpen } = useUI()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 flex items-center safe-area-bottom">
      {TABS.map((tab) => {
        if (tab.href === '#capture') {
          return (
            <button
              key="capture"
              onClick={() => setQuickCaptureOpen(true)}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 -translate-y-3 border-4 border-white">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          )
        }

        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            {tab.icon}
            <span className="text-[9px] font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
