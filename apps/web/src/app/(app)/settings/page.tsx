'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { syncGoogleCalendar, useGoogleCalendars } from '@/hooks/use-calendar-events'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { ArchiveSection } from '@/components/archive/archive-section'
import { AuditSection } from '@/components/audit/audit-section'
import { ProfileSection } from '@/components/settings/profile-section'
import { CliTokensSection } from '@/components/settings/cli-tokens-section'
import { useItems } from '@/hooks/use-items'
import {
  usePreferences,
  type MobileNavItem,
  type MobileNavItemId,
  type ThemePreference,
} from '@/hooks/use-preferences'
import { MOBILE_NAV_LABELS } from '@/components/layout/bottom-nav'
import { useDialog } from '@/components/ui/dialog'
import Link from 'next/link'
import { AgentsEditorModal } from '@/components/agents/agents-editor-modal'

interface GoogleAccount {
  email: string
  connectedAt: string
  hasCalendar?: boolean
  hasDrive?: boolean
}

type Tab =
  | 'profile'
  | 'appearance'
  | 'integrations'
  | 'notifications'
  | 'sync'
  | 'ai'
  | 'cli'
  | 'tags'
  | 'shortcuts'
  | 'archive'
  | 'audit'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profile', label: 'Perfil' },
  { id: 'appearance', label: 'Aparencia' },
  { id: 'integrations', label: 'Integracoes' },
  { id: 'notifications', label: 'Notificacoes' },
  { id: 'sync', label: 'Sync' },
  { id: 'ai', label: 'IA' },
  { id: 'cli', label: 'CLI' },
  { id: 'tags', label: 'Tags' },
  { id: 'shortcuts', label: 'Atalhos' },
  { id: 'archive', label: 'Arquivo' },
  { id: 'audit', label: 'Auditoria' },
]

const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    title: 'Global',
    items: [
      { keys: ['Shift', '?'], label: 'Mostrar atalhos' },
      { keys: ['Q'], label: 'Nova tarefa' },
      { keys: ['W'], label: 'Nova nota' },
      { keys: ['E'], label: 'Novo evento de calendario' },
      { keys: ['Ctrl/Cmd', 'K'], label: 'Buscar' },
      { keys: ['H'], label: 'Ir para Hoje' },
      { keys: ['P'], label: 'Ir para Próximos' },
      { keys: ['Shift', 'C'], label: 'Abrir/fechar calendário' },
      { keys: ['Esc'], label: 'Fechar modal/painel ou salvar e sair de nota' },
    ],
  },
  {
    title: 'Listas',
    items: [
      { keys: ['J', 'Down'], label: 'Selecionar proximo item' },
      { keys: ['K', 'Up'], label: 'Selecionar item anterior' },
      { keys: ['Enter'], label: 'Abrir item focado' },
      { keys: ['E'], label: 'Editar item selecionado' },
      { keys: ['Click direito'], label: 'Menu contextual (desktop)' },
      { keys: ['Long press'], label: 'Menu contextual (mobile)' },
      { keys: ['Shift', 'Click'], label: 'Selecionar intervalo' },
      { keys: ['Ctrl/Cmd', 'Click'], label: 'Selecionar varios' },
    ],
  },
  {
    title: 'Captura rapida',
    items: [
      { keys: ['@tag'], label: 'Adicionar tag' },
      { keys: ['#pasta'], label: 'Vincular a uma pasta' },
      { keys: ['p1', 'p2', 'p3', 'p4'], label: 'Definir prioridade' },
      { keys: ['hoje', 'amanha'], label: 'Definir data por palavra' },
      { keys: ['12/05', '2026-05-09'], label: 'Definir data exata' },
      { keys: ['14:30', 'as 18h'], label: 'Definir horario' },
    ],
  },
  {
    title: 'Notas',
    items: [
      { keys: ['Esc'], label: 'Salvar e fechar nota' },
      { keys: ['Click fora'], label: 'Salvar e fechar nota' },
    ],
  },
]

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-h-6 items-center justify-center rounded-md border border-ui-border bg-white px-1.5 font-mono text-[11px] font-semibold text-navy-700 shadow-sm">
      {children}
    </kbd>
  )
}

function ShortcutsSection() {
  return (
    <section className="space-y-4">
      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Atalhos de teclado</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Atalhos globais funcionam apenas quando nenhum campo esta em foco.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-[16px] border border-ui-border-panel bg-surface-panel p-3 shadow-sm"
          >
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-400">
              {group.title}
            </h3>
            <div className="divide-y divide-ui-border-soft">
              {group.items.map((item) => (
                <div
                  key={`${group.title}-${item.label}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-[13px] text-navy-700">{item.label}</span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {item.keys.map((key) => (
                      <KeyCap key={key}>{key}</KeyCap>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AppearanceSection() {
  const { prefs, update } = usePreferences()
  const { calendars } = useGoogleCalendars()
  const writableCalendars = calendars.filter(
    (calendar) =>
      !calendar.accessRole || calendar.accessRole === 'owner' || calendar.accessRole === 'writer',
  )
  const recommendedMobileNav: MobileNavItemId[] = [
    'dashboard',
    'today',
    'notas',
    'calendar',
    'inbox',
    'upcoming',
    'settings',
  ]
  const themeOptions: Array<{ id: ThemePreference; label: string; description: string }> = [
    { id: 'light', label: 'Claro', description: 'Usar sempre a interface clara.' },
    { id: 'dark', label: 'Escuro', description: 'Usar sempre a interface escura.' },
    { id: 'system', label: 'Automatico', description: 'Seguir o tema do sistema.' },
  ]

  function moveNavItem(id: MobileNavItemId, direction: -1 | 1) {
    const list = [...prefs.mobileNav]
    const idx = list.findIndex((entry) => entry.id === id)
    const swap = idx + direction
    if (idx < 0 || swap < 0 || swap >= list.length) return
    const current = list[idx]
    const other = list[swap]
    if (!current || !other) return
    list[idx] = other
    list[swap] = current
    update({ mobileNav: list })
  }

  function toggleNavItem(id: MobileNavItemId, visible: boolean) {
    const list: MobileNavItem[] = prefs.mobileNav.map((entry) =>
      entry.id === id ? { ...entry, visible } : entry,
    )
    if (id === 'inbox') {
      update({ mobileNav: list, showInbox: visible })
    } else {
      update({ mobileNav: list })
    }
  }

  function applyRecommendedMobileNav() {
    const visibility = new Map(prefs.mobileNav.map((entry) => [entry.id, entry.visible]))
    update({
      mobileNav: recommendedMobileNav.map((id) => ({
        id,
        visible: visibility.get(id) !== false,
      })),
    })
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Tema</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Escolha entre modo claro, escuro ou automatico pelo sistema.
          </p>
        </div>
        <div className="grid gap-2 px-5 py-5 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const selected = prefs.theme === option.id
            return (
              <label
                key={option.id}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                  selected
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-ui-border bg-white text-slate-700 hover:bg-surface-soft'
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  checked={selected}
                  onChange={() => update({ theme: option.id })}
                />
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Navegacao</h2>
        </div>
        <div className="px-5 py-5">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-slate-800">Mostrar Inbox</span>
              <span className="mt-0.5 block text-xs text-slate-400">
                Quando ocultado, os itens da Inbox (sem pasta e sem data, alem de notas soltas)
                aparecem na tela Hoje.
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand-600"
              checked={prefs.showInbox}
              onChange={(e) => toggleNavItem('inbox', e.target.checked)}
            />
          </label>
        </div>
      </div>

      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Tela Hoje</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Ajuste como eventos do calendario aparecem no resumo do dia.
          </p>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-slate-800">
              Ocultar eventos passados apos
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              Eventos encerrados somem depois desse numero de horas.
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={prefs.todayCalendarHidePastAfterHours}
                onChange={(event) =>
                  update({
                    todayCalendarHidePastAfterHours: Number(event.target.value),
                  })
                }
                className="h-10 w-24 rounded-lg border border-ui-border bg-white px-3 text-sm text-navy-900 outline-none focus:border-brand-300"
              />
              <span className="text-sm text-slate-500">horas</span>
            </div>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">
              Mostrar eventos de amanha apos
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              Depois desse horario, a tela Hoje inclui eventos do dia seguinte.
            </span>
            <input
              type="time"
              value={prefs.todayCalendarShowTomorrowAfterTime}
              onChange={(event) =>
                update({
                  todayCalendarShowTomorrowAfterTime: event.target.value,
                })
              }
              className="mt-2 h-10 w-32 rounded-lg border border-ui-border bg-white px-3 text-sm text-navy-900 outline-none focus:border-brand-300"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Calendario</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Ajuste a organizacao da grade mensal e a criacao de eventos.
          </p>
        </div>
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-3">
          <div>
            <span className="block text-sm font-medium text-slate-800">
              Primeiro dia da semana
            </span>
            <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
              {[
                { value: 'monday' as const, label: 'Segunda' },
                { value: 'sunday' as const, label: 'Domingo' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update({ calendarWeekStartsOn: option.value })}
                  className={`h-10 rounded-lg border px-3 text-sm font-semibold ${
                    prefs.calendarWeekStartsOn === option.value
                      ? 'border-brand-200 bg-brand-50 text-navy-900'
                      : 'border-ui-border bg-white text-navy-500 hover:bg-surface-soft'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">Calendario padrao</span>
            <select
              value={prefs.defaultCalendarId}
              onChange={(event) => update({ defaultCalendarId: event.target.value })}
              className="mt-2 h-10 w-full rounded-lg border border-ui-border bg-white px-3 text-sm text-navy-900 outline-none focus:border-brand-300"
            >
              <option value="primary">Principal</option>
              {writableCalendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">Duracao padrao</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={prefs.defaultCalendarEventDurationMinutes}
                onChange={(event) =>
                  update({
                    defaultCalendarEventDurationMinutes: Number(event.target.value),
                  })
                }
                className="h-10 w-24 rounded-lg border border-ui-border bg-white px-3 text-sm text-navy-900 outline-none focus:border-brand-300"
              />
              <span className="text-sm text-slate-500">min</span>
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Menu</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Escolha quais itens aparecem no menu do app e em que ordem. No celular, o botao +
                de captura fica sempre no centro.
              </p>
            </div>
            <button
              type="button"
              onClick={applyRecommendedMobileNav}
              className="h-8 rounded-lg border border-ui-border bg-white px-3 text-xs font-medium text-navy-600 hover:bg-surface-soft"
            >
              Usar ordem app
            </button>
          </div>
        </div>
        <ul className="divide-y divide-ui-border-soft">
          {prefs.mobileNav.map((entry, index) => {
            const isFirst = index === 0
            const isLast = index === prefs.mobileNav.length - 1
            return (
              <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveNavItem(entry.id, -1)}
                    disabled={isFirst}
                    aria-label="Mover para cima"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNavItem(entry.id, 1)}
                    disabled={isLast}
                    aria-label="Mover para baixo"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium text-slate-800">
                  {MOBILE_NAV_LABELS[entry.id]}
                </span>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <span>{entry.visible ? 'Visivel' : 'Oculto'}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={entry.visible}
                    onChange={(e) => toggleNavItem(entry.id, e.target.checked)}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function TagsSection() {
  const { items } = useItems()
  const counts = new Map<string, number>()
  for (const item of items) {
    if (item.status === 'archived') continue
    for (const tag of item.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  const tags = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))

  return (
    <section className="divide-y divide-ui-border-soft rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700">Tags</h2>
        <p className="mt-0.5 text-xs text-slate-400">Tags coletadas dos seus itens ativos.</p>
      </div>
      <div className="px-5 py-5">
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma tag em uso.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(([tag, count]) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ui-border bg-white px-3 py-1 text-[12px] text-navy-700 hover:bg-surface-soft"
              >
                <span>#{tag}</span>
                <span className="font-mono text-[10px] text-navy-300">{count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function AiSection() {
  const [agentsOpen, setAgentsOpen] = useState(false)

  return (
    <section className="divide-y divide-ui-border-soft rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700">AGENTS.md global</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Instrucoes globais do seu workspace local. O CLI baixa este conteudo como
          AGENTS.local.md, complementando o AGENTS.md padrao gerado pelo app.
        </p>
      </div>
      <div className="px-5 py-5">
        <button
          type="button"
          onClick={() => setAgentsOpen(true)}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Editar AGENTS.md global
        </button>
      </div>
      <AgentsEditorModal
        folderId={null}
        title="AGENTS.md global"
        open={agentsOpen}
        onClose={() => setAgentsOpen(false)}
      />
    </section>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return TABS.some((item) => item.id === tab) ? (tab as Tab) : 'profile'
  }, [searchParams])
  const [tab, setTab] = useState<Tab>(initialTab)
  const { toast: addToast } = useToast()
  const [account, setAccount] = useState<GoogleAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [pushBusy, setPushBusy] = useState<'enable' | 'disable' | 'test' | null>(null)
  const push = usePushNotifications()
  const { confirm } = useDialog()

  useEffect(() => setTab(initialTab), [initialTab])

  useEffect(() => {
    fetch('/api/google/account')
      .then((r) => r.json())
      .then((d) => setAccount(d.account ?? null))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false))

    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      addToast('Google Calendar conectado com sucesso!', 'success')
      window.history.replaceState({}, '', '/settings?tab=integrations')
      setTab('integrations')
    } else if (params.get('google') === 'config-error') {
      addToast('Google Calendar nao esta configurado no servidor.', 'error')
      window.history.replaceState({}, '', '/settings?tab=integrations')
      setTab('integrations')
    } else if (params.get('google') === 'error') {
      const reason = params.get('google_error')
      const message =
        reason === 'access_denied'
          ? 'Permissao do Google negada.'
          : reason === 'missing-code-or-state'
            ? 'Retorno do Google incompleto. Tente conectar novamente.'
            : reason === 'redirect_uri_mismatch'
              ? 'Callback do Google diferente do cadastrado. Verifique GOOGLE_REDIRECT_URI ou NEXTAUTH_URL.'
              : reason === 'invalid_grant'
                ? 'Codigo do Google expirado ou ja usado. Tente conectar novamente.'
                : 'Erro ao conectar com o Google.'
      addToast(message, 'error')
      window.history.replaceState({}, '', '/settings?tab=integrations')
      setTab('integrations')
    }
  }, [addToast])

  function selectTab(next: Tab) {
    setTab(next)
    window.history.replaceState({}, '', `/settings?tab=${next}`)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncGoogleCalendar()
      addToast(`${result.synced} evento(s) sincronizados, ${result.removed} removidos.`, 'success')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    const ok = await confirm({
      title: 'Desconectar Google Calendar',
      message: 'Os eventos salvos serao removidos.',
      confirmLabel: 'Desconectar',
      variant: 'danger',
    })
    if (!ok) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/google/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao desconectar')
      setAccount(null)
      addToast('Google Calendar desconectado.', 'info')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao desconectar', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleEnablePush() {
    setPushBusy('enable')
    try {
      await push.enable()
      addToast('Notificacoes ativadas.', 'success')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao ativar notificacoes', 'error')
    } finally {
      setPushBusy(null)
    }
  }

  async function handleDisablePush() {
    setPushBusy('disable')
    try {
      await push.disable()
      addToast('Notificacoes desativadas.', 'info')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao desativar notificacoes', 'error')
    } finally {
      setPushBusy(null)
    }
  }

  async function handleTestPush() {
    setPushBusy('test')
    try {
      const result = await push.sendTest()
      const missed = result.invalid + result.failed
      if (result.sent > 0 && missed > 0) {
        addToast(
          `Teste enviado para ${result.sent} dispositivo(s); ${missed} falhou/falharam.`,
          'info',
        )
      } else if (result.sent > 0) {
        addToast(`Teste enviado para ${result.sent} dispositivo(s).`, 'success')
      } else if (missed > 0) {
        addToast(`Nenhum dispositivo recebeu o teste; ${missed} falhou/falharam.`, 'error')
      } else {
        addToast('Nenhum dispositivo ativo recebeu o teste.', 'info')
      }
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao enviar teste', 'error')
    } finally {
      setPushBusy(null)
    }
  }

  const pushSupported = push.support !== 'unsupported'
  const needsIosInstall = push.support === 'needs-install-ios'
  const pushConfigured = push.status?.configured ?? true
  const pushSubscribed = Boolean(push.status?.currentDeviceEnabled)

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-3 lg:pb-4">
      <div className="mb-4 border-b border-ui-border-soft pb-2">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-soft text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'profile' && <ProfileSection />}

      {tab === 'integrations' && (
        <section className="divide-y divide-ui-border-soft rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Google Calendar</h2>
          </div>

          <div className="px-5 py-5">
            {loading ? (
              <div className="h-10 w-48 animate-pulse rounded bg-slate-100" />
            ) : account ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{account.email}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Conectado em{' '}
                    {new Date(account.connectedAt).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        account.hasCalendar
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {account.hasCalendar ? '✓' : '○'} Calendar
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        account.hasDrive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {account.hasDrive ? '✓' : '○'} Drive
                    </span>
                  </div>
                  {!account.hasDrive ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Drive ainda não autorizado.{' '}
                      <a href="/api/google" className="underline hover:no-underline">
                        Reconectar para habilitar anexos
                      </a>
                      .
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {disconnecting ? 'Desconectando...' : 'Desconectar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-600">Nenhuma conta conectada.</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Conecte para ver seus eventos do Google Calendar na visão Hoje e Calendário.
                  </p>
                </div>
                <a
                  href="/api/google"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Conectar com Google
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="divide-y divide-ui-border-soft rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Notificacoes</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {pushSubscribed
                    ? 'Notificacoes ativas neste dispositivo'
                    : 'Notificacoes desativadas neste dispositivo'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {push.status?.activeDeviceCount ?? 0} dispositivo(s) ativo(s) na sua conta.
                </p>
                {!pushConfigured ? (
                  <p className="mt-2 text-xs text-red-500">
                    Web Push nao esta configurado no servidor.
                  </p>
                ) : null}
                {!pushSupported ? (
                  <p className="mt-2 text-xs text-red-500">
                    Este navegador nao suporta notificacoes push.
                  </p>
                ) : null}
                {needsIosInstall ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No iPhone, abra no Safari, toque em Compartilhar, escolha Adicionar a Tela de
                    Inicio e abra pelo icone instalado.
                  </p>
                ) : null}
                {push.support === 'denied' ? (
                  <p className="mt-2 text-xs text-red-500">
                    A permissão foi bloqueada no navegador. Altere nas configurações do site.
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                {pushSubscribed ? (
                  <>
                    <button
                      onClick={handleTestPush}
                      disabled={pushBusy !== null || !pushConfigured}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                      {pushBusy === 'test' ? 'Enviando...' : 'Enviar teste'}
                    </button>
                    <button
                      onClick={handleDisablePush}
                      disabled={pushBusy !== null}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {pushBusy === 'disable' ? 'Desativando...' : 'Desativar'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEnablePush}
                    disabled={
                      pushBusy !== null ||
                      push.isLoading ||
                      !pushConfigured ||
                      !pushSupported ||
                      needsIosInstall ||
                      push.support === 'denied'
                    }
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {pushBusy === 'enable' ? 'Ativando...' : 'Ativar notificacoes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'sync' && (
        <section className="divide-y divide-ui-border-soft rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Agente de Sincronizacao</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Sincronize seus itens como arquivos Markdown via CLI{' '}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">doit-sync</code>.
              Edite manualmente ou peca pra uma IA reorganizar; aprove as mudancas em{' '}
              <button
                type="button"
                onClick={() => selectTab('audit')}
                className="font-medium text-brand-600 hover:underline"
              >
                Auditoria
              </button>
              .
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="mb-2 text-sm font-medium text-slate-700">1. Gere um token CLI</p>
            <p className="mb-3 text-xs text-slate-500">
              Va para{' '}
              <button
                type="button"
                onClick={() => selectTab('cli')}
                className="font-medium text-brand-600 hover:underline"
              >
                Configurações &rarr; CLI
              </button>{' '}
              e crie um novo token.
            </p>
            <p className="mb-2 text-sm font-medium text-slate-700">
              2. Instale a CLI no seu computador
            </p>
            <div className="mb-3 space-y-1 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-200">
              <p>npm install -g doit-sync</p>
            </div>
            <p className="mb-2 text-sm font-medium text-slate-700">3. Inicialize e autentique</p>
            <div className="mb-3 space-y-1 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-200">
              <p>doit-sync init</p>
              <p>doit-sync login</p>
            </div>
            <p className="mb-2 text-sm font-medium text-slate-700">4. Baixe e edite</p>
            <div className="mb-3 space-y-1 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-200">
              <p>
                <span className="text-slate-500">#</span> baixa pastas + itens como .md
              </p>
              <p>doit-sync pull</p>
              <p className="pt-1">
                <span className="text-slate-500">#</span> edite os .md (ou peca pra uma IA seguir o
                AGENTS.md)
              </p>
              <p className="pt-1">
                <span className="text-slate-500">#</span> detecta mudancas e envia para Auditoria
              </p>
              <p>doit-sync diff</p>
              <p className="pt-1">
                <span className="text-slate-500">#</span> aprove em Auditoria, depois:
              </p>
              <p>doit-sync push</p>
            </div>
            <p className="text-xs text-slate-400">
              O comando{' '}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">init</code> cria um{' '}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">AGENTS.md</code> na
              raiz com as regras que sua IA deve seguir ao reorganizar os arquivos.
            </p>
          </div>
        </section>
      )}

      {tab === 'appearance' && <AppearanceSection />}
      {tab === 'ai' && <AiSection />}
      {tab === 'cli' && <CliTokensSection />}
      {tab === 'tags' && <TagsSection />}
      {tab === 'shortcuts' && <ShortcutsSection />}
      {tab === 'archive' && <ArchiveSection />}
      {tab === 'audit' && <AuditSection />}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-4xl p-6 text-sm text-slate-400">Carregando...</div>}
    >
      <SettingsContent />
    </Suspense>
  )
}
