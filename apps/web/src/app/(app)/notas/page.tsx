'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Folder, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { BentoGrid, CardTitle, DarkGlowCard, GlassCard } from '@/components/ui/bento'
import { useFolders } from '@/hooks/use-folders'
import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'

const FOLDER_COLORS = ['#2F6BFF', '#7B5BFF', '#28C7B7', '#F5A524', '#FF6FAE', '#1AAED7']
const NOTE_ACCENTS: Array<{ accent: string; fileColor: string }> = [
  { accent: '#2F6BFF', fileColor: '#2F6BFF' },
  { accent: '#7B5BFF', fileColor: '#7B5BFF' },
  { accent: '#28C7B7', fileColor: '#0f8d80' },
  { accent: '#FF6FAE', fileColor: '#C0297A' },
  { accent: '#F5A524', fileColor: '#B56B00' },
  { accent: '#1AAED7', fileColor: '#0A7DA0' },
]

function formatRelative(iso: string): string {
  const updated = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - updated)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}min`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const days = Math.round(hr / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function snippetFor(note: Item): string {
  if (!note.contentMd) return 'Sem conteudo capturado ainda.'
  const flat = note.contentMd.replace(/\s+/g, ' ').trim()
  return flat.length > 160 ? `${flat.slice(0, 160)}...` : flat
}

function wordCountOf(note: Item): number {
  if (!note.contentMd) return 0
  return note.contentMd.trim().split(/\s+/).filter(Boolean).length
}

function readMinutesOf(note: Item): number {
  return Math.max(1, Math.round(wordCountOf(note) / 200))
}

function isToday(iso: string, today: string): boolean {
  return iso.slice(0, 10) === today
}

function pickAccent(index: number): { accent: string; fileColor: string } {
  return NOTE_ACCENTS[index % NOTE_ACCENTS.length] ?? { accent: '#2F6BFF', fileColor: '#2F6BFF' }
}

function FolderIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function FileBadge({ name, color }: { name: string; color?: string }) {
  return (
    <span className="font-mono text-[10px] font-bold" style={{ color: color ?? '#2F6BFF' }}>
      M↓ {name}
    </span>
  )
}

function StarFilled() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#F5A524]" fill="currentColor" aria-hidden="true">
      <path d="m12 3.5 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9L12 3.5Z" />
    </svg>
  )
}

function WritingRing({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent))
  const circ = 2 * Math.PI * 36
  return (
    <div className="relative h-[86px] w-[86px] shrink-0">
      <svg width="86" height="86" viewBox="0 0 86 86" className="-rotate-90">
        <defs>
          <linearGradient id="notas-wg" x1="0" y1="0" x2="86" y2="86">
            <stop offset="0" stopColor="#7B5BFF" />
            <stop offset="0.5" stopColor="#2F6BFF" />
            <stop offset="1" stopColor="#28C7B7" />
          </linearGradient>
        </defs>
        <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(15,35,66,.12)" strokeWidth={7} />
        <circle
          cx="43"
          cy="43"
          r="36"
          fill="none"
          stroke="url(#notas-wg)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - safe / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="bg-[linear-gradient(120deg,#7B5BFF,#2F6BFF,#28C7B7)] bg-clip-text text-[20px] font-black leading-none text-transparent">
            {safe}%
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-navy-500">goal</div>
        </div>
      </div>
    </div>
  )
}

function WritingStatsCard({
  totalNotes,
  editedToday,
  goalPercent,
}: {
  totalNotes: number
  editedToday: number
  goalPercent: number
}) {
  return (
    <article className="flex flex-col rounded-[28px] border border-white/70 bg-[linear-gradient(160deg,#FFE9F4_0%,#E4DDFF_50%,#D4F4EF_100%)] p-6 shadow-[0_1px_0_rgba(255,255,255,.72)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] lg:col-span-3 lg:row-span-1">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>escrita</CardTitle>
        <span className="rounded-full bg-navy-900/[0.06] px-2 py-0.5 font-mono text-[10px] text-navy-500">esta semana</span>
      </div>
      <div className="mt-1 flex items-center gap-4">
        <WritingRing percent={goalPercent} />
        <div>
          <div className="text-[28px] font-black leading-none text-navy-900">{totalNotes}</div>
          <div className="mt-1 font-mono text-[11px] text-navy-500">notes na biblioteca</div>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-navy-900/[0.06] pt-3 font-mono text-[11px] text-navy-500">
        <div>
          <b className="block font-sans text-[15px] font-bold text-navy-900">{totalNotes}</b>
          notes
        </div>
        <div>
          <b className="block font-sans text-[15px] font-bold text-navy-900">{editedToday}</b>
          editadas hoje
        </div>
      </div>
    </article>
  )
}

function EditorSpotlightCard({ note, breadcrumb, onOpen }: { note: Item | null; breadcrumb: string[]; onOpen: (id: string) => void }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/55 bg-white/62 p-6 shadow-[0_1px_0_rgba(255,255,255,.72)_inset,0_22px_55px_rgba(15,35,66,.16)] backdrop-blur-2xl lg:col-span-6 lg:row-span-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(123,91,255,.30), transparent 60%), radial-gradient(circle at 70% 70%, rgba(40,199,183,.25), transparent 60%)',
          filter: 'blur(20px)',
        }}
      />
      <div className="relative mb-2 flex items-center justify-between">
        <CardTitle>editando agora</CardTitle>
        {note ? (
          <button
            type="button"
            onClick={() => onOpen(note.id)}
            className="grid h-7 w-7 place-items-center rounded-full bg-navy-900/[0.04] text-sm font-black leading-none text-navy-500 hover:bg-navy-900/[0.08]"
            aria-label="Abrir nota"
          >
            ...
          </button>
        ) : null}
      </div>

      {note ? (
        <>
          <div className="relative mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
            {breadcrumb.map((crumb, i) => (
              <Fragment key={`${crumb}-${i}`}>
                <span>{crumb}</span>
                <span className="text-navy-900/25">/</span>
              </Fragment>
            ))}
            <FileBadge name={(note.localPath ?? `${note.title.toLowerCase().replace(/\s+/g, '-')}.md`)} color="#2F6BFF" />
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-teal-600">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_#28C7B7]" />
              salvo · {formatRelative(note.updatedAt)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpen(note.id)}
            className="relative my-1 max-w-full text-left text-[32px] font-black leading-[1.05] -tracking-[.03em] text-navy-900 hover:opacity-80"
          >
            {note.title.split(' ').slice(0, -1).join(' ') || note.title}{' '}
            {note.title.split(' ').length > 1 ? (
              <span className="bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_45%,#28C7B7)] bg-clip-text text-transparent">
                {note.title.split(' ').slice(-1).join(' ')}
              </span>
            ) : null}
          </button>
          {note.tags.length > 0 ? (
            <div className="relative mb-2 flex flex-wrap gap-1.5">
              {note.tags.slice(0, 3).map((tag, i) => {
                const tones = [
                  'bg-[rgba(47,107,255,.10)] text-brand-600',
                  'bg-[rgba(40,199,183,.14)] text-teal-600',
                  'bg-[rgba(123,91,255,.12)] text-violet-500',
                ]
                return (
                  <span key={tag} className={`rounded font-mono text-[11px] px-2 py-0.5 ${tones[i % tones.length]}`}>
                    #{tag}
                  </span>
                )
              })}
            </div>
          ) : null}
          <p className="relative line-clamp-2 flex-1 overflow-hidden text-[13px] leading-[1.55] text-navy-900">{snippetFor(note)}</p>
          <div className="relative mt-2 flex items-center gap-3 font-mono text-[11px] text-navy-500">
            <span>{wordCountOf(note)} palavras</span>
            <span>·</span>
            <span>{readMinutesOf(note)} min de leitura</span>
            <span>·</span>
            <span>editada {formatRelative(note.updatedAt)}</span>
          </div>
        </>
      ) : (
        <div className="relative flex flex-1 items-center justify-center text-center font-mono text-[12px] text-navy-500">
          nenhuma nota ainda · capture sua primeira ideia
        </div>
      )}
    </article>
  )
}

function PinnedCard({ pins, onOpen }: { pins: Item[]; onOpen: (id: string) => void }) {
  const pinTones = ['', 'v', 't', 'p'] as const
  const toneClass: Record<typeof pinTones[number], string> = {
    '': 'bg-[linear-gradient(135deg,rgba(47,107,255,.10),rgba(40,199,183,.10))] border-[rgba(47,107,255,.18)] text-brand-600',
    v: 'bg-[linear-gradient(135deg,rgba(123,91,255,.10),rgba(255,111,174,.10))] border-[rgba(123,91,255,.22)] text-violet-500',
    t: 'bg-[linear-gradient(135deg,rgba(40,199,183,.12),rgba(26,174,215,.12))] border-[rgba(40,199,183,.25)] text-teal-600',
    p: 'bg-[linear-gradient(135deg,rgba(255,111,174,.12),rgba(245,165,36,.12))] border-[rgba(255,111,174,.25)] text-pink-600',
  }
  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-3 lg:row-span-1">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>anexou</CardTitle>
        <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500">{pins.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {pins.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center font-mono text-[11px] text-navy-500">
            sem notas fixadas
          </div>
        ) : (
          pins.slice(0, 4).map((pin, i) => {
            const tone = pinTones[i % pinTones.length] ?? ''
            return (
              <button
                key={pin.id}
                type="button"
                onClick={() => onOpen(pin.id)}
                className="flex items-center gap-2.5 rounded-xl border border-navy-900/[0.04] bg-white p-2 text-left shadow-[0_1px_2px_rgba(15,35,66,.04)] hover:shadow-[0_4px_10px_rgba(15,35,66,.08)]"
              >
                <span className={`inline-grid h-[30px] w-[30px] place-items-center rounded-lg border font-mono text-[11px] font-bold ${toneClass[tone]}`}>
                  M↓
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                  <span className="truncate text-[13px] font-semibold text-navy-900">{pin.title}</span>
                  <span className="truncate font-mono text-[10px] text-navy-500">
                    {pin.localPath ?? `${pin.title.toLowerCase().replace(/\s+/g, '-')}.md`} · {formatRelative(pin.updatedAt)}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </GlassCard>
  )
}

function LibraryCard({
  notes,
  filters,
  active,
  onFilter,
  onOpen,
  totalNotes,
}: {
  notes: Item[]
  filters: Array<{ id: string; label: string }>
  active: string
  onFilter: (id: string) => void
  onOpen: (id: string) => void
  totalNotes: number
}) {
  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-8 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>biblioteca</CardTitle>
        <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500">{totalNotes} notas</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const isActive = f.id === active
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                isActive
                  ? 'border border-navy-900/[0.04] bg-white text-navy-900 shadow-[0_1px_2px_rgba(15,35,66,.06),0_4px_10px_rgba(15,35,66,.06)]'
                  : 'border border-transparent bg-navy-900/[0.05] text-navy-500 hover:text-navy-900'
              }`}
            >
              {f.label}
            </button>
          )
        })}
        <span className="ml-auto font-mono text-[11px] text-navy-500">
          sort · <b className="font-semibold text-navy-900">editadas</b>
        </span>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 lg:grid-cols-3">
        {notes.slice(0, 6).map((note, i) => {
          const accent = pickAccent(i)
          const isStarred = i === 0 || i === 3
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => onOpen(note.id)}
              className="group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-navy-900/[0.04] bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,35,66,.04),0_8px_18px_-10px_rgba(15,35,66,.15)] hover:shadow-[0_4px_12px_rgba(15,35,66,.10)]"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent.accent }} aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <FileBadge name={note.localPath ?? `${note.title.toLowerCase().replace(/\s+/g, '-')}.md`} color={accent.fileColor} />
                {isStarred ? (
                  <span className="ml-auto">
                    <StarFilled />
                  </span>
                ) : null}
              </div>
              <div className="text-[14px] font-bold leading-tight -tracking-[.01em] text-navy-900">{note.title}</div>
              <div className="line-clamp-3 flex-1 text-[11.5px] leading-[1.45] text-navy-500">{snippetFor(note)}</div>
              <div className="flex items-center gap-1.5 pt-1">
                {note.tags.slice(0, 1).map((tag) => (
                  <span key={tag} className="rounded bg-navy-900/[0.05] px-1.5 py-0.5 font-mono text-[9px] text-navy-500">
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] text-navy-300">{formatRelative(note.updatedAt)}</span>
              </div>
            </button>
          )
        })}
        {notes.length === 0 ? (
          <div className="col-span-full grid place-items-center py-10 text-center font-mono text-[12px] text-navy-500">
            nenhuma nota neste filtro
          </div>
        ) : null}
      </div>
    </GlassCard>
  )
}

function KnowledgeGraphCard({ notes }: { notes: Item[] }) {
  const positions = [
    { left: '16%', top: '25%', tone: 'violet' },
    { left: '87%', top: '19%', tone: 'teal' },
    { left: '13%', top: '78%', tone: '' },
    { left: '89%', top: '84%', tone: 'pink' },
    { left: '60%', top: '10%', tone: '' },
    { left: '40%', top: '91%', tone: 'teal' },
  ] as const
  const toneClass: Record<string, string> = {
    '': 'bg-white text-navy-900 border-white',
    violet: 'bg-[linear-gradient(135deg,#B59BFF,#7B5BFF)] text-white border-white/40',
    teal: 'bg-[linear-gradient(135deg,#5BE3D4,#28C7B7)] text-navy-900 border-white',
    pink: 'bg-[linear-gradient(135deg,#FFB1D5,#FF6FAE)] text-white border-white',
  }
  const center = notes[0]?.title ? `${notes[0].title.toLowerCase().slice(0, 12)}.md` : 'hoje.md'
  return (
    <DarkGlowCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="text-white/85">links</CardTitle>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/80">
          {notes.length} notas
        </span>
      </div>
      <div className="relative -mx-2 flex-1">
        <svg viewBox="0 0 380 320" preserveAspectRatio="xMidYMid meet" className="block h-full w-full">
          <defs>
            <linearGradient id="notas-edge" x1="0" y1="0" x2="380" y2="320">
              <stop offset="0" stopColor="#2F6BFF" stopOpacity="0.5" />
              <stop offset="1" stopColor="#28C7B7" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d="M 190 160 Q 110 100 60 80" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 190 160 Q 290 80 330 60" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 190 160 Q 110 220 50 250" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 190 160 Q 290 240 340 270" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 190 160 Q 250 80 230 30" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 190 160 Q 130 240 150 290" stroke="url(#notas-edge)" strokeWidth={1.5} fill="none" />
          <path d="M 60 80 Q 90 50 230 30" stroke="rgba(255,255,255,.15)" strokeWidth={1} fill="none" />
          <path d="M 330 60 Q 340 160 340 270" stroke="rgba(255,255,255,.15)" strokeWidth={1} fill="none" />
        </svg>
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white bg-[linear-gradient(135deg,#2F6BFF,#28C7B7)] px-3 py-1.5 font-mono text-[11px] font-bold text-white shadow-[0_0_16px_rgba(40,199,183,.6),0_4px_14px_rgba(47,107,255,.5)] whitespace-nowrap"
          style={{ left: '50%', top: '50%' }}
        >
          {center}
        </div>
        {positions.map((p, i) => {
          const next = notes[i + 1]
          const fallback = ['eventos.md', 'arch.md', 'meeting-notes.md', 'changelog.md', 'ideas.md', 'reading.md'][i] ?? 'note.md'
          const label = next ? `${next.title.toLowerCase().replace(/\s+/g, '-').slice(0, 14)}.md` : fallback
          return (
            <div
              key={i}
              className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border-[1.5px] px-2 py-1 font-mono text-[10px] font-semibold shadow-[0_4px_12px_rgba(15,35,66,.4)] ${toneClass[p.tone]}`}
              style={{ left: p.left, top: p.top }}
            >
              {label}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-3 font-mono text-[10px] text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#79A6FF]" />
          linked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5BE3D4]" />
          backlinks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B59BFF]" />
          tag-cluster
        </span>
      </div>
    </DarkGlowCard>
  )
}

function NotebooksCard({ notebooks }: { notebooks: Array<{ folder: Folder; count: number; description: string; color: string }> }) {
  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-1">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>pastas</CardTitle>
        <Link href="/notas/pastas" className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500 hover:bg-navy-900/[0.08] hover:text-navy-900">
          {notebooks.length} pastas
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {notebooks.length === 0 ? (
          <Link
            href="/notas/pastas"
            className="grid flex-1 place-items-center rounded-2xl border border-dashed border-navy-900/15 text-center font-mono text-[11px] text-navy-500 hover:border-brand-300 hover:text-brand-600"
          >
            criar primeira pasta
          </Link>
        ) : (
          notebooks.slice(0, 4).map(({ folder, count, description, color }) => (
            <Link
              key={folder.id}
              href={`/notas/pastas/${folder.id}`}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-navy-900/[0.04] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,35,66,.04)] hover:shadow-[0_4px_12px_rgba(15,35,66,.08)]"
            >
              <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: color }} aria-hidden="true" />
              <span
                className="inline-grid h-[30px] w-[30px] place-items-center rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color }}
              >
                <FolderIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-navy-900">{folder.name}</span>
                <span className="block truncate font-mono text-[11px] text-navy-500">{description}</span>
              </span>
              <span className="font-mono text-[16px] font-bold -tracking-[.02em]" style={{ color }}>
                {count}
              </span>
            </Link>
          ))
        )}
      </div>
    </GlassCard>
  )
}

function MiniGardenCard({ notes, folders }: { notes: Item[]; folders: Folder[] }) {
  const stickies = [
    {
      file: 'creative.md',
      title: notes[0]?.title ?? 'brainstorm criativo',
      bg: '#fff7d6',
      pos: 'left-[4%] top-[22%] rotate-[-5deg]',
      pin: '',
    },
    {
      file: folders[0] ? `pastas/${folders[0].name}.md` : 'pastas/conteudo.md',
      title: folders[0]?.name ? `Pasta ${folders[0].name}` : 'Q4 - simples',
      bg: '#ffffff',
      pos: 'left-[32%] top-[10%] rotate-[3deg]',
      pin: 'teal',
    },
    {
      file: 'agenda-sync.md',
      title: 'notas da agenda',
      bg: '#d8f5ef',
      pos: 'left-[62%] top-[24%] rotate-[-2deg]',
      pin: 'violet',
    },
    {
      file: notes[1]?.localPath ?? 'ideas.md',
      title: notes[1]?.title ?? 'arquivo de ideias',
      bg: '#ffebf4',
      pos: 'left-[20%] top-[60%] rotate-[4deg]',
      pin: 'teal',
    },
    {
      file: 'reading.md',
      title: notes[2]?.title ?? 'para ler',
      bg: '#ffffff',
      pos: 'left-[56%] top-[62%] rotate-[-3deg]',
      pin: '',
    },
  ]
  const pinColor: Record<string, string> = {
    '': 'radial-gradient(circle at 30% 30%, #FF6FAE, #C0297A)',
    teal: 'radial-gradient(circle at 30% 30%, #5BE3D4, #18948A)',
    violet: 'radial-gradient(circle at 30% 30%, #B59BFF, #5A37D9)',
  }
  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-5 lg:row-span-1">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>jardim</CardTitle>
        <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500">stickies · {stickies.length}</span>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-navy-900/[0.05] bg-[radial-gradient(circle_at_25%_30%,rgba(255,209,235,.55),transparent_60%),radial-gradient(circle_at_75%_30%,rgba(255,222,179,.45),transparent_60%),radial-gradient(circle_at_50%_90%,rgba(202,232,255,.55),transparent_60%),linear-gradient(135deg,#FFF6F1,#F1ECFF)]">
        {stickies.map((s, i) => (
          <div
            key={i}
            className={`absolute w-[120px] rounded-[4px] px-2.5 py-2 shadow-[0_8px_16px_-8px_rgba(15,35,66,.20),0_2px_4px_rgba(15,35,66,.06)] ${s.pos}`}
            style={{ backgroundColor: s.bg }}
          >
            <span
              aria-hidden="true"
              className="absolute -top-[5px] left-1/2 h-[9px] w-[9px] -translate-x-1/2 rounded-full shadow-[0_2px_3px_rgba(192,41,122,.4)]"
              style={{ background: pinColor[s.pin] }}
            />
            <span className="block font-mono text-[9px] font-bold text-brand-600">M↓ {s.file}</span>
            <span className="mt-1 block text-[11px] font-bold leading-tight text-navy-900">{s.title}</span>
          </div>
        ))}
        <span className="absolute left-[50%] top-[5%] font-script text-base text-navy-900/30">✦</span>
        <span className="absolute left-[88%] top-[60%] font-script text-base text-navy-900/30">↗</span>
        <span className="absolute bottom-[10%] left-[8%] font-script text-base text-navy-900/30">~∿</span>
      </div>
    </GlassCard>
  )
}

function WritingStreakCard({ streakDays, bestStreak, recentBars }: { streakDays: number; bestStreak: number; recentBars: number[] }) {
  return (
    <article className="flex flex-col rounded-[28px] border border-white/40 bg-[linear-gradient(160deg,#2F6BFF_0%,#4F4BE9_50%,#28C7B7_100%)] p-6 text-white shadow-[0_24px_60px_rgba(15,35,66,.28)] lg:col-span-3 lg:row-span-1">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="text-white/85">ritmo de escrita</CardTitle>
        <span className="rounded-full bg-white/18 px-2 py-0.5 font-mono text-[10px] text-white">{streakDays} dias</span>
      </div>
      <div className="text-[44px] font-black leading-none -tracking-[.04em] [text-shadow:0_2px_12px_rgba(15,35,66,.25)]">{streakDays}d</div>
      <div className="mt-1 font-mono text-[11px] opacity-85">notas escritas · melhor {bestStreak}d</div>
      <div className="mt-auto flex h-[38px] items-end gap-[3px]">
        {recentBars.map((h, i) => {
          const isToday = i === recentBars.length - 2
          const isLast = i === recentBars.length - 1
          return (
            <span
              key={i}
              className={`flex-1 rounded ${
                isToday
                  ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,.9),0_-4px_12px_rgba(255,255,255,.6)]'
                  : isLast
                    ? 'bg-white/30'
                    : 'bg-white/85'
              }`}
              style={{ height: `${h}%` }}
            />
          )
        })}
      </div>
    </article>
  )
}

export default function NotasPage() {
  const today = toLocalDateKey()
  const { items } = useItems()
  const { folders } = useFolders()
  const { setSingleSelection } = useUI()
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const notes = useMemo(
    () =>
      items
        .filter((item) => item.complexity === 'note' && item.status !== 'archived')
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  )

  const editedToday = useMemo(() => notes.filter((n) => isToday(n.updatedAt, today)).length, [notes, today])
  const goalPercent = Math.min(100, Math.round((editedToday / 5) * 100))

  const topLevelFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders])
  const notebooks = useMemo(() => {
    return topLevelFolders.map((folder, i) => {
      const count = items.filter((it) => it.folderId === folder.id && it.status !== 'archived').length
      const child = folders.filter((f) => f.parentId === folder.id).slice(0, 3).map((f) => f.name).join(' · ')
      return {
        folder,
        count,
        description: child || 'pasta',
        color: FOLDER_COLORS[i % FOLDER_COLORS.length] ?? '#2F6BFF',
      }
    })
  }, [topLevelFolders, folders, items])

  const filters = useMemo(() => {
    const base = [{ id: 'all', label: 'todas' }]
    topLevelFolders.slice(0, 4).forEach((f) => base.push({ id: f.id, label: f.name }))
    base.push({ id: 'inbox', label: 'inbox' })
    return base
  }, [topLevelFolders])

  const filteredNotes = useMemo(() => {
    if (activeFilter === 'all') return notes
    if (activeFilter === 'inbox') return notes.filter((n) => !n.folderId)
    return notes.filter((n) => n.folderId === activeFilter)
  }, [notes, activeFilter])

  const spotlight = notes[0] ?? null
  const breadcrumb = useMemo(() => {
    if (!spotlight?.folderId) return ['inbox']
    const map = new Map(folders.map((f) => [f.id, f]))
    const path: string[] = []
    let cur: Folder | undefined = map.get(spotlight.folderId)
    while (cur) {
      path.unshift(cur.name)
      cur = cur.parentId ? map.get(cur.parentId) : undefined
    }
    return path.length > 0 ? path : ['notas']
  }, [spotlight, folders])

  const pinned = useMemo(() => notes.slice(0, 4), [notes])

  const recentBars = useMemo(() => {
    const days = 14
    const base: number[] = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = toLocalDateKey(d)
      const editsThatDay = notes.filter((n) => isToday(n.updatedAt, key)).length
      base.push(Math.min(100, Math.max(15, editsThatDay * 25 + 30 + ((i * 7) % 40))))
    }
    return base
  }, [notes])

  const streakDays = useMemo(() => {
    let streak = 0
    for (let i = 0; i < 30; i += 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = toLocalDateKey(d)
      const has = notes.some((n) => isToday(n.updatedAt, key))
      if (has) streak += 1
      else if (i > 0) break
    }
    return streak
  }, [notes])

  return (
    <div className="px-4 pb-12 pt-3 lg:px-8 lg:pt-4">
      <BentoGrid className="lg:auto-rows-[230px]">
        <WritingStatsCard totalNotes={notes.length} editedToday={editedToday} goalPercent={goalPercent} />
        <EditorSpotlightCard note={spotlight} breadcrumb={breadcrumb} onOpen={setSingleSelection} />
        <PinnedCard pins={pinned} onOpen={setSingleSelection} />
        <LibraryCard
          notes={filteredNotes}
          filters={filters}
          active={activeFilter}
          onFilter={setActiveFilter}
          onOpen={setSingleSelection}
          totalNotes={notes.length}
        />
        <KnowledgeGraphCard notes={notes} />
        <NotebooksCard notebooks={notebooks} />
        <MiniGardenCard notes={notes} folders={topLevelFolders} />
        <WritingStreakCard streakDays={streakDays} bestStreak={Math.max(streakDays, 14)} recentBars={recentBars} />
      </BentoGrid>
    </div>
  )
}
