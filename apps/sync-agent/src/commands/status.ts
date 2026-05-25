import { join } from 'path'
import chalk from 'chalk'
import { getConfig, isInitialized, isLoggedIn } from '../lib/config.js'
import { readJson } from '../lib/workspace.js'
import type { PendingChange } from '@doit/types'
import type { DriveIndex } from '../drive/indexer.js'
import { reconcileDrive } from '../drive/reconcile.js'

export async function statusCommand() {
  if (!isInitialized()) {
    console.log(chalk.red('Workspace não inicializado. Execute: doit-sync init'))
    return
  }
  if (!isLoggedIn()) {
    console.log(chalk.red('Não autenticado. Execute: doit-sync login'))
    return
  }

  const config = getConfig()

  const lastPull = await readJson<{ at: string; count?: number; itemCount?: number }>(
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
  const lastPullCount = lastPull?.itemCount ?? lastPull?.count ?? 0

  console.log(chalk.bold('\n  doit.md Sync — Status\n'))
  console.log(`  Workspace: ${chalk.dim(config.workspacePath)}`)
  console.log(`  API: ${chalk.dim(config.apiUrl)}\n`)

  console.log(
    `  Último pull: ${lastPull ? chalk.green(lastPull.at) + chalk.dim(` (${lastPullCount} itens)`) : chalk.dim('nunca')}`,
  )
  console.log(
    `  Último diff: ${lastDiff ? chalk.yellow(lastDiff.at) + chalk.dim(` (${lastDiff.count} changes)`) : chalk.dim('nunca')}`,
  )
  console.log(
    `  Último push: ${lastPush ? chalk.green(lastPush.at) + chalk.dim(` (${lastPush.count} enviados)`) : chalk.dim('nunca')}`,
  )

  const pendingCount = pending?.changes.length ?? 0
  const approvedCount = pending?.changes.filter((c) => c.approved).length ?? 0

  console.log(`\n  Pendentes: ${pendingCount > 0 ? chalk.yellow(pendingCount) : chalk.green('0')}`)
  console.log(`  Aprovados: ${chalk.green(approvedCount)}\n`)

  const driveIndex = await readJson<DriveIndex>(
    join(config.workspacePath, '_system', 'drive-index.json'),
  )
  if (driveIndex) {
    const total = Object.keys(driveIndex.files).length
    const report = await reconcileDrive(config.workspacePath, driveIndex)
    console.log(chalk.bold('  Drive'))
    console.log(
      `    Total indexado: ${chalk.dim(total)} (atualizado ${chalk.dim(driveIndex.updatedAt)})`,
    )
    console.log(`    Linkados: ${chalk.green(report.linked.length)}`)
    console.log(
      `    Broken: ${report.broken.length > 0 ? chalk.red(report.broken.length) : chalk.green('0')}`,
    )
    console.log(
      `    Inbox pendente: ${report.inboxPending.length > 0 ? chalk.yellow(report.inboxPending.length) : chalk.green('0')}`,
    )
    console.log(
      `    Órfãos: ${report.orphans.length > 0 ? chalk.yellow(report.orphans.length) : chalk.green('0')}`,
    )
    console.log()
  }
}
