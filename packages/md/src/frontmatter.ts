import matter from 'gray-matter'
import type { Item } from '@doit/types'

export type ItemFrontmatter = {
  id: string
  title: string
  complexity: string
  status: string
  priority?: number
  project?: string
  area?: string
  tags: string[]
  dueDate?: string
  updatedAt: string
  syncHash?: string
}

export function parseItemFile(raw: string): { frontmatter: ItemFrontmatter; content: string } {
  const { data, content } = matter(raw)
  const frontmatter = repairMojibakeDeep(data) as ItemFrontmatter
  const normalizedContent = normalizeBody(frontmatter.title, repairMojibakeText(content).trim())
  return { frontmatter, content: normalizedContent }
}

export function serializeItemFile(item: Item, projectSlug?: string, areaSlug?: string): string {
  const frontmatter: ItemFrontmatter = {
    id: item.id,
    title: item.title,
    complexity: item.complexity,
    status: item.status,
    ...(item.priority ? { priority: item.priority } : {}),
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

  const body = item.contentMd ?? ''

  return `---\n${yaml}\n---\n\n${body}${body.endsWith('\n') || body.length === 0 ? '' : '\n'}`
}

export function itemFilename(item: Item): string {
  const slug = item.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${slug}.md`
}

export function repairMojibakeText(value: string): string {
  if (!/[ÃÂ]/.test(value)) return value
  let current = value
  for (let i = 0; i < 3; i++) {
    const repaired = decodeUtf8AsLatin1(current)
    if (!repaired || mojibakeScore(repaired) >= mojibakeScore(current)) break
    current = repaired
  }
  return current
}

function repairMojibakeDeep(value: unknown): unknown {
  if (typeof value === 'string') return repairMojibakeText(value)
  if (Array.isArray(value)) return value.map(repairMojibakeDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) out[key] = repairMojibakeDeep(nested)
    return out
  }
  return value
}

function decodeUtf8AsLatin1(value: string): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(Array.from(value, charToWindows1252Byte)),
    )
  } catch {
    return null
  }
}

function charToWindows1252Byte(char: string): number {
  const code = char.charCodeAt(0)
  if (code <= 0xff) return code
  const mapped = WINDOWS_1252_REVERSE[char]
  return mapped ?? (code & 0xff)
}

const WINDOWS_1252_REVERSE: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f,
}

function mojibakeScore(value: string): number {
  return (value.match(/[ÃÂ�]/g) ?? []).length
}

function normalizeBody(title: string | undefined, content: string): string {
  const cleanTitle = title?.trim()
  if (!cleanTitle) return content
  if (content === cleanTitle || content === `# ${cleanTitle}`) return ''
  return content
}
