import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { readJson, writeJson } from '../lib/workspace.js'
import type { PendingChange } from '@clarity/types'

export async function pushCommand() {
  const config = getConfig()
  const pending = await readJson<{ changes: PendingChange[] }>(
    join(config.workspacePath, '_changes', 'pending.json'),
  )

  if (!pending || pending.changes.length === 0) {
    console.log(chalk.green('Nenhuma mudança pendente para enviar.'))
    return
  }

  const approved = pending.changes.filter((c) => c.approved)
  const highRiskBlocked = approved.filter((c) => c.riskLevel === 'high')

  if (highRiskBlocked.length > 0) {
    console.log(chalk.red(`${highRiskBlocked.length} alteração(ões) de alto risco bloqueada(s).`))
    console.log(chalk.dim('Aprove explicitamente no app antes de fazer push.'))
    return
  }

  if (approved.length === 0) {
    console.log(chalk.yellow('Nenhuma mudança aprovada. Aprove no app e execute novamente.'))
    return
  }

  const spinner = ora(`Enviando ${approved.length} alteração(ões)...`).start()

  try {
    const res = await fetch(`${config.apiUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ changes: approved, userId: config.userId }),
    })

    if (!res.ok) throw new Error(`API retornou ${res.status}`)

    await writeJson(join(config.workspacePath, '_system', 'last-push.json'), {
      at: new Date().toISOString(),
      count: approved.length,
    })

    await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes: [] })

    spinner.succeed(chalk.green(`${approved.length} alteração(ões) enviada(s) com sucesso!`))
  } catch (err) {
    spinner.fail('Falha no push')
    console.error(err)
    process.exit(1)
  }
}
