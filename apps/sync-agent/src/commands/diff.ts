import { join } from 'path'
import { readFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson } from '../lib/workspace.js'
import { parseItemFile } from '@doit/md'
import { hashContent } from '@doit/sync'
import { assessRisk } from '@doit/audit'
import { newChangeId } from '@doit/core'
import type { Manifest, ManifestEntry } from '@doit/sync'
import type { PendingChange } from '@doit/types'

export async function diffCommand() {
  const spinner = ora('Analisando mudanças...').start()
  const config = getConfig()

  const manifest = await readJson<Manifest>(join(config.workspacePath, '_system', 'manifest.json'))
  if (!manifest) {
    spinner.fail('Nenhum manifest encontrado. Execute doit-sync pull primeiro.')
    process.exit(1)
  }

  const changes: PendingChange[] = []
  const now = new Date().toISOString()

  for (const entry of manifest.entries) {
    const absPath = join(config.workspacePath, entry.localPath)
    try {
      const raw = await readFile(absPath, 'utf-8')
      const currentHash = hashContent(raw)

      if (currentHash !== entry.syncHash) {
        const { frontmatter, content } = parseItemFile(raw)

        // Detectar que tipo de mudança é
        const frontmatterChanges: { field: string; before: unknown; after: unknown }[] = []
        if (frontmatter.title !== entry.localPath.split('/').pop()?.replace('.md', '').replace(/-/g, ' ')) {
          // não compara com slug; só registra que o title pode ter mudado
        }

        const changeType = content ? 'content_changed' : 'frontmatter_changed'

        changes.push({
          id: newChangeId(),
          userId: config.userId,
          itemId: entry.itemId,
          changeType,
          localPathBefore: entry.localPath,
          localPathAfter: entry.localPath,
          titleAfter: frontmatter.title,
          contentMdAfter: content,
          frontmatterChanges,
          riskLevel: assessRisk(changeType),
          approved: false,
          createdAt: now,
        })
      }
    } catch {
      changes.push({
        id: newChangeId(),
        userId: config.userId,
        itemId: entry.itemId,
        changeType: 'deleted',
        localPathBefore: entry.localPath,
        riskLevel: 'high',
        approved: false,
        createdAt: now,
      })
    }
  }

  // Salvar localmente
  await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes })
  await writeJson(join(config.workspacePath, '_system', 'last-diff.json'), {
    at: now,
    count: changes.length,
  })

  // Upload para a API (pending-batch)
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
        spinner.warn(chalk.yellow('Mudanças detectadas localmente mas falha ao enviar para a API.'))
      } else {
        // Log na API
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
      // offline — sem problema, as mudanças estão salvas localmente
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
    console.log(
      `  ${riskColor(`[${c.riskLevel.toUpperCase()}]`)} ${c.changeType.replace(/_/g, ' ')} — ${c.localPathBefore ?? c.localPathAfter ?? c.itemId}`,
    )
  }

  console.log(chalk.dim('\n  Revise e aprove no app → doit-sync push'))
}
