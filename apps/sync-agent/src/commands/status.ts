import { join } from 'path'
import chalk from 'chalk'
import { getConfig, isConfigured } from '../lib/config.js'
import { readJson } from '../lib/workspace.js'
import type { PendingChange } from '@doit/types'

export async function statusCommand() {
  if (!isConfigured()) {
    console.log(chalk.red('Workspace não inicializado. Execute: doit-sync init'))
    return
  }

  const config = getConfig()

  const lastPull = await readJson<{ at: string; count: number }>(
    join(config.workspacePath, '_system', 'last-pull.json'),
  )
  const lastDiff = await readJson<{ at: string; count: number }>(
    join(config.workspacePath, '_system', 'last-diff.json'),
  )
  const lastPush = await readJson<{ at: string; count: number }>(
    join(config.workspacePath, '_system', 'last-push.json'),
  )
  const pending = await readJson<{ changes: PendingChange[] }>(
    join(config.workspacePath, '_changes', 'pending.json'),
  )

  console.log(chalk.bold('\n  doit.md Sync — Status\n'))
  console.log(`  Workspace: ${chalk.dim(config.workspacePath)}`)
  console.log(`  API: ${chalk.dim(config.apiUrl)}\n`)

  console.log(`  Último pull: ${lastPull ? chalk.green(lastPull.at) + chalk.dim(` (${lastPull.count} itens)`) : chalk.dim('nunca')}`)
  console.log(`  Último diff: ${lastDiff ? chalk.yellow(lastDiff.at) + chalk.dim(` (${lastDiff.count} changes)`) : chalk.dim('nunca')}`)
  console.log(`  Último push: ${lastPush ? chalk.green(lastPush.at) + chalk.dim(` (${lastPush.count} enviados)`) : chalk.dim('nunca')}`)

  const pendingCount = pending?.changes.length ?? 0
  const approvedCount = pending?.changes.filter((c) => c.approved).length ?? 0

  console.log(`\n  Pendentes: ${pendingCount > 0 ? chalk.yellow(pendingCount) : chalk.green('0')}`)
  console.log(`  Aprovados: ${chalk.green(approvedCount)}\n`)
}
