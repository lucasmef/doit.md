'use client'

import Link from 'next/link'
import type { Project } from '@doit/types'

const STATUS_LABEL: Record<Project['status'], string> = {
  active: 'Ativo',
  paused: 'Pausado',
  done: 'Concluído',
  archived: 'Arquivado',
}

const DOT_COLOR: Record<Project['status'], string> = {
  active: 'bg-green-400',
  paused: 'bg-amber-400',
  done: 'bg-blue-400',
  archived: 'bg-slate-300',
}

type Props = { project: Project }

export function ProjectCard({ project }: Props) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: project.color ?? '#94a3b8' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{project.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[project.status]}`} />
        <span className="text-xs text-slate-400">{STATUS_LABEL[project.status]}</span>
      </div>
    </Link>
  )
}
