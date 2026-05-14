import { join, resolve } from 'path'
import { writeFile } from 'fs/promises'
import chalk from 'chalk'
import ora from 'ora'
import { ensureWorkspace, writeJson } from '../lib/workspace.js'
import { saveConfig, isLoggedIn } from '../lib/config.js'

const AGENTS_MD = `# AGENTS.md

Este workspace é o espelho local dos itens do **doit.md** sincronizados via CLI \`doit-sync\`. Você (assistente IA) pode editar livremente os arquivos para reorganizar, melhorar títulos, ajustar tags ou corrigir o conteúdo das notas e tarefas.

## Regras obrigatórias

1. **Nunca apagar arquivos.** Para descartar um item, mova para \`_arquivo/\`.
2. **Nunca remover ou alterar o campo \`id\`** do frontmatter — é a referência do servidor.
3. **Nunca editar \`syncHash\`** manualmente — ele é recalculado pelo CLI.
4. **Nunca editar arquivos dentro de \`_system/\`, \`_changes/\` ou \`_raw_archive/\`** — são estado interno do CLI.
5. **Pode mover arquivos** entre pastas — o CLI detecta movimento e atualiza o \`folderId\` no servidor.
6. **Pode renomear arquivos** para nomes mais claros (slug).
7. **Pode atualizar** \`title\`, \`tags\`, \`complexity\`, \`status\`, \`priority\`, \`dueDate\` no frontmatter.
8. Se houver dúvida sobre onde colocar algo, deixe em \`Inbox/\`.

## Estrutura de pastas

- \`Inbox/\` — itens sem pasta atribuída (notas avulsas, tarefas sem data)
- \`Proximos/\` — tarefas com data marcada mas sem pasta
- \`_arquivo/\` — itens com status \`archived\`
- \`_raw_archive/\` — snapshots locais dos arquivos brutos que o CLI detectou como alterados
- \`<NomeDaPasta>/\` — pastas reais do usuário, com subpastas espelhando a árvore do app

## Frontmatter padrão

\`\`\`yaml
---
id: itm_xxx              # NUNCA alterar
title: Título do item
complexity: task         # task | note (define se vira tarefa ou nota no app)
status: todo             # inbox | todo | doing | waiting | done | archived
priority: 2              # 1 (mais alta) – 4 (mais baixa). Só para tasks.
dueDate: 2026-05-15      # YYYY-MM-DD opcional
tags: [trabalho, urgente]
syncHash: abc123def456   # NUNCA alterar manualmente
updatedAt: 2026-05-10T14:00:00Z
---
\`\`\`

## Tarefas dentro do conteúdo

\`\`\`md
- [ ] Subtarefa pendente
- [x] Subtarefa concluída
\`\`\`

## Como mudanças são aplicadas

1. Você edita um \`.md\` aqui.
2. O usuário roda \`doit-sync diff\` — detecta as mudanças e envia para a tela de **Auditoria** no app.
3. O usuário aprova as mudanças no app.
4. O usuário roda \`doit-sync push\` — aplica as mudanças aprovadas no servidor.

Mudanças destrutivas (delete, mudança de complexity, movimento entre pastas raiz) sempre exigem aprovação. Pequenas edições de conteúdo/tags vão direto após aprovação.

## Anexos via Google Drive

Quando o usuário conectou o Drive, arquivos privados ficam em \`drive/\` (espelho do Google Drive for Desktop).

- O ID canônico de cada arquivo está em \`_system/drive-index.json\`. Para saber a qual arquivo local um link \`https://drive.google.com/file/d/<fileId>/view\` se refere, busque o \`<fileId>\` no índice e use o campo \`path\`.
- **Nunca edite o \`<fileId>\`** dentro de URLs do Drive — ele é a identidade do arquivo, sobrevive a renames e moves.
- Você pode **mover, renomear e organizar** livremente os arquivos dentro de \`drive/\` (subpastas semânticas, etc.). O \`fileId\` é preservado e o índice é refeito no próximo \`pull\`.
- A pasta \`drive/_inbox/\` recebe arquivos novos que o usuário ainda não associou a nenhuma nota. A lista de pendentes está em \`_system/inbox.json\`. Para processar cada pendente:
  1. Leia o arquivo do disco (\`path\` do índice).
  2. Crie ou enriqueça uma nota Markdown referenciando o arquivo via \`[nome](https://drive.google.com/file/d/<fileId>/view)\`.
  3. Mova o arquivo de \`drive/_inbox/\` para uma subpasta semântica dentro de \`drive/\` (ex.: \`drive/Projetos/X/\`).

## Saída esperada

Ao terminar uma sessão de organização, atualize \`_changes/summary.md\` com um resumo curto do que mudou e por quê.
`

export async function initCommand(pathArg?: string) {
  const spinner = ora('Inicializando workspace...').start()

  try {
    const workspacePath = resolve(pathArg ?? join(process.cwd(), 'workspace-doitmd'))
    await ensureWorkspace(workspacePath)

    await writeFile(join(workspacePath, 'AGENTS.md'), AGENTS_MD, 'utf-8')
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
      console.log(chalk.dim('  Próximo passo: doit-sync login'))
    } else {
      console.log(chalk.dim('  Próximo passo: doit-sync pull'))
    }
  } catch (err) {
    spinner.fail('Falha ao inicializar workspace')
    console.error(err)
    process.exit(1)
  }
}
