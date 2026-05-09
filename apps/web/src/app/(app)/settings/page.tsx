'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { syncGoogleCalendar } from '@/hooks/use-calendar-events'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { ArchiveSection } from '@/components/archive/archive-section'
import { AuditSection } from '@/components/audit/audit-section'
import { ProfileSection } from '@/components/settings/profile-section'

interface GoogleAccount {
  email: string
  connectedAt: string
}

type Tab = 'profile' | 'integrations' | 'notifications' | 'sync' | 'archive' | 'audit'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profile', label: 'Perfil' },
  { id: 'integrations', label: 'Integracoes' },
  { id: 'notifications', label: 'Notificacoes' },
  { id: 'sync', label: 'Sync' },
  { id: 'archive', label: 'Arquivo' },
  { id: 'audit', label: 'Auditoria' },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return TABS.some((item) => item.id === tab) ? tab as Tab : 'profile'
  }, [searchParams])
  const [tab, setTab] = useState<Tab>(initialTab)
  const { toast: addToast } = useToast()
  const [account, setAccount] = useState<GoogleAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [pushBusy, setPushBusy] = useState<'enable' | 'disable' | 'test' | null>(null)
  const push = usePushNotifications()

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
      addToast('Erro ao conectar Google Calendar.', 'error')
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
      addToast(`${result.synced} evento(s) sincronizados.`, 'success')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Erro ao sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar Google Calendar? Os eventos salvos serao removidos.')) return
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
        addToast(`Teste enviado para ${result.sent} dispositivo(s); ${missed} falhou/falharam.`, 'info')
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
                    Conecte para ver seus eventos do Google Calendar na visao Hoje e Calendario.
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
                  {pushSubscribed ? 'Notificacoes ativas neste dispositivo' : 'Notificacoes desativadas neste dispositivo'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {push.status?.activeDeviceCount ?? 0} dispositivo(s) ativo(s) na sua conta.
                </p>
                {!pushConfigured ? <p className="mt-2 text-xs text-red-500">Web Push nao esta configurado no servidor.</p> : null}
                {!pushSupported ? <p className="mt-2 text-xs text-red-500">Este navegador nao suporta notificacoes push.</p> : null}
                {needsIosInstall ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No iPhone, abra no Safari, toque em Compartilhar, escolha Adicionar a Tela de Inicio e abra pelo icone instalado.
                  </p>
                ) : null}
                {push.support === 'denied' ? (
                  <p className="mt-2 text-xs text-red-500">A permissao foi bloqueada no navegador. Altere nas configuracoes do site.</p>
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
                    disabled={pushBusy !== null || push.isLoading || !pushConfigured || !pushSupported || needsIosInstall || push.support === 'denied'}
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
          </div>
          <div className="px-5 py-5">
            <p className="mb-3 text-sm text-slate-600">
              Use o CLI <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">doit-sync</code> para sincronizar itens via arquivos Markdown.
            </p>
            <div className="space-y-1 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-200">
              <p><span className="text-slate-500">#</span> instalar</p>
              <p>npm install -g doit-sync</p>
              <p className="pt-1"><span className="text-slate-500">#</span> configurar</p>
              <p>doit-sync init</p>
              <p className="pt-1"><span className="text-slate-500">#</span> sincronizar</p>
              <p>doit-sync pull && doit-sync diff && doit-sync push</p>
            </div>
          </div>
        </section>
      )}

      {tab === 'archive' && <ArchiveSection />}
      {tab === 'audit' && <AuditSection />}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl p-6 text-sm text-slate-400">Carregando...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
