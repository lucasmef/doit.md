import matter from 'gray-matter'
import type { Item } from '@clarity/types'

export type ItemFrontmatter = {
  id: string
  title: string
  complexity: string
  status: string
  project?: string
  area?: string
  tags: string[]
  dueDate?: string
  updatedAt: string
  syncHash?: string
}

export function parseItemFile(raw: string): { frontmatter: ItemFrontmatter; content: string } {
  const { data, content } = matter(raw)
  return { frontmatter: data as ItemFrontmatter, content: content.trim() }
}

export function serializeItemFile(item: Item, projectSlug?: string, areaSlug?: string): string {
  const frontmatter: ItemFrontmatter = {
    id: item.id,
    title: item.title,
    complexity: item.complexity,
    status: item.status,
    ...(projectSlug ? { project: projectSlug } : {}),
    ...(areaSlug ? { area: areaSlug } : {}),
    tags: item.tags,
    ...(item.dueDate ? { dueDate: item.dueDate } : {}),
    updatedAt: item.updatedAt,
    ...(item.syncHash ? { syncHash: item.syncHash } : {}),
  }

  const yaml = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
      return `${k}: ${v}`
    })
    .join('\n')

  const body = item.contentMd ?? `# ${item.title}\n`

  return `---\n${yaml}\n---\n\n${body}\n`
}

export function itemFilename(item: Item): string {
  const slug = item.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${slug}.md`
}
