import fs from 'fs'

// Fix today/page.tsx
const todayFile = 'apps/web/src/app/(app)/today/page.tsx'
let todayContent = fs.readFileSync(todayFile, 'utf8')

// Move declarations up
const tagsInListStr = `  // ID 053: tags presentes na lista atualmente exibida (para servir de filtro).
  const tagsInList = useMemo(() => {
    const set = new Set<string>()
    const baseList = currentView === 'inbox' ? inboxItems : currentView === 'upcoming' ? upcomingItems : dayItems
    for (const it of baseList) for (const t of it.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dayItems, inboxItems, upcomingItems, currentView])`

const itemsDeclarationsStr = `  const inboxItems = useMemo(() => items.filter((i) => i.status === 'inbox'), [items])
  const upcomingItems = useMemo(() => items.filter((i) => i.dueDate && i.dueDate > today && i.status !== 'done').sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')), [items, today])`

todayContent = todayContent.replace(tagsInListStr, '')
todayContent = todayContent.replace(itemsDeclarationsStr, itemsDeclarationsStr + '\n\n' + tagsInListStr)

fs.writeFileSync(todayFile, todayContent, 'utf8')

// Fix notas/page.tsx
const notasFile = 'apps/web/src/app/(app)/notas/page.tsx'
let notasContent = fs.readFileSync(notasFile, 'utf8')

notasContent = notasContent.replace(
  `const { items, updateItem } = useItems()`,
  `const { items } = useItems()`
)

notasContent = notasContent.replace(
  `import { bulkUpdateItems, useItems } from '@/hooks/use-items'`,
  `import { bulkUpdateItems, useItems, updateItem } from '@/hooks/use-items'`
)

fs.writeFileSync(notasFile, notasContent, 'utf8')
console.log('Fixed typescript errors.')
