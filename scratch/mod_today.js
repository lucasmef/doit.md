import fs from 'fs'

const file = 'apps/web/src/app/(app)/today/page.tsx'
let content = fs.readFileSync(file, 'utf8')

// 1. Add currentView state
content = content.replace(
  'const [selectedDay, setSelectedDay] = useState(today)',
  `const [selectedDay, setSelectedDay] = useState(today)
  const [currentView, setCurrentView] = useState<'hoje' | 'inbox' | 'upcoming'>('hoje')`
)

// 2. Update selectDay to setCurrentView('hoje')
content = content.replace(
  `function selectDay(date: string) {
    setSelectedDay(date)
    setActiveTag(null)`,
  `function selectDay(date: string) {
    setSelectedDay(date)
    setActiveTag(null)
    setCurrentView('hoje')`
)

// 3. Define inboxItems, upcomingItems and displayed arrays
content = content.replace(
  `const visibleItems = useMemo(
    () => (activeTag ? dayItems.filter(i => i.tags.includes(activeTag)) : dayItems),
    [dayItems, activeTag],
  )`,
  `const visibleItems = useMemo(
    () => (activeTag ? dayItems.filter(i => i.tags.includes(activeTag)) : dayItems),
    [dayItems, activeTag],
  )

  const inboxItems = useMemo(() => items.filter((i) => i.status === 'inbox'), [items])
  const upcomingItems = useMemo(() => items.filter((i) => i.dueDate && i.dueDate > today && i.status !== 'done').sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')), [items, today])

  const displayedItems = currentView === 'inbox' ? (activeTag ? inboxItems.filter(i => i.tags.includes(activeTag)) : inboxItems) : currentView === 'upcoming' ? (activeTag ? upcomingItems.filter(i => i.tags.includes(activeTag)) : upcomingItems) : visibleItems;
  const displayedEvents = currentView === 'hoje' ? dayEvents : [];`
)

// Fix tagsInList to use displayedItems so the filter works for Inbox/Upcoming as well
content = content.replace(
  `const tagsInList = useMemo(() => {
    const set = new Set<string>()
    for (const it of dayItems) for (const t of it.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dayItems])`,
  `const tagsInList = useMemo(() => {
    const set = new Set<string>()
    const baseList = currentView === 'inbox' ? inboxItems : currentView === 'upcoming' ? upcomingItems : dayItems
    for (const it of baseList) for (const t of it.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dayItems, inboxItems, upcomingItems, currentView])`
)

// Replace listEmpty
content = content.replace(
  `const listEmpty = dayEvents.length === 0 && visibleItems.length === 0`,
  `const listEmpty = displayedItems.length === 0 && displayedEvents.length === 0
  const currentHeading = currentView === 'inbox' ? 'Inbox' : currentView === 'upcoming' ? 'Próximos' : headingLabel
  const currentSub = currentView === 'inbox' ? 'Itens não processados' : currentView === 'upcoming' ? 'Tarefas futuras' : selectedLabel`
)

// Replace headingLabel and selectedLabel with currentHeading and currentSub
content = content.replace(
  `<span>{isToday ? 'Hoje' : headingLabel}</span>`,
  `<span>{currentView === 'hoje' ? (isToday ? 'Hoje' : headingLabel) : currentHeading}</span>`
)
content = content.replace(
  `<h1>{headingLabel}</h1>`,
  `<h1>{currentHeading}</h1>`
)
content = content.replace(
  `<span>{selectedLabel}</span>`,
  `<span>{currentSub}</span>`
)

// Replace mapping of list
content = content.replace(
  `{dayEvents.map(renderEvent)}
                  {visibleItems.map(item => renderTask(item, item.dueDate ? item.dueDate < today : false))}`,
  `{displayedEvents.map(renderEvent)}
                  {displayedItems.map(item => renderTask(item, item.dueDate ? item.dueDate < today : false))}`
)

// Replace sidebar navigation links
content = content.replace(
  `<Link href="/inbox" className="side-row cursor-pointer">`,
  `<button type="button" onClick={() => { setCurrentView('inbox'); setActiveTag(null); }} className={\`side-row cursor-pointer\${currentView === 'inbox' ? ' active' : ''}\`}>`
)
content = content.replace(
  `</Link>
            <button
              type="button"
              onClick={() => selectDay(today)}`,
  `</button>
            <button
              type="button"
              onClick={() => selectDay(today)}`
)

content = content.replace(
  `className={\`side-row cursor-pointer\${isToday ? ' active' : ''}\`}`,
  `className={\`side-row cursor-pointer\${isToday && currentView === 'hoje' ? ' active' : ''}\`}`
)

content = content.replace(
  `<Link href="/upcoming" className="side-row cursor-pointer">`,
  `<button type="button" onClick={() => { setCurrentView('upcoming'); setActiveTag(null); }} className={\`side-row cursor-pointer\${currentView === 'upcoming' ? ' active' : ''}\`}>`
)
content = content.replace(
  `</Link>
          </nav>`,
  `</button>
          </nav>`
)

// Update empty state text
content = content.replace(
  `activeTag ? \`Nenhum item com #\${activeTag}.\` : isToday ? 'Tudo limpo por hoje!' : 'Nada neste dia.'`,
  `activeTag ? \`Nenhum item com #\${activeTag}.\` : currentView === 'inbox' ? 'Inbox vazia!' : currentView === 'upcoming' ? 'Nada programado.' : isToday ? 'Tudo limpo por hoje!' : 'Nada neste dia.'`
)

// Reagendar overdue só aparece no hoje
content = content.replace(
  `{overdueItems.length > 0 && (`,
  `{currentView === 'hoje' && overdueItems.length > 0 && (`
)

fs.writeFileSync(file, content, 'utf8')
console.log('Today page refactored for view states.')
