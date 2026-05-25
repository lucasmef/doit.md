import { dirname, isAbsolute, join, resolve } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { DriveNotConnectedError, downloadFile, fetchDriveToken } from '../drive/client.js'

/**
 * `doit-sync drive get <fileId> [dest]` — baixa um anexo do Drive para leitura
 * local pela IA. Sem `dest`, salva em `_system/drive-cache/<fileId>`.
 */
export async function driveGetCommand(fileId: string, dest?: string): Promise<void> {
  const config = getConfig()
  const spinner = ora(`Baixando ${fileId} do Drive...`).start()
  try {
    const token = await fetchDriveToken(config.apiUrl, config.apiKey)
    const data = await downloadFile(token.accessToken, fileId)
    const outPath = dest
      ? isAbsolute(dest)
        ? dest
        : resolve(process.cwd(), dest)
      : join(config.workspacePath, '_system', 'drive-cache', fileId)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, data)
    spinner.succeed(chalk.green(`✓ ${data.length} byte(s) salvos`))
    console.log(outPath)
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      spinner.fail(chalk.red('Drive não conectado para esta conta.'))
    } else {
      spinner.fail(
        chalk.red(`Falha ao baixar: ${err instanceof Error ? err.message : String(err)}`),
      )
    }
    process.exit(1)
  }
}

/**
 * `doit-sync drive sync` — pede ao servidor uma varredura completa que
 * reposiciona os anexos no Drive de acordo com a árvore de projetos.
 */
export async function driveSyncCommand(): Promise<void> {
  const config = getConfig()
  const spinner = ora('Reconciliando organização do Drive...').start()
  try {
    const res = await fetch(`${config.apiUrl}/api/drive/reconcile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    if (res.status === 412) {
      spinner.info(chalk.dim('Drive não conectado — nada a reconciliar.'))
      return
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = (await res.json()) as { items?: number; folders?: number }
    spinner.succeed(
      chalk.green(
        `✓ Drive reconciliado (${data.items ?? 0} item(ns), ${data.folders ?? 0} pasta(s)).`,
      ),
    )
  } catch (err) {
    spinner.fail(
      chalk.red(`Falha ao reconciliar: ${err instanceof Error ? err.message : String(err)}`),
    )
    process.exit(1)
  }
}
