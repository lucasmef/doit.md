import fs from 'fs'

const file = 'apps/web/src/app/(app)/notas/page.tsx'
let content = fs.readFileSync(file, 'utf8')

// Add onToggle to ContentCard
content = content.replace(
  'function ContentCard({ item, onOpen }: { item: Item; onOpen: (id: string) => void }) {',
  'function ContentCard({ item, onOpen, onToggle }: { item: Item; onOpen: (id: string) => void; onToggle?: (id: string, next: ItemStatus) => void }) {'
)

const cardGlyphMatch = `<span className={\`flex h-7 w-7 shrink-0 items-center justify-center rounded-[11px] \${itemGlyphTone(item)}\`}>
          <ItemTypeGlyph item={item} className="h-4 w-4" />
        </span>`

const cardGlyphReplace = `<div 
          role="button"
          onClick={(e) => {
            if (item.complexity === 'task' && onToggle) {
              e.stopPropagation()
              onToggle(item.id, item.status === 'done' ? 'todo' : 'done')
            }
          }}
          className={\`flex h-7 w-7 shrink-0 items-center justify-center rounded-[11px] \${itemGlyphTone(item)} \${item.complexity === 'task' ? 'cursor-pointer hover:opacity-80' : ''}\`}
        >
          <ItemTypeGlyph item={item} className="h-4 w-4" />
        </div>`
content = content.replace(cardGlyphMatch, cardGlyphReplace)

// Add onToggle to ContentRow
content = content.replace(
  'function ContentRow({ item, onOpen }: { item: Item; onOpen: (id: string) => void }) {',
  'function ContentRow({ item, onOpen, onToggle }: { item: Item; onOpen: (id: string) => void; onToggle?: (id: string, next: ItemStatus) => void }) {'
)

const rowGlyphMatch = `<span className={\`grid h-[34px] w-[34px] place-items-center rounded-[13px] \${itemGlyphTone(item)}\`}>
        <ItemTypeGlyph item={item} className="h-4 w-4" />
      </span>`

const rowGlyphReplace = `<div 
        role="button"
        onClick={(e) => {
          if (item.complexity === 'task' && onToggle) {
            e.stopPropagation()
            onToggle(item.id, item.status === 'done' ? 'todo' : 'done')
          }
        }}
        className={\`grid h-[34px] w-[34px] place-items-center rounded-[13px] \${itemGlyphTone(item)} \${item.complexity === 'task' ? 'cursor-pointer hover:opacity-80' : ''}\`}
      >
        <ItemTypeGlyph item={item} className="h-4 w-4" />
      </div>`
content = content.replace(rowGlyphMatch, rowGlyphReplace)


// Add updateItem and handleToggleDone to NotasBrowser
content = content.replace(
  'const { items } = useItems()',
  'const { items, updateItem } = useItems()'
)

const handleOpenItem = `  function handleOpenItem(id: string) {`
const handleToggleDone = `  async function handleToggleDone(id: string, next: ItemStatus) {
    try {
      await updateItem(id, { status: next })
    } catch (err) {
      console.error(err)
    }
  }

  function handleOpenItem(id: string) {`
content = content.replace(handleOpenItem, handleToggleDone)

// Pass onToggle in NotasBrowser
content = content.replace(
  '<ContentCard key={item.id} item={item} onOpen={handleOpenItem} />',
  '<ContentCard key={item.id} item={item} onOpen={handleOpenItem} onToggle={handleToggleDone} />'
)
content = content.replace(
  '<ContentRow key={item.id} item={item} onOpen={handleOpenItem} />',
  '<ContentRow key={item.id} item={item} onOpen={handleOpenItem} onToggle={handleToggleDone} />'
)

fs.writeFileSync(file, content, 'utf8')
console.log('Modifications for toggle completed.')
