import { join } from 'path'
import { writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '../lib/config.js'
import { writeJson } from '../lib/workspace.js'
import { serializeItemFile, itemFilename } from '@clarity/md'
import { hashContent } from '@clarity/sync'
import type { Item } from '@clarity/types'
import type { ManifestEntry } from '@clarity/sync'

export async function pullCommand() {
  const spinner = ora('Baixando itens...').start()

  try {
    const config = getConfig()

    const res = await fetch(`${config.apiUrl}/api/items?userId=${config.userId}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })

    if (!res.ok) throw new Error(`API retornou ${res.status}`)

    const { items } = (await res.json()) as { items: Item[] }

    const entries: ManifestEntry[] = []

    for (const item of items) {
      const folder = item.status === 'archived' ? '90-arquivo' : '00-inbox'
      const filename = itemFilename(item)
      const relativePath = `${folder}/${filename}`
      const absolutePath = join(config.workspacePath, relativePath)

      const content = serializeItemFile(item)
      const hash = hashContent(content)

      await writeFile(absolutePath, content, 'utf-8')

      entries.push({
        itemId: item.id,
        localPath: relativePath,
        syncHash: hash,
        updatedAt: item.updatedAt,
      })
    }

    const manifest = { version: 1 as const, generatedAt: new Date().toISOString(), entries }
    await writeJson(join(config.workspacePath, '_system', 'manifest.json'), manifest)
    await writeJson(join(config.workspacePath, '_system', 'last-pull.json'), {
      at: new Date().toISOString(),
      count: items.length,
    })

    spinner.succeed(chalk.green(`${items.length} itens sincronizados`))
  } catch (err) {
    spinner.fail('Falha no pull')
    console.error(err)
    process.exit(1)
  }
}
