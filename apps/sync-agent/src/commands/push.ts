import { join } from 'path'
import { readFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson } from '../lib/workspace.js'
import { hashContent } from '@doit/sync'
import { parseItemFile } from '@doit/md'
import type { Manifest } from '@doit/sync'
import type { PendingChange } from '@doit/types'

export async function pushCommand() {
  const config = getConfig()
  const pending = await readJson<{ changes: PendingChange[] }>(
    join(config.workspacePath, '_changes', 'pending.json'),
  )

  if (!pending || pending.changes.length === 0) {
    console.log(chalk.green('✓ Nenhuma mudança pendente para enviar.'))
    return
  }

  let changes = pending.changes
  try {
    const pendingRes = await fetch(`${config.apiUrl}/api/sync/pending`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    if (pendingRes.ok) {
      const remotePending = (await pendingRes.json()) as { changes?: PendingChange[] }
      if (Array.isArray(remotePending.changes)) {
        changes = remotePending.changes
      }
    }
  } catch {
    // Offline or older server: fall back to local pending.json.
  }

  const approved = changes.filter((c) => c.approved)
  const highRiskUnapproved = changes.filter((c) => c.riskLevel === 'high' && !c.approved)

  if (highRiskUnapproved.length > 0) {
    console.log(
      chalk.red(
        `\n  ✕ ${highRiskUnapproved.length} mudança(s) de alto risco aguardam aprovação no app.`,
      ),
    )
    console.log(chalk.dim('  Acesse a tela de Auditoria para aprovar antes de fazer push.\n'))
    return
  }

  if (approved.length === 0) {
    console.log(chalk.yellow(`  ${changes.length} mudança(s) detectadas mas nenhuma aprovada.`))
    console.log(
      chalk.dim('  Aprove no app (Auditoria → Mudanças pendentes) e execute novamente.\n'),
    )
    return
  }

  const spinner = ora(`Enviando ${approved.length} mudança(s) aprovada(s)...`).start()

  try {
    const res = await fetch(`${config.apiUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ ids: approved.map((change) => change.id), userId: config.userId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
    }

    const { applied } = (await res.json()) as { applied: number }

    const now = new Date().toISOString()
    await writeJson(join(config.workspacePath, '_system', 'last-push.json'), {
      at: now,
      count: applied,
    })

    // Limpar aprovados do pending local
    const remaining = changes.filter((c) => !approved.find((a) => a.id === c.id))
    const manifest = await readJson<Manifest>(
      join(config.workspacePath, '_system', 'manifest.json'),
    )
    if (manifest?.entries) {
      const deletedItemIds = new Set(
        approved
          .filter((c) => c.changeType === 'deleted' && c.itemId)
          .map((c) => c.itemId as string),
      )
      manifest.entries = manifest.entries.filter((entry) => !deletedItemIds.has(entry.itemId))
      const entriesByItemId = new Map(manifest.entries.map((entry) => [entry.itemId, entry]))

      for (const change of approved) {
        if (change.changeType === 'deleted' || !change.itemId || !change.localPathAfter) continue

        try {
          const raw = await readFile(join(config.workspacePath, change.localPathAfter), 'utf-8')
          const parsed = parseItemFile(raw)
          const existing = entriesByItemId.get(change.itemId)
          const nextEntry = {
            itemId: change.itemId,
            localPath: change.localPathAfter,
            syncHash: hashContent(raw),
            contentHash: hashContent(parsed.content),
            frontmatter: parsed.frontmatter as unknown as Record<string, unknown>,
            contentMd: parsed.content,
            updatedAt: now,
          }

          if (existing) {
            Object.assign(existing, nextEntry)
          } else {
            manifest.entries.push(nextEntry)
            entriesByItemId.set(change.itemId, nextEntry)
          }
        } catch {
          // If the file disappeared after approval, keep sync state unchanged.
        }
      }

      manifest.folders ??= []
      for (const change of approved) {
        if (!change.changeType.startsWith('folder_')) continue
        if (change.changeType === 'folder_deleted' && change.folderId) {
          const deletedIds = descendantFolderIds(manifest.folders, change.folderId)
          manifest.folders = manifest.folders.filter((folder) => !deletedIds.has(folder.folderId))
          continue
        }
        if (!change.folderId || !change.localPathAfter) continue
        const existing = manifest.folders.find((folder) => folder.folderId === change.folderId)
        if (existing) {
          existing.localPath = change.localPathAfter
          existing.name = change.folderNameAfter ?? folderNameFromPath(change.localPathAfter)
          existing.updatedAt = now
        } else {
          manifest.folders.push({
            folderId: change.folderId,
            localPath: change.localPathAfter,
            name: change.folderNameAfter ?? folderNameFromPath(change.localPathAfter),
            updatedAt: now,
          })
        }
      }

      manifest.generatedAt = now
      await writeJson(join(config.workspacePath, '_system', 'manifest.json'), manifest)
    }
    await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes: remaining })

    spinner.succeed(chalk.green(`✓ ${applied} mudança(s) aplicada(s) com sucesso!`))
    if (remaining.length > 0) {
      console.log(
        chalk.dim(`  ${remaining.length} mudança(s) rejeitadas ou pendentes permaneceram.`),
      )
    }
  } catch (err) {
    spinner.fail(chalk.red(`Falha no push: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }
}

function folderNameFromPath(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? 'pasta'
}

function descendantFolderIds(
  folders: NonNullable<Manifest['folders']>,
  rootId: string,
): Set<string> {
  const ids = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.folderId)) {
        ids.add(folder.folderId)
        changed = true
      }
    }
  }
  return ids
}
