import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { writeJson, slugify, SPECIAL_DIRS } from '../lib/workspace.js'
import { serializeItemFile } from '@doit/md'
import { hashContent } from '@doit/sync'
import type { Folder, Item } from '@doit/types'
import type { ManifestEntry } from '@doit/sync'
import { buildDriveIndex } from '../drive/indexer.js'
import { reconcileDrive } from '../drive/reconcile.js'
import { DriveNotConnectedError } from '../drive/client.js'

type FolderNode = Folder & { children: FolderNode[]; relativePath: string }

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
  while (usedPaths.has(`${baseDir}/${candidate}`)) {
    const stem = baseName.replace(/\.md$/, '')
    candidate = `${stem}-${counter++}.md`
  }
  usedPaths.add(`${baseDir}/${candidate}`)
  return candidate
}

export async function pullCommand() {
  const spinner = ora('Sincronizando workspace...').start()

  try {
    const config = getConfig()
    const headers = { Authorization: `Bearer ${config.apiKey}` }

    const [foldersRes, itemsRes] = await Promise.all([
      fetch(`${config.apiUrl}/api/folders`, { headers }),
      fetch(`${config.apiUrl}/api/items`, { headers }),
    ])

    if (!foldersRes.ok) throw new Error(`/api/folders retornou ${foldersRes.status}`)
    if (!itemsRes.ok) throw new Error(`/api/items retornou ${itemsRes.status}`)

    const { folders } = (await foldersRes.json()) as { folders: Folder[] }
    const { items } = (await itemsRes.json()) as { items: Item[] }

    const tree = buildFolderTree(folders)
    const folderById = flatten(tree)

    // Cria todos os diretórios reais (vazios ficam visíveis)
    for (const node of folderById.values()) {
      await mkdir(join(config.workspacePath, node.relativePath), { recursive: true })
    }

    const usedPaths = new Set<string>()
    const entries: ManifestEntry[] = []

    for (const item of items) {
      const folderRel = resolveItemFolder(item, folderById)
      const baseSlug = slugify(item.title, item.id)
      const filename = dedupeFilename(usedPaths, folderRel, `${baseSlug}.md`)
      const relativePath = `${folderRel}/${filename}`
      const absolutePath = join(config.workspacePath, relativePath)

      const content = serializeItemFile(item)
      const hash = hashContent(content)

      await mkdir(join(config.workspacePath, folderRel), { recursive: true })
      await writeFile(absolutePath, content, 'utf-8')

      entries.push({
        itemId: item.id,
        localPath: relativePath,
        syncHash: hash,
        updatedAt: item.updatedAt,
      })
    }

    const manifest = { version: 1 as const, generatedAt: new Date().toISOString(), entries }
    await writeJson(join(config.workspacePath, '_system', 'manifest.json'), manifest)
    await writeJson(join(config.workspacePath, '_system', 'last-pull.json'), {
      at: new Date().toISOString(),
      itemCount: items.length,
      folderCount: folders.length,
    })

    spinner.succeed(
      chalk.green(`${items.length} item(ns) e ${folders.length} pasta(s) sincronizados`),
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
