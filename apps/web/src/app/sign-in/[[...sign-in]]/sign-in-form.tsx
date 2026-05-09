'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FormEvent, useState } from 'react'

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return '/today'

  try {
    const url = new URL(callbackUrl, 'http://doit.local')
    url.searchParams.delete('email')
    url.searchParams.delete('password')

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/today'
  }
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    setLoading(false)
    if (!result?.ok || result.error) {
      setError('Email ou senha invalidos.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <form
        onSubmit={onSubmit}
        method="post"
        className="w-full max-w-sm rounded-lg border border-ui-border bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-950">Entrar no doit.md</h1>
        <div className="mt-6 space-y-4">
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
              autoComplete="current-password"
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
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Sem conta?{' '}
          <Link className="font-medium text-brand-700 hover:text-brand-800" href="/sign-up">
            Criar conta
          </Link>
        </p>
      </form>
    </main>
  )
}
