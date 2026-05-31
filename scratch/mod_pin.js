import fs from 'fs'

const file = 'apps/web/src/components/items/bulk-actions.tsx'
let content = fs.readFileSync(file, 'utf8')

if (!content.includes('import { usePreferences }')) {
  content = content.replace(
    'import { useFolders } from \'@/hooks/use-folders\'',
    'import { useFolders } from \'@/hooks/use-folders\'\nimport { usePreferences } from \'@/hooks/use-preferences\''
  )
}

if (!content.includes('const { prefs, update } = usePreferences()')) {
  content = content.replace(
    'const { closeContextMenu, setSingleSelection } = useUI()',
    `const { closeContextMenu, setSingleSelection } = useUI()
  const { prefs, update } = usePreferences()
  const isPinned = targetItem.complexity === 'note' && prefs.pinnedNoteIds?.includes(targetItem.id)

  function togglePinned() {
    const next = isPinned
      ? (prefs.pinnedNoteIds ?? []).filter((id) => id !== targetItem.id)
      : [targetItem.id, ...(prefs.pinnedNoteIds ?? [])]
    update({ pinnedNoteIds: next })
    closeContextMenu()
  }`
  )
}

if (!content.includes('togglePinned')) {
  // Just in case the previous replacement failed or something, we already added it.
}

const pinMenuRow = `        {targetItem.complexity === 'note' && (
          <MenuRow 
            icon={<span className="text-[14px]" style={{ color: isPinned ? '#B47410' : 'inherit' }}>★</span>} 
            label={isPinned ? 'Remover destaque' : 'Destacar'} 
            onClick={togglePinned} 
          />
        )}`

if (!content.includes('Destacar')) {
  content = content.replace(
    '<MenuRow icon={<IconEdit />} label="Editar tags" onClick={openEdit} />',
    `<MenuRow icon={<IconEdit />} label="Editar tags" onClick={openEdit} />
${pinMenuRow}`
  )
}

fs.writeFileSync(file, content, 'utf8')
console.log('Modifications for Pin completed.')
