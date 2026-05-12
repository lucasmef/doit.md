'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { SignOutButton } from '@/components/auth/sign-out-button'

type Profile = {
  email: string
  name: string
}

export function ProfileSection() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        const next = data.profile as Profile | undefined
        if (next) {
          setProfile(next)
          setName(next.name)
        }
      })
      .catch(() => toast('Erro ao carregar perfil.', 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const body: Record<string, string> = { name }
      if (currentPassword || newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao salvar perfil')
      setProfile(data.profile)
      setCurrentPassword('')
      setNewPassword('')
      toast('Perfil atualizado.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar perfil.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
      <div className="border-b border-ui-border-soft px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700">Perfil</h2>
      </div>

      <div className="space-y-5 px-5 py-5">
        <label className="block">
          <span className="text-[13px] font-medium text-slate-500">Email</span>
          <input
            value={profile?.email ?? ''}
            disabled
            className="mt-1 h-10 w-full rounded-lg border border-ui-border-soft bg-slate-50 px-3 text-sm text-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-slate-500">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-ui-border-soft bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-slate-500">Senha atual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 h-10 w-full rounded-lg border border-ui-border-soft bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-slate-500">Nova senha</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-ui-border-soft bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <SignOutButton className="h-10 px-4 text-sm" />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </div>
      </div>
    </form>
  )
}
