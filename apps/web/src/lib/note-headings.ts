export type NoteHeading = {
  id: string
  text: string
  level: 1 | 2 | 3
  checked: boolean | null
  lineIndex: number
}

const HEADING_RE = /^(#{1,3})[ \t]+(.+?)\s*$/
const CHECKBOX_RE = /^\[([ xX])\][ \t]+/

function decodeHeadingEntities(value: string) {
  return value.replace(
    /&(?:amp|lt|gt|quot|#39|#x27|#(\d+)|#x([0-9a-f]+));/gi,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal) return String.fromCodePoint(Number(decimal))
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16))
      const named: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
      }
      return named[entity.toLowerCase()] ?? entity
    },
  )
}

function unwrapMarkdownFileAutolinks(value: string) {
  return value.replace(
    /\[([^\]]+\.md)\]\((https?:\/\/[^)]+)\)/gi,
    (match, label: string, href: string) => {
      const normalizedHref = href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
      return normalizedHref.toLowerCase() === label.toLowerCase() ? label : match
    },
  )
}

export function normalizeHeadingMarkdown(markdown: string) {
  let fence: string | null = null
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s*(```+|~~~+)/)
      if (fenceMatch?.[1]) {
        if (!fence) fence = fenceMatch[1][0] ?? null
        else if (fenceMatch[1].startsWith(fence)) fence = null
        return line
      }
      if (fence || !HEADING_RE.test(line)) return line
      return unwrapMarkdownFileAutolinks(decodeHeadingEntities(line))
    })
    .join('\n')
}

export function parseHeadingLabel(rawText: string) {
  const withoutClosingHashes = rawText.replace(/[ \t]+#+[ \t]*$/, '').trim()
  const checkbox = withoutClosingHashes.match(CHECKBOX_RE)
  const headingText = checkbox
    ? withoutClosingHashes.slice(checkbox[0].length)
    : withoutClosingHashes
  const text = decodeHeadingEntities(
    headingText
      .replace(/^#{1,6}[ \t]+/, '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`]/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\.md$/i, '')
      .trim(),
  )

  return {
    text,
    checked: checkbox ? checkbox[1]?.toLowerCase() === 'x' : null,
    markerLength: checkbox?.[0].length ?? 0,
  }
}

export function createHeadingId(text: string, occurrence = 1) {
  const base =
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'titulo'

  return occurrence > 1 ? `${base}-${occurrence}` : base
}

export function parseNoteHeadings(markdown: string): NoteHeading[] {
  if (!markdown) return []

  const headings: NoteHeading[] = []
  const occurrences = new Map<string, number>()
  let fence: string | null = null

  markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((line, lineIndex) => {
      const fenceMatch = line.match(/^\s*(```+|~~~+)/)
      if (fenceMatch?.[1]) {
        if (!fence) fence = fenceMatch[1][0] ?? null
        else if (fenceMatch[1].startsWith(fence)) fence = null
        return
      }
      if (fence) return

      const match = line.match(HEADING_RE)
      if (!match?.[1] || !match[2]) return

      const level = match[1].length as 1 | 2 | 3
      const parsed = parseHeadingLabel(match[2])
      if (!parsed.text) return

      const baseId = createHeadingId(parsed.text)
      const occurrence = (occurrences.get(baseId) ?? 0) + 1
      occurrences.set(baseId, occurrence)
      headings.push({
        id: createHeadingId(parsed.text, occurrence),
        text: parsed.text,
        level,
        checked: parsed.checked,
        lineIndex,
      })
    })

  return headings
}

export function toggleMarkdownHeadingCheckbox(markdown: string, headingIndex: number) {
  const heading = parseNoteHeadings(markdown)[headingIndex]
  if (!heading || heading.checked === null) return markdown

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const line = lines[heading.lineIndex]
  if (!line) return markdown
  lines[heading.lineIndex] = line.replace(
    /^(\s*#{1,3}[ \t]+)\[([ xX])\]/,
    (_match, prefix: string, state: string) =>
      `${prefix}[${state.toLowerCase() === 'x' ? ' ' : 'x'}]`,
  )
  return lines.join('\n')
}
