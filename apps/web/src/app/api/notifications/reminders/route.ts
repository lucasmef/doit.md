import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ItemModel, NotificationAlertModel, PushSubscriptionModel, UserModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import { isPushConfigured, sendPush } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Row = Record<string, unknown>

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isOpenTask(item: Row): boolean {
  const status = String(item['status'] ?? '')
  const complexity = String(item['complexity'] ?? '')
  return complexity !== 'note' && status !== 'done' && status !== 'archived'
}

function scheduledInstant(item: Row): Date | null {
  const dueDate = typeof item['dueDate'] === 'string' ? item['dueDate'] : ''
  const dueTime = typeof item['dueTime'] === 'string' ? item['dueTime'] : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{2}:\d{2}$/.test(dueTime)) return null
  const date = new Date(`${dueDate}T${dueTime}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function reminderPayload(item: Row, scheduledFor: string) {
  const title = String(item['title'] ?? 'Tarefa')
  return {
    title: 'Lembrete doit.md',
    body: `${title} vence agora.`,
    url: `/today?item=${encodeURIComponent(String(item['_id']))}`,
    tag: `due-${String(item['_id'])}-${scheduledFor}`,
    renotify: true,
  }
}

async function createDeliveryRecord(input: {
  userId: string
  itemId: string
  channel: string
  title: string
  message: string
  severity: string
  scheduledFor: string
  deliveryStatus: string
  acknowledgedAt?: string
}) {
  const existing = await NotificationAlertModel.findOne({
    userId: input.userId,
    itemId: input.itemId,
    type: 'due-reminder',
    scheduledFor: input.scheduledFor,
  }).lean()
  if (existing) return false

  await NotificationAlertModel.create({
    _id: `nalt_${randomUUID()}`,
    userId: input.userId,
    itemId: input.itemId,
    type: 'due-reminder',
    channel: input.channel,
    title: input.title,
    message: input.message,
    severity: input.severity,
    scheduledFor: input.scheduledFor,
    deliveryStatus: input.deliveryStatus,
    createdAt: new Date().toISOString(),
    acknowledgedAt: input.acknowledgedAt,
  })
  return true
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env['CRON_SECRET']
  if (!secret) return false
  const auth = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  return auth === `Bearer ${secret}` || cronSecret === secret
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) return unauthorized()
    if (!isPushConfigured() && !isEmailConfigured()) {
      return NextResponse.json({ error: 'No notification channel is configured' }, { status: 503 })
    }

    await ensureDB()
    const now = new Date()
    const lookAheadMinutes = Number(process.env['NOTIFICATION_LOOKAHEAD_MINUTES'] ?? 5)
    const end = new Date(now.getTime() + Math.max(1, lookAheadMinutes) * 60_000)
    const dueDates = Array.from(new Set([dateKey(now), dateKey(end)]))
    const rows = (
      await Promise.all(dueDates.map((dueDate) => ItemModel.find({ dueDate, dueTime: { $ne: null } }).lean()))
    ).flat() as Row[]

    const uniqueItems = Array.from(new Map(rows.map((row) => [String(row['_id']), row])).values())
    const dueItems = uniqueItems.filter((item) => {
      if (!isOpenTask(item)) return false
      const scheduled = scheduledInstant(item)
      return scheduled ? scheduled >= now && scheduled <= end : false
    })

    let reminded = 0
    let pushSent = 0
    let emailSent = 0
    let alertsCreated = 0

    for (const item of dueItems) {
      const itemId = String(item['_id'])
      const userId = String(item['userId'])
      const scheduled = scheduledInstant(item)
      if (!scheduled) continue
      const scheduledFor = scheduled.toISOString()
      const existing = await NotificationAlertModel.findOne({
        userId,
        itemId,
        type: 'due-reminder',
        scheduledFor,
      }).lean()
      if (existing) continue

      const subscriptions = (await PushSubscriptionModel.find({ userId, enabled: 1 }).lean()) as Row[]
      const payload = reminderPayload(item, scheduledFor)
      const pushResults = isPushConfigured()
        ? await Promise.all(subscriptions.map((subscription) => sendPush(subscription, payload)))
        : []
      const sentToPush = pushResults.filter((result) => result === 'sent').length
      pushSent += sentToPush
      reminded += 1

      if (sentToPush > 0) {
        await createDeliveryRecord({
          userId,
          itemId,
          channel: 'push',
          title: 'Notificacao enviada',
          message: `Lembrete enviado para "${String(item['title'] ?? 'Tarefa')}".`,
          severity: 'info',
          scheduledFor,
          deliveryStatus: 'push_sent',
          acknowledgedAt: new Date().toISOString(),
        })
        continue
      }

      const user = (await UserModel.findOne({ _id: userId }).lean()) as Row | null
      const email = typeof user?.['email'] === 'string' ? user['email'] : ''
      const title = String(item['title'] ?? 'Tarefa')
      const emailResult = email
        ? await sendEmail({
            to: email,
            subject: `Lembrete: ${title}`,
            text: `A tarefa "${title}" esta marcada para ${String(item['dueDate'])} ${String(item['dueTime'])}.`,
          })
        : 'failed'

      if (emailResult === 'sent') emailSent += 1
      const deliveryStatus =
        emailResult === 'sent' ? 'push_failed_email_sent' : `push_failed_email_${emailResult}`
      const created = await createDeliveryRecord({
        userId,
        itemId,
        channel: emailResult === 'sent' ? 'email' : 'push',
        title: 'Falha ao enviar notificacao push',
        message:
          emailResult === 'sent'
            ? `Nao consegui enviar push para "${title}". Enviei um email de fallback.`
            : `Nao consegui enviar push nem email para "${title}".`,
        severity: 'warning',
        scheduledFor,
        deliveryStatus,
      })
      if (created) alertsCreated += 1
    }

    return NextResponse.json({ checked: dueItems.length, reminded, pushSent, emailSent, alertsCreated })
  } catch (err) {
    console.error('[POST /api/notifications/reminders]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
