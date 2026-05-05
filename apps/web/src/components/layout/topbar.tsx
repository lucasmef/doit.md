'use client'

import { UserButton } from '@clerk/nextjs'

export function Topbar() {
  return (
    <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-surface shrink-0">
      <div className="flex-1 max-w-sm">
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="text-sm font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
          + Novo
        </button>
        <UserButton />
      </div>
    </header>
  )
}
