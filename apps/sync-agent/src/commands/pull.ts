import { dirname, join } from 'path'
import { mkdir, readFile, readdir, unlink, writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson, slugify, SPECIAL_DIRS } from '../lib/workspace.js'
import { parseItemFile, serializeItemFile } from '@doit/md'
import { hashContent } from '@doit/sync'
import { isUserAgentsItem, USER_AGENTS_TITLE } from '@doit/core'
import type { Folder, Item } from '@doit/types'
import type { FolderManifestEntry, Manifest, ManifestEntry } from '@doit/sync'
import { buildDriveIndex } from '../drive/indexer.js'
import { reconcileDrive } from '../drive/reconcile.js'
import { DriveNotConnectedError } from '../drive/client.js'

type FolderNode = Folder & { children: FolderNode[]; relativePath: string }

const SYSTEM_DIRS = new Set(['_system', '_changes', '_raw_archive', '.git', 'node_modules'])

function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>()
  for (const folder of folders) {
    map.set(folder.id, { ...folder, children: [], relativePath: '' })
  }
  const roots: FolderNode[] = []
  for (const folder of folders) {
    const node = map.get(folder.id)!
    if (folder.parentId && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const usedNames = new Map<string, Set<string>>()
  function buildPaths(nodes: FolderNode[], parentPath: string) {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
    const siblings = usedNames.get(parentPath) ?? new Set<string>()
    usedNames.set(parentPath, siblings)
    for (const node of nodes) {
      let slug = slugify(node.name, 'pasta')
      let attempt = slug
      let counter = 2
      while (siblings.has(attempt)) {
        attempt = `${slug}-${counter++}`
      }
      siblings.add(attempt)
      node.relativePath = parentPath ? `${parentPath}/${attempt}` : attempt
      buildPaths(node.children, node.relativePath)
    }
  }
  buildPaths(roots, '')

  return roots
}

function flatten(roots: FolderNode[]): Map<string, FolderNode> {
  const out = new Map<string, FolderNode>()
  function walk(nodes: FolderNode[]) {
    for (const node of nodes) {
      out.set(node.id, node)
      walk(node.children)
    }
  }
  walk(roots)
  return out
}

function resolveItemFolder(item: Item, folderById: Map<string, FolderNode>): string {
  if (item.status === 'archived') return SPECIAL_DIRS.archive
  if (item.folderId) {
    const folder = folderById.get(item.folderId)
    if (folder) return folder.relativePath
  }
  if (item.complexity === 'task' && item.dueDate) return SPECIAL_DIRS.upcoming
  return SPECIAL_DIRS.inbox
}

function dedupeFilename(usedPaths: Set<string>, baseDir: string, baseName: string): string {
  let candidate = baseName
  let counter = 2
  while (usedPaths.has(joinRelative(baseDir, candidate))) {
    const stem = baseName.replace(/\.md$/, '')
    candidate = `${stem}-${counter++}.md`
  }
  usedPaths.add(joinRelative(baseDir, candidate))
  return candidate
}

function joinRelative(baseDir: string, filename: string): string {
  return baseDir ? `${baseDir}/${filename}` : filename
}

function agentsFolder(item: Item, folderById: Map<string, FolderNode>): string {
  if (!item.folderId) return ''
  return folderById.get(item.folderId)?.relativePath ?? ''
}

async function walkMarkdown(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SYSTEM_DIRS.has(entry.name)) continue
      out.push(...(await walkMarkdown(root, join(current, entry.name))))
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      out.push(join(current, entry.name))
    }
  }
  return out
}

function toRelative(root: string, absolutePath: string): string {
  return absolutePath
    .slice(root.length)
    .replace(/^[\\/]/, '')
    .split(/[\\/]/)
    .join('/')
}

async function localUntrackedMarkdownPaths(
  workspacePath: string,
  previousManifest: Manifest | null,
): Promise<Set<string>> {
  const trackedPaths = new Set(previousManifest?.entries.map((entry) => entry.localPath) ?? [])
  const paths = await walkMarkdown(workspacePath)
  return new Set(
    paths
      .map((path) => toRelative(workspacePath, path))
      .filter((path) => path !== USER_AGENTS_TITLE && !trackedPaths.has(path)),
  )
}

async function archiveIfLocallyModified(
  workspacePath: string,
  previousManifest: Manifest | null,
  relativePath: string,
  archiveName: string,
) {
  const previous = previousManifest?.entries.find((entry) => entry.localPath === relativePath)
  if (!previous) return false

  const absolutePath = join(workspacePath, relativePath)
  let raw: string
  try {
    raw = await readFile(absolutePath, 'utf-8')
  } catch {
    return false
  }

  if (hashContent(raw) === previous.syncHash) return false

  const archivePath = join(workspacePath, '_raw_archive', archiveName, relativePath)
  await mkdir(dirname(archivePath), { recursive: true })
  await writeFile(archivePath, raw, 'utf-8')
  return true
}

async function removeStaleFiles(
  workspacePath: string,
  previousManifest: Manifest | null,
  nextEntries: ManifestEntry[],
) {
  if (!previousManifest) return { removed: 0, archived: 0 }

  const nextById = new Map(nextEntries.map((entry) => [entry.itemId, entry]))
  let removed = 0
  let archived = 0
  const now = new Date().toISOString().replace(/[:.]/g, '-')

  for (const previous of previousManifest.entries) {
    const next = nextById.get(previous.itemId)
    if (next?.localPath === previous.localPath) continue

    const absolutePath = join(workspacePath, previous.localPath)
    let raw: string
    try {
      raw = await readFile(absolutePath, 'utf-8')
    } catch {
      continue
    }

    if (hashContent(raw) !== previous.syncHash) {
      const archivePath = join(
        workspacePath,
        '_raw_archive',
        `pull-removed-${now}`,
        previous.localPath,
      )
      await mkdir(dirname(archivePath), { recursive: true })
      await writeFile(archivePath, raw, 'utf-8')
      archived++
    }

    await unlink(absolutePath)
    removed++
  }

  return { removed, archived }
}

export async function pullCommand() {
  const spinner = ora('Sincronizando workspace...').start()

  try {
    const config = getConfig()
    const headers = { Authorization: `Bearer ${config.apiKey}` }
    const previousManifest = await readJson<Manifest>(
      join(config.workspacePath, '_system', 'manifest.json'),
    )

    const [foldersRes, itemsRes] = await Promise.all([
      fetch(`${config.apiUrl}/api/folders`, { headers }),
      fetch(`${config.apiUrl}/api/items?sync=active`, { headers }),
    ])

    if (!foldersRes.ok) throw new Error(`/api/folders retornou ${foldersRes.status}`)
    if (!itemsRes.ok) throw new Error(`/api/items retornou ${itemsRes.status}`)

    const { folders } = (await foldersRes.json()) as { folders: Folder[] }
    const { items } = (await itemsRes.json()) as { items: Item[] }

    const tree = buildFolderTree(folders)
    const folderById = flatten(tree)
    const pullArchiveName = `pull-overwrite-${new Date().toISOString().replace(/[:.]/g, '-')}`

    // Cria todos os diretórios reais (vazios ficam visíveis)
    const folderEntries: FolderManifestEntry[] = []
    for (const node of folderById.values()) {
      await mkdir(join(config.workspacePath, node.relativePath), { recursive: true })
      await writeJson(join(config.workspacePath, node.relativePath, '_folder.json'), {
        folderId: node.id,
        name: node.name,
        parentId: node.parentId ?? null,
      })
      folderEntries.push({
        folderId: node.id,
        localPath: node.relativePath,
        name: node.name,
        parentId: node.parentId,
        updatedAt: node.updatedAt,
      })
    }

    const usedPaths = await localUntrackedMarkdownPaths(config.workspacePath, previousManifest)
    const entries: ManifestEntry[] = []
    let overwrittenArchives = 0

    for (const item of items) {
      const isAgents = isUserAgentsItem(item)
      const folderRel = isAgents
        ? agentsFolder(item, folderById)
        : resolveItemFolder(item, folderById)
      const baseSlug = isAgents ? USER_AGENTS_TITLE : `${slugify(item.title, item.id)}.md`
      const filename = dedupeFilename(usedPaths, folderRel, baseSlug)
      const relativePath = joinRelative(folderRel, filename)
      const absolutePath = join(config.workspacePath, relativePath)

      const content = isAgents ? (item.contentMd ?? '') : serializeItemFile(item)
      const parsed = isAgents
        ? {
            content,
            frontmatter: {
              id: item.id,
              title: item.title,
              complexity: item.complexity,
              status: item.status,
              tags: item.tags,
            },
          }
        : parseItemFile(content)
      const hash = hashContent(content)

      await mkdir(join(config.workspacePath, folderRel), { recursive: true })
      if (
        await archiveIfLocallyModified(
          config.workspacePath,
          previousManifest,
          relativePath,
          pullArchiveName,
        )
      ) {
        overwrittenArchives++
      }
      await writeFile(absolutePath, content, 'utf-8')

      entries.push({
        itemId: item.id,
        localPath: relativePath,
        syncHash: hash,
        contentHash: hashContent(parsed.content),
        frontmatter: parsed.frontmatter as unknown as Record<string, unknown>,
        contentMd: parsed.content,
        updatedAt: item.updatedAt,
      })
    }

    const stale = await removeStaleFiles(config.workspacePath, previousManifest, entries)

    const manifest = {
      version: 1 as const,
      generatedAt: new Date().toISOString(),
      entries,
      folders: folderEntries,
    }
    await writeJson(join(config.workspacePath, '_system', 'manifest.json'), manifest)
    await writeJson(join(config.workspacePath, '_system', 'last-pull.json'), {
      at: new Date().toISOString(),
      itemCount: items.length,
      folderCount: folders.length,
    })

    spinner.succeed(
      chalk.green(`${items.length} item(ns) e ${folders.length} pasta(s) sincronizados`) +
        (stale.removed > 0
          ? chalk.dim(
              ` — ${stale.removed} fechado(s) removido(s) do workspace${
                stale.archived > 0 ? `, ${stale.archived} com copia em _raw_archive` : ''
              }`,
            )
          : '') +
        (overwrittenArchives > 0
          ? chalk.dim(` — ${overwrittenArchives} edicao local preservada em _raw_archive`)
          : ''),
    )

    const driveSpinner = ora('Indexando Drive...').start()
    try {
      const driveIndex = await buildDriveIndex(config.apiUrl, config.apiKey)
      await writeJson(join(config.workspacePath, '_system', 'drive-index.json'), driveIndex)
      const report = await reconcileDrive(config.workspacePath, driveIndex)
      await writeJson(join(config.workspacePath, '_system', 'inbox.json'), {
        version: 1,
        generatedAt: new Date().toISOString(),
        pending: report.inboxPending,
      })
      const count = Object.keys(driveIndex.files).length
      const pendingNote =
        report.inboxPending.length > 0
          ? chalk.yellow(` — ${report.inboxPending.length} na inbox`)
          : ''
      driveSpinner.succeed(chalk.green(`Drive indexado (${count} arquivos/pastas)`) + pendingNote)
    } catch (err) {
      if (err instanceof DriveNotConnectedError) {
        driveSpinner.info(chalk.dim('Drive não conectado — pulando índice'))
      } else {
        driveSpinner.warn(
          chalk.yellow(`Falha ao indexar Drive: ${err instanceof Error ? err.message : err}`),
        )
      }
    }
  } catch (err) {
    spinner.fail('Falha no pull')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
