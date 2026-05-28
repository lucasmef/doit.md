import type { Item } from '@doit/types'

export type RelatedNote = {
  item: Item
  sharedTags: string[]
  score: number
}

export type TagGraphNode = {
  item: Item
  primaryTag: string | null
  relatedCount: number
}

export type TagGraphEdge = {
  sourceIndex: number
  targetIndex: number
  sharedTags: string[]
  score: number
}

export type TagGraph = {
  nodes: TagGraphNode[]
  edges: TagGraphEdge[]
}

function isVisibleNote(item: Item): boolean {
  return item.complexity === 'note' && item.status !== 'archived' && item.status !== 'done'
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase()
}

function tagEntries(item: Item): Array<{ key: string; label: string }> {
  const seen = new Set<string>()
  const entries: Array<{ key: string; label: string }> = []

  for (const rawTag of item.tags ?? []) {
    const label = rawTag.trim().replace(/^#/, '')
    const key = normalizeTag(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    entries.push({ key, label })
  }

  return entries
}

function sameFolder(a: Item, b: Item): boolean {
  if (!a.folderId) return false
  return a.folderId === b.folderId
}

export function sharedTagsFor(a: Item, b: Item): string[] {
  if (!sameFolder(a, b)) return []

  const bKeys = new Set(tagEntries(b).map((entry) => entry.key))
  return tagEntries(a)
    .filter((entry) => bKeys.has(entry.key))
    .map((entry) => entry.label)
}

function relationScore(a: Item, b: Item, sharedTags: string[]): number {
  const union = new Set([...tagEntries(a).map((entry) => entry.key), ...tagEntries(b).map((entry) => entry.key)])
  if (union.size === 0) return 0
  return sharedTags.length / union.size
}

export function findRelatedNotesInFolder(item: Item, items: Item[], limit = 3): RelatedNote[] {
  return items
    .filter((candidate) => isVisibleNote(candidate) && candidate.id !== item.id && sameFolder(item, candidate))
    .map((candidate) => {
      const sharedTags = sharedTagsFor(item, candidate)
      return {
        item: candidate,
        sharedTags,
        score: relationScore(item, candidate, sharedTags),
      }
    })
    .filter((relation) => relation.sharedTags.length > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.sharedTags.length !== a.sharedTags.length) return b.sharedTags.length - a.sharedTags.length
      const updated = b.item.updatedAt.localeCompare(a.item.updatedAt)
      return updated || a.item.title.localeCompare(b.item.title, 'pt-BR')
    })
    .slice(0, limit)
}

export function buildTagGraph(notes: Item[], limit = 7): TagGraph {
  const visibleNotes = notes.filter(isVisibleNote)
  const pairs: Array<{ sourceId: string; targetId: string; sharedTags: string[]; score: number }> = []
  const degree = new Map<string, number>()

  for (let i = 0; i < visibleNotes.length; i += 1) {
    const source = visibleNotes[i]
    if (!source) continue

    for (let j = i + 1; j < visibleNotes.length; j += 1) {
      const target = visibleNotes[j]
      if (!target) continue

      const sharedTags = sharedTagsFor(source, target)
      if (sharedTags.length === 0) continue

      const score = relationScore(source, target, sharedTags)
      pairs.push({ sourceId: source.id, targetId: target.id, sharedTags, score })
      degree.set(source.id, (degree.get(source.id) ?? 0) + 1)
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1)
    }
  }

  const selectedItems = visibleNotes
    .slice()
    .sort((a, b) => {
      const degreeDiff = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
      if (degreeDiff !== 0) return degreeDiff
      const updated = b.updatedAt.localeCompare(a.updatedAt)
      return updated || a.title.localeCompare(b.title, 'pt-BR')
    })
    .slice(0, limit)

  const selectedIndex = new Map(selectedItems.map((item, index) => [item.id, index]))
  const edges = pairs
    .map((pair) => {
      const sourceIndex = selectedIndex.get(pair.sourceId)
      const targetIndex = selectedIndex.get(pair.targetId)
      if (sourceIndex === undefined || targetIndex === undefined) return null
      return {
        sourceIndex,
        targetIndex,
        sharedTags: pair.sharedTags,
        score: pair.score,
      }
    })
    .filter((edge): edge is TagGraphEdge => edge !== null)
    .sort((a, b) => b.score - a.score || b.sharedTags.length - a.sharedTags.length)

  const nodes = selectedItems.map((item) => ({
    item,
    primaryTag: tagEntries(item)[0]?.label ?? null,
    relatedCount: degree.get(item.id) ?? 0,
  }))

  return { nodes, edges }
}
