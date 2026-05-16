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

Quando o usuário conecta o Drive, os anexos (PDFs, imagens, planilhas) ficam guardados no Google Drive dele — **não há cópia local** neste workspace. A organização das pastas no Drive **espelha automaticamente** a árvore de pastas deste workspace: o anexo de uma nota fica na pasta do Drive correspondente à pasta da nota.

- Cada anexo aparece numa nota como um link \`https://drive.google.com/file/d/<fileId>/view\`. **Nunca edite o \`<fileId>\`** — é a identidade do arquivo, sobrevive a renames e moves.
- O índice \`_system/drive-index.json\` mapeia cada \`<fileId>\` para nome, tipo e localização no Drive.
- **Para reorganizar anexos, mova as NOTAS entre pastas.** Ao mover uma nota para outra pasta, o anexo dela migra sozinho para a pasta correspondente no Drive no próximo \`push\`. Você nunca mexe no Drive diretamente.
- **Para ler o conteúdo de um anexo**, rode \`doit-sync drive get <fileId>\` — baixa o arquivo para \`_system/drive-cache/<fileId>\` e imprime o caminho.
- A \`_inbox/\` do Drive recebe arquivos que o usuário ainda não associou a nenhuma nota. Os pendentes estão em \`_system/inbox.json\`. Para processar cada pendente:
  1. Se precisar inspecionar o conteúdo, use \`doit-sync drive get <fileId>\`.
  2. Crie uma nota Markdown na pasta de projeto adequada, referenciando o arquivo via \`[nome](https://drive.google.com/file/d/<fileId>/view)\`.
  3. No próximo \`push\`, o anexo sai da \`_inbox/\` e migra para a pasta do projeto da nota — automaticamente.

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
