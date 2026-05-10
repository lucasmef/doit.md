import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import chalk from 'chalk'
import ora from 'ora'
import { getPartialConfig, saveConfig } from '../lib/config.js'

type LoginOptions = {
  apiUrl?: string
  token?: string
}

const DEFAULT_API_URL = process.env['DOITMD_API_URL'] ?? 'http://localhost:3000'

async function ask(question: string, fallback?: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout })
  try {
    const suffix = fallback ? chalk.dim(` (${fallback})`) : ''
    const answer = (await rl.question(`${question}${suffix}: `)).trim()
    return answer || fallback || ''
  } finally {
    rl.close()
  }
}

export async function loginCommand(options: LoginOptions = {}) {
  const existing = getPartialConfig()
  const apiUrl = options.apiUrl ?? (await ask('URL da API', existing.apiUrl ?? DEFAULT_API_URL))

  const token = options.token ?? (await ask('Cole seu CLI token (gere em Configurações → CLI no app)'))
  if (!token) {
    console.error(chalk.red('Token obrigatório.'))
    process.exit(1)
  }
  if (!/^doit_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/.test(token)) {
    console.error(chalk.red('Formato inválido. Esperado: doit_<prefix>_<secret>'))
    process.exit(1)
  }

  const spinner = ora('Validando token...').start()
  try {
    const res = await fetch(`${apiUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      spinner.fail(chalk.red(`Falha na validação (HTTP ${res.status}).`))
      process.exit(1)
    }
    const me = (await res.json()) as { userId: string; email: string; name?: string }

    saveConfig({ apiUrl, apiKey: token, userId: me.userId })

    spinner.succeed(chalk.green(`Autenticado como ${chalk.bold(me.email)}`))
    if (!existing.workspacePath) {
      console.log(chalk.dim('  Próximo passo: doit-sync init'))
    } else {
      console.log(chalk.dim('  Próximo passo: doit-sync pull'))
    }
  } catch (err) {
    spinner.fail(chalk.red('Erro ao validar token.'))
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
