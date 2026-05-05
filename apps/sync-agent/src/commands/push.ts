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
    console.log(chalk.green('✓ Nenhuma mudança pendente para enviar.'))
    return
  }

  const approved = pending.changes.filter((c) => c.approved)
  const highRiskUnapproved = pending.changes.filter((c) => c.riskLevel === 'high' && !c.approved)

  if (highRiskUnapproved.length > 0) {
    console.log(chalk.red(`\n  ✕ ${highRiskUnapproved.length} mudança(s) de alto risco aguardam aprovação no app.`))
    console.log(chalk.dim('  Acesse a tela de Auditoria para aprovar antes de fazer push.\n'))
    return
  }

  if (approved.length === 0) {
    console.log(chalk.yellow(`  ${pending.changes.length} mudança(s) detectadas mas nenhuma aprovada.`))
    console.log(chalk.dim('  Aprove no app (Auditoria → Mudanças pendentes) e execute novamente.\n'))
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
      body: JSON.stringify({ changes: approved, userId: config.userId }),
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
    const remaining = pending.changes.filter((c) => !approved.find((a) => a.id === c.id))
    await writeJson(join(config.workspacePath, '_changes', 'pending.json'), { changes: remaining })

    spinner.succeed(chalk.green(`✓ ${applied} mudança(s) aplicada(s) com sucesso!`))
    if (remaining.length > 0) {
      console.log(chalk.dim(`  ${remaining.length} mudança(s) rejeitadas ou pendentes permaneceram.`))
    }
  } catch (err) {
    spinner.fail(chalk.red(`Falha no push: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }
}
