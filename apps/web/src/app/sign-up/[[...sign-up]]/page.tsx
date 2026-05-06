'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FormEvent, useState } from 'react'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email,
        password,
      }),
    })

    if (!response.ok) {
      const data = (await response.json()) as { error?: string }
      setLoading(false)
      setError(data.error ?? 'Nao foi possivel criar a conta.')
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/today',
    })

    setLoading(false)
    if (result?.error) {
      router.push('/sign-in')
      return
    }
    router.push('/today')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-ui-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Criar conta</h1>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Nome
            <input
              name="name"
              type="text"
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Ja tem conta?{' '}
          <Link className="font-medium text-brand-700 hover:text-brand-800" href="/sign-in">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  )
}
