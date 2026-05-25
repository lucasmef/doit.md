import { join, resolve } from 'path'
import { writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { ensureWorkspace, writeJson } from '../lib/workspace.js'
import { saveConfig, isLoggedIn } from '../lib/config.js'
import { DEFAULT_AGENTS_MD } from '../lib/agents-template.js'

export async function initCommand(pathArg?: string) {
  const spinner = ora('Inicializando workspace...').start()

  try {
    const workspacePath = resolve(pathArg ?? join(process.cwd(), 'workspace-doitmd'))
    await ensureWorkspace(workspacePath)

    await writeFile(join(workspacePath, 'AGENTS.md'), DEFAULT_AGENTS_MD, 'utf-8')
    await writeFile(
      join(workspacePath, 'README.md'),
      `# doit.md Workspace\n\nEspelho local dos itens do doit.md.\n\nLeia o [AGENTS.md](./AGENTS.md) para entender como editar (humanos e IA).\n`,
      'utf-8',
    )

    await writeJson(join(workspacePath, '_system', 'sync-state.json'), {
      lastPull: null,
      lastDiff: null,
      lastPush: null,
    })

    await writeJson(join(workspacePath, '_changes', 'pending.json'), { changes: [] })

    saveConfig({ workspacePath })

    spinner.succeed(chalk.green('Workspace inicializado!'))
    console.log(chalk.dim(`  Pasta: ${workspacePath}`))
    if (!isLoggedIn()) {
      console.log(chalk.dim('  Proximo passo: doit-sync login'))
    } else {
      console.log(chalk.dim('  Proximo passo: doit-sync pull'))
    }
  } catch (err) {
    spinner.fail('Falha ao inicializar workspace')
    console.error(err)
    process.exit(1)
  }
}
