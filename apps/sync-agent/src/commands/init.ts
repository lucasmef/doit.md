import { join } from 'path'
import { writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { ensureWorkspace, writeJson } from '../lib/workspace.js'
import { saveConfig } from '../lib/config.js'

const AGENTS_MD = `# AGENTS.md

## Objetivo

Organizar este workspace de notas, tarefas, projetos e documentos do Clarity.

## Regras obrigatórias

1. Nunca apagar arquivos.
2. Nunca remover o campo \`id\` do frontmatter.
3. Nunca alterar \`syncHash\` manualmente.
4. Nunca editar arquivos dentro de \`_system\`.
5. Pode mover arquivos entre as pastas permitidas.
6. Pode renomear arquivos para nomes mais claros.
7. Pode atualizar \`title\`, \`tags\`, \`complexity\`, \`status\`, \`project\` e \`area\`.
8. Se houver dúvida, mover para \`/00-inbox\`.
9. Toda alteração relevante deve ser resumida em \`_changes/summary.md\`.

## Estrutura de pastas

- \`/00-inbox\` — capturas sem organização
- \`/10-projetos\` — notas e tarefas de projetos ativos
- \`/20-notas\` — notas gerais e documentos
- \`/90-arquivo\` — itens concluídos ou arquivados

## Formato obrigatório de frontmatter

\`\`\`yaml
id:
title:
complexity:
status:
project:
area:
tags:
dueDate:
updatedAt:
syncHash:
\`\`\`

## Uso de tarefas

\`\`\`md
- [ ] Tarefa pendente
- [x] Tarefa concluída
\`\`\`

## Saída esperada

Ao finalizar, atualizar \`_changes/summary.md\` com um resumo das alterações realizadas.
`

export async function initCommand() {
  const spinner = ora('Inicializando workspace...').start()

  try {
    const workspacePath = join(process.cwd(), 'workspace-clarity')
    await ensureWorkspace(workspacePath)

    await writeFile(join(workspacePath, 'AGENTS.md'), AGENTS_MD, 'utf-8')
    await writeFile(
      join(workspacePath, 'README.md'),
      `# Clarity Workspace\n\nEste diretório é o espelho local dos seus itens do Clarity.\n\nLeia o [AGENTS.md](./AGENTS.md) para entender como a IA pode interagir com os arquivos.\n`,
      'utf-8',
    )

    await writeJson(join(workspacePath, '_system', 'sync-state.json'), {
      lastPull: null,
      lastDiff: null,
      lastPush: null,
    })

    await writeJson(join(workspacePath, '_changes', 'pending.json'), { changes: [] })

    // Solicitar configuração
    const apiUrl = process.env['CLARITY_API_URL'] ?? 'http://localhost:3000'
    const apiKey = process.env['CLARITY_API_KEY'] ?? ''
    const userId = process.env['CLARITY_USER_ID'] ?? ''

    saveConfig({ apiUrl, apiKey, workspacePath, userId })

    spinner.succeed(chalk.green('Workspace inicializado com sucesso!'))
    console.log(chalk.dim(`  Pasta: ${workspacePath}`))
    console.log(chalk.dim('  Configure CLARITY_API_KEY e CLARITY_USER_ID nas variáveis de ambiente.'))
    console.log(chalk.dim('  Execute: clarity-sync pull'))
  } catch (err) {
    spinner.fail('Falha ao inicializar workspace')
    console.error(err)
    process.exit(1)
  }
}
