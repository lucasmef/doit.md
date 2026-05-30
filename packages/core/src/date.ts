export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function nextLocalWeekday(date: Date, targetDay: number, minimumDays = 1): Date {
  const next = new Date(date)
  let days = (targetDay - next.getDay() + 7) % 7
  if (days < minimumDays) days += 7
  next.setDate(next.getDate() + days)
  return next
}

export function nextMondayOfNextWeek(date: Date = new Date()): Date {
  return nextLocalWeekday(date, 1)
}

export function nextMondayOfNextWeekKey(date: Date = new Date()): string {
  return toLocalDateKey(nextMondayOfNextWeek(date))
}
