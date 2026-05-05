import { join } from 'path'
import { readFile, readdir } from 'fs/promises'
import chalk from 'chalk'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson } from '../lib/workspace.js'
import { parseItemFile } from '@clarity/md'
import { hashContent } from '@clarity/sync'
import { assessRisk } from '@clarity/audit'
import type { Manifest, ManifestEntry } from '@clarity/sync'
import type { PendingChange } from '@clarity/types'
import { newChangeId } from '@clarity/core'

export async function diffCommand() {
  const config = getConfig()
  const manifest = await readJson<Manifest>(join(config.workspacePath, '_system', 'manifest.json'))

  if (!manifest) {
    console.error(chalk.red('Nenhum manifest encontrado. Execute clarity-sync pull primeiro.'))
    process.exit(1)
  }

  const manifestByPath = new Map<string, ManifestEntry>(
    manifest.entries.map((e) => [e.localPath, e]),
  )

  const changes: PendingChange[] = []

  for (const entry of manifest.entries) {
    const absPath = join(config.workspacePath, entry.localPath)
    try {
      const raw = await readFile(absPath, 'utf-8')
      const currentHash = hashContent(raw)

      if (currentHash !== entry.syncHash) {
        const { frontmatter, content } = parseItemFile(raw)
        const changeType = frontmatter.title !== entry.localPath.split('/').pop()?.replace('.md', '')
          ? 'frontmatter_changed'
          : 'content_changed'

        changes.push({
          id: newChangeId(),
          userId: config.userId,
          itemId: entry.itemId,
          changeType,
          localPathBefore: entry.localPath,
          localPathAfter: entry.localPath,
          titleAfter: frontmatter.title,
          contentMdAfter: content,
          riskLevel: assessRisk(changeType),
          approved: false,
          createdAt: new Date().toISOString(),
        })
      }
    } catch {
      // arquivo removido
      changes.push({
        id: newChangeId(),
        userId: config.userId,
        itemId: entry.itemId,
        changeType: 'deleted',
        localPathBefore: entry.localPath,
        riskLevel: 'high',
        approved: false,
        createdAt: new Date().toISOString(),
      })
    }
  }

  await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes })
  await writeJson(join(config.workspacePath, '_system', 'last-diff.json'), {
    at: new Date().toISOString(),
    count: changes.length,
  })

  if (changes.length === 0) {
    console.log(chalk.green('Nenhuma alteração detectada.'))
    return
  }

  console.log(chalk.yellow(`${changes.length} alteração(ões) detectada(s):\n`))
  for (const c of changes) {
    const riskColor = c.riskLevel === 'high' ? chalk.red : c.riskLevel === 'medium' ? chalk.yellow : chalk.green
    console.log(`  ${riskColor(`[${c.riskLevel.toUpperCase()}]`)} ${c.changeType} — ${c.localPathBefore ?? c.localPathAfter}`)
  }
  console.log(chalk.dim('\nRevise no app e execute clarity-sync push para aplicar.'))
}
