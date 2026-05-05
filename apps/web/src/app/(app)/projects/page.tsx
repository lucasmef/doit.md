'use client'

import { useState } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCard } from '@/components/projects/project-card'
import { CreateProjectForm } from '@/components/projects/create-project-form'

export default function ProjectsPage() {
  const { projects, isLoading } = useProjects()
  const [creating, setCreating] = useState(false)

  const active = projects.filter((p) => p.status === 'active')
  const paused = projects.filter((p) => p.status === 'paused')
  const done = projects.filter((p) => p.status === 'done' || p.status === 'archived')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Projetos</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            + Novo projeto
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <CreateProjectForm onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && projects.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">Nenhum projeto criado ainda.</p>
          <button
            onClick={() => setCreating(true)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Criar primeiro projeto
          </button>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Ativos · {active.length}
          </h2>
          <div className="space-y-2">
            {active.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Pausados · {paused.length}
          </h2>
          <div className="space-y-2">
            {paused.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Concluídos / Arquivados · {done.length}
          </h2>
          <div className="space-y-2">
            {done.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
