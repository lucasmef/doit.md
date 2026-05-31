import fs from 'fs'

const files = [
  'apps/web/src/app/api/items/route.ts',
  'apps/web/src/app/api/items/search/route.ts'
]

const oldMatches1 = `function matchesSearch(item: Record<string, unknown>, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR')
  const tags = Array.isArray(item['tags']) ? item['tags'].join(' ') : ''
  const haystack = [item['title'], item['contentMd'], tags]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR')
  return haystack.includes(needle)
}`

const oldMatches2 = `function matchesSearch(item: Record<string, unknown>, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR')
  const tags = Array.isArray(item['tags']) ? item['tags'].join(' ') : ''
  const haystack = [
    item['title'],
    item['contentMd'],
    tags,
  ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
  return haystack.includes(needle)
}`

const newMatches = `function matchesSearch(item: Record<string, unknown>, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  const tags = Array.isArray(item['tags']) ? item['tags'].join(' ') : ''
  const haystack = [item['title'], item['contentMd'], tags]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
  return haystack.includes(needle)
}`

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8')
  content = content.replace(oldMatches1, newMatches)
  content = content.replace(oldMatches2, newMatches)
  if (f === 'apps/web/src/app/api/items/search/route.ts') {
    content = content.replace(
      `status: { $ne: 'archived' }`,
      `status: { $nin: ['archived', 'done'] }`
    )
  }
  fs.writeFileSync(f, content, 'utf8')
}
console.log('Search modifications completed.')
