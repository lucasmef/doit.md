import type { Item } from '@doit/types'

function isPrioritized(item: Item) {
  return typeof item.priority === 'number' && item.priority >= 1 && item.priority <= 3
}

function priorityRank(item: Item) {
  return isPrioritized(item) ? item.priority ?? 4 : 4
}

function dateTimeKey(item: Item) {
  const date = item.dueDate ?? item.scheduledDate ?? '9999-12-31'
  const time = item.dueTime ?? '99:99'
  return `${date}T${time}`
}

function newestFirst(a: Item, b: Item) {
  const created = b.createdAt.localeCompare(a.createdAt)
  if (created !== 0) return created
  return b.updatedAt.localeCompare(a.updatedAt)
}

export function isLooseInboxItem(item: Item) {
  return !item.folderId && !item.dueDate && !item.scheduledDate
}

export function sortForcedItemOrder(items: Item[]) {
  return [...items].sort((a, b) => {
    const priorityGroup = Number(!isPrioritized(a)) - Number(!isPrioritized(b))
    if (priorityGroup !== 0) return priorityGroup

    if (isPrioritized(a) || isPrioritized(b)) {
      const priority = priorityRank(a) - priorityRank(b)
      if (priority !== 0) return priority
    }

    const dateTime = dateTimeKey(a).localeCompare(dateTimeKey(b))
    if (dateTime !== 0) return dateTime

    return newestFirst(a, b)
  })
}

export function sortTodayWithInboxBelow(todayItems: Item[], inboxItems: Item[]) {
  return [...sortForcedItemOrder(todayItems), ...sortForcedItemOrder(inboxItems)]
}
