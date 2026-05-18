export const DEFAULT_AGENTS_MD = `# AGENTS.md

Este arquivo e gerado pelo \`doit-sync\` a cada \`pull\`. Nao edite aqui.
Regras especificas suas ficam em \`AGENTS.local.md\` na raiz e/ou dentro de pastas.
Leia o \`AGENTS.local.md\` aplicavel junto com este arquivo; ele complementa estas regras.

## Regras obrigatorias

1. Nunca apagar arquivos. Para descartar um item, mova para \`_arquivo/\`.
2. Nunca remover ou alterar o campo \`id\` do frontmatter.
3. Nunca editar \`syncHash\` manualmente; ele e recalculado pelo CLI.
4. Nunca editar arquivos dentro de \`_system/\`, \`_changes/\` ou \`_raw_archive/\`.
5. Pode mover arquivos entre pastas; o CLI detecta movimento e atualiza o servidor.
6. Pode renomear arquivos para nomes mais claros.
7. Pode atualizar \`title\`, \`tags\`, \`complexity\`, \`status\`, \`priority\` e \`dueDate\`.
8. Se houver duvida sobre onde colocar algo, deixe em \`Inbox/\`.

## Estrutura

- \`Inbox/\`: itens sem pasta atribuida.
- \`Proximos/\`: tarefas com data marcada mas sem pasta.
- \`_arquivo/\`: itens arquivados.
- \`_raw_archive/\`: snapshots locais preservados pelo CLI.
- \`<NomeDaPasta>/\`: pastas reais do usuario.

## Fluxo

1. Edite arquivos Markdown neste workspace.
2. O usuario roda \`doit-sync diff\`.
3. O usuario aprova mudancas sensiveis no app.
4. O usuario roda \`doit-sync push\`.

Mudancas destrutivas ou estruturais exigem aprovacao na Auditoria.

## Anexos via Google Drive

Anexos ficam no Google Drive do usuario e aparecem como links:
\`https://drive.google.com/file/d/<fileId>/view\`.
Nunca edite o \`<fileId>\`. Para ler um anexo, use \`doit-sync drive get <fileId>\`.

## Saida esperada

Ao terminar uma sessao de organizacao, atualize \`_changes/summary.md\` com um resumo curto.
`
