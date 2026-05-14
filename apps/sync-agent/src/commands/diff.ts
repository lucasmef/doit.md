import { join, relative, sep } from 'path'
import { readFile, readdir } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson } from '../lib/workspace.js'
import { parseItemFile } from '@doit/md'
import { hashContent } from '@doit/sync'
import { assessRisk } from '@doit/audit'
import { newChangeId } from '@doit/core'
import type { Manifest, ManifestEntry } from '@doit/sync'
import type { ChangeType, PendingChange } from '@doit/types'

const SYSTEM_DIRS = new Set(['_system', '_changes', '.git', 'node_modules'])

type LocalFile = {
  relativePath: string
  raw: string
  hash: string
  itemId?: string
  title?: string
  content: string
  complexity?: string
  status?: string
  tags?: string[]
  dueDate?: string
}

async function walkMarkdown(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SYSTEM_DIRS.has(entry.name)) continue
      const sub = await walkMarkdown(root, join(current, entry.name))
      out.push(...sub)
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      entry.name !== 'AGENTS.md' &&
      entry.name !== 'README.md'
    ) {
      out.push(join(current, entry.name))
    }
  }
  return out
}

function toRelative(workspaceRoot: string, absolute: string): string {
  return relative(workspaceRoot, absolute).split(sep).join('/')
}

function fieldDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const out: { field: string; before: unknown; after: unknown }[] = []
  for (const key of keys) {
    if (key === 'syncHash' || key === 'updatedAt') continue
    const a = before[key]
    const b = after[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ field: key, before: a, after: b })
    }
  }
  return out
}

function normalizeChangeForKey(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeChangeForKey)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      if (['id', 'userId', 'approved', 'createdAt', 'riskLevel'].includes(key)) continue
      out[key] = normalizeChangeForKey((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

function changeKey(change: PendingChange): string {
  return JSON.stringify(normalizeChangeForKey(change))
}

export async function diffCommand() {
  const spinner = ora('Analisando mudanças...').start()
  const config = getConfig()

  const manifest = await readJson<Manifest>(join(config.workspacePath, '_system', 'manifest.json'))
  if (!manifest) {
    spinner.fail('Nenhum manifest encontrado. Execute doit-sync pull primeiro.')
    process.exit(1)
  }

  const manifestByPath = new Map<string, ManifestEntry>()
  const manifestById = new Map<string, ManifestEntry>()
  for (const entry of manifest.entries) {
    manifestByPath.set(entry.localPath, entry)
    manifestById.set(entry.itemId, entry)
  }

  // Coleta arquivos locais
  const absolutePaths = await walkMarkdown(config.workspacePath)
  const localFiles: LocalFile[] = []
  for (const abs of absolutePaths) {
    try {
      const raw = await readFile(abs, 'utf-8')
      const { frontmatter, content } = parseItemFile(raw)
      localFiles.push({
        relativePath: toRelative(config.workspacePath, abs),
        raw,
        hash: hashContent(raw),
        itemId: frontmatter.id,
        title: frontmatter.title,
        content,
        complexity: frontmatter.complexity,
        status: frontmatter.status,
        tags: frontmatter.tags,
        dueDate: frontmatter.dueDate,
      })
    } catch {
      // ignore unreadable / malformed
    }
  }

  const seenItemIds = new Set<string>()
  const changes: PendingChange[] = []
  const now = new Date().toISOString()

  function record(
    change: Omit<PendingChange, 'id' | 'userId' | 'approved' | 'createdAt' | 'riskLevel'> & {
      riskLevel?: PendingChange['riskLevel']
    },
  ) {
    const riskLevel = change.riskLevel ?? assessRisk(change.changeType)
    changes.push({
      id: newChangeId(),
      userId: config.userId,
      approved: false,
      createdAt: now,
      riskLevel,
      ...change,
    })
  }

  // 1. Pra cada arquivo local: criação, movimento, conteúdo, frontmatter
  for (const file of localFiles) {
    if (!file.itemId) {
      record({
        changeType: 'created',
        localPathAfter: file.relativePath,
        titleAfter: file.title,
        contentMdAfter: file.content,
      })
      continue
    }

    seenItemIds.add(file.itemId)
    const entry = manifestById.get(file.itemId)
    if (!entry) {
      // arquivo com id mas sem manifest → tratar como criação
      record({
        changeType: 'created',
        itemId: file.itemId,
        localPathAfter: file.relativePath,
        titleAfter: file.title,
        contentMdAfter: file.content,
      })
      continue
    }

    if (file.hash === entry.syncHash && file.relativePath === entry.localPath) {
      continue
    }

    const moved = file.relativePath !== entry.localPath
    const contentChanged = file.hash !== entry.syncHash

    if (moved) {
      record({
        changeType: 'moved',
        itemId: file.itemId,
        localPathBefore: entry.localPath,
        localPathAfter: file.relativePath,
        titleAfter: file.title,
      })
    }

    if (contentChanged) {
      // Decide se é frontmatter_changed, content_changed ou ambos
      // (Usamos o snapshot anterior do servidor seria ideal, mas aqui só temos hash
      //  do arquivo original. Tratamos como content_changed; o servidor decide.)
      record({
        changeType: 'content_changed',
        itemId: file.itemId,
        localPathBefore: entry.localPath,
        localPathAfter: file.relativePath,
        titleAfter: file.title,
        contentMdAfter: file.content,
        frontmatterChanges: fieldDiff(
          {},
          {
            title: file.title,
            complexity: file.complexity,
            status: file.status,
            tags: file.tags,
            dueDate: file.dueDate,
          },
        ),
      })
    }
  }

  // 2. Arquivos que existiam no manifest mas não foram vistos → deleted
  for (const entry of manifest.entries) {
    if (!seenItemIds.has(entry.itemId)) {
      record({
        changeType: 'deleted',
        itemId: entry.itemId,
        localPathBefore: entry.localPath,
      })
    }
  }

  const previousPending = await readJson<{ changes: PendingChange[] }>(
    join(config.workspacePath, '_changes', 'pending.json'),
  )
  const previousByKey = new Map<string, PendingChange>()
  for (const previous of previousPending?.changes ?? []) {
    previousByKey.set(changeKey(previous), previous)
  }
  for (const change of changes) {
    const previous = previousByKey.get(changeKey(change))
    if (previous) {
      change.id = previous.id
      change.approved = !!previous.approved
      change.createdAt = previous.createdAt ?? change.createdAt
    }
  }

  await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes })
  await writeJson(join(config.workspacePath, '_system', 'last-diff.json'), {
    at: now,
    count: changes.length,
  })

  // Upload pro app (Auditoria)
  if (changes.length > 0) {
    try {
      const res = await fetch(`${config.apiUrl}/api/sync/pending-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ changes }),
      })
      if (!res.ok) {
        spinner.warn(chalk.yellow('Mudanças detectadas mas falha ao enviar para Auditoria.'))
      } else {
        await fetch(`${config.apiUrl}/api/sync/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            action: 'diff',
            summary: `Diff detectou ${changes.length} mudança(s) local(is).`,
          }),
        })
      }
    } catch {
      // offline — mudanças ficam só localmente
    }
  }

  spinner.stop()

  if (changes.length === 0) {
    console.log(chalk.green('✓ Nenhuma alteração detectada.'))
    return
  }

  console.log(chalk.yellow(`\n  ${changes.length} alteração(ões) detectada(s):\n`))
  for (const c of changes) {
    const riskColor =
      c.riskLevel === 'high' ? chalk.red : c.riskLevel === 'medium' ? chalk.yellow : chalk.green
    const path = c.localPathAfter ?? c.localPathBefore ?? c.itemId ?? '?'
    console.log(
      `  ${riskColor(`[${c.riskLevel.toUpperCase()}]`)} ${c.changeType.padEnd(20)} ${chalk.dim(path)}`,
    )
  }

  console.log(chalk.dim('\n  Revise e aprove no app (Auditoria) → doit-sync push'))
}
