export type CalendarEvent = {
  id: string
  userId: string

  title: string
  description?: string

  start: string
  end: string
  allDay: boolean

  source: 'local' | 'google'

  googleCalendarId?: string
  googleEventId?: string

  linkedItemIds: string[]

  createdAt: string
  updatedAt: string
}

export type GoogleCalendar = {
  id: string
  summary: string
  primary: boolean
  accessRole?: string
  backgroundColor?: string
}
