'use client'

import useSWR, { mutate } from 'swr'

type NotificationAlert = {
  id: string
  title: string
  message: string
  createdAt: string
  deliveryStatus: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

async function acknowledge(all: boolean, id?: string) {
  await fetch('/api/notifications/failures', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(all ? { all: true } : { id }),
  })
  await mutate('/api/notifications/failures')
}

export function NotificationFailureBanner() {
  const { data } = useSWR<{ alerts: NotificationAlert[] }>('/api/notifications/failures', fetcher)
  const alerts = data?.alerts ?? []
  const alert = alerts[0]
  if (!alert) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{alert.title}</p>
          <p className="truncate text-xs text-amber-800">
            {alert.message}
            {alerts.length > 1 ? ` Mais ${alerts.length - 1} aviso(s) pendente(s).` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {alerts.length > 1 && (
            <button
              type="button"
              onClick={() => acknowledge(true)}
              className="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Dispensar todos
            </button>
          )}
          <button
            type="button"
            onClick={() => acknowledge(false, alert.id)}
            className="rounded-md bg-amber-900 px-2 py-1 text-xs font-medium text-white hover:bg-amber-950"
          >
            Dispensar
          </button>
        </div>
      </div>
    </div>
  )
}
