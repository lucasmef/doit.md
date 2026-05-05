'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAreas } from '@/hooks/use-areas'
import { useProjects } from '@/hooks/use-projects'
import { CreateAreaForm } from '@/components/areas/create-area-form'

export default function AreasPage() {
  const { areas, isLoading } = useAreas()
  const { projects } = useProjects()
  const [creating, setCreating] = useState(false)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Áreas</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            + Nova área
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <CreateAreaForm onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && areas.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">Nenhuma área criada ainda.</p>
          <p className="text-xs text-slate-300">Áreas são agrupamentos permanentes como Trabalho, Pessoal, Estudos.</p>
        </div>
      )}

      <div className="space-y-3">
        {areas.map((area) => {
          const areaProjects = projects.filter((p) => p.areaId === area.id && p.status === 'active')
          return (
            <div
              key={area.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: area.color ?? '#94a3b8' }}
                />
                <h2 className="text-base font-semibold text-slate-800">{area.name}</h2>
                {area.description && (
                  <span className="text-xs text-slate-400">{area.description}</span>
                )}
              </div>

              {areaProjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {areaProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-700 transition-colors"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color ?? '#94a3b8' }}
                      />
                      {p.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-300">Nenhum projeto nesta área.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
