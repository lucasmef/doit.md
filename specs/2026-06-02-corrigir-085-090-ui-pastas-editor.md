# Corrigir IDs 085-090 - Editor, Pastas, Kanban, Hoje e Topbar

## Metadata

- Status: done
- Mode: bugfix
- Complexity: high
- Created: 2026-06-02
- Updated: 2026-06-02

## Objective

Corrigir somente os IDs pendentes 085, 086, 087, 088, 089 e 090, mantendo intactos os itens ja confirmados como OK. O lote melhora o aproveitamento horizontal do editor de notas, estabiliza o seletor de pasta, adiciona foco ao Kanban de pastas, ajusta o alinhamento visual da pagina Hoje, corrige a regra de concluidos no Kanban e reduz o espaco vertical do menu superior no desktop.

## Context

- BuilderFlow foi usado como workflow principal; `doit-workflow` foi usado como complemento por tocar Items, Pastas e UI do app.
- Specs recentes confirmam IDs 060-084 como OK; este trabalho nao deve reabrir esses fluxos.
- Editor imersivo de notas vive em `apps/web/src/app/(app)/notas/[id]/page.tsx` e usa `MarkdownEditor` com `variant="sheet"`.
- O seletor de pasta existe no QuickCapture e no ItemDetail; ambos usam `flattenFolderOptions`.
- Kanban de pastas e regra de concluidos vivem em `apps/web/src/app/(app)/notas/page.tsx`.
- A pagina Hoje usa CSS dedicado em `apps/web/src/app/(app)/today/today.css`.
- O menu superior desktop e o espaçamento externo ficam em `Topbar` e `AppChrome`.

## Scope

- [x] ID 085 - Ajustar largura util do editor normal e modo foco.
- [x] ID 086 - Corrigir seletor de pasta com rolagem estavel, busca e ordenacao alfabetica.
- [x] ID 087 - Adicionar modo foco ao Kanban das pastas.
- [x] ID 088 - Alinhar ou remover o risco vertical colorido na pagina Hoje.
- [x] ID 089 - Kanban respeita configuracao de concluidos da pasta aberta.
- [x] ID 090 - Reduzir margem vertical do menu superior no desktop.

## Out of scope

- Refatoracao ampla do editor, Kanban ou pagina Hoje.
- Alterar schemas, sync Markdown ou campos protegidos de Item.
- Mudar drag and drop caso nao exista implementacao atual neste Kanban.
- Reabrir IDs 060-084 e outros marcados como OK.
- Mudar deploy, auth, dados persistidos ou regras de auditoria.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e os arquivos existentes indicam ajustes locais de UI e uma regra de filtro. Nao ha decisao arquitetural, alteracao de dados protegidos ou regra de negocio ambigua que exija pergunta ao usuario.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] ID 085: editor de nota usa melhor largura no modo normal e no modo foco, com limite razoavel em telas grandes e sem quebrar mobile.
- [x] ID 086: seletor de pasta permite rolar sem fechar, possui busca, lista pastas/subpastas alfabeticamente e permite cancelar sem alterar selecao.
- [x] ID 087: Kanban de pastas tem acao clara de foco, usa mais tela e permite sair do foco.
- [x] ID 088: linha vertical de prioridade em Hoje nao parece desalinhada com checkbox, desktop e mobile.
- [x] ID 089: Kanban da pasta principal oculta concluidos conforme a pasta aberta, mesmo quando subpasta mostra concluidos; ao entrar na subpasta, sua regra propria permanece.
- [x] ID 090: topbar desktop ocupa menos altura vertical nas paginas principais sem apertar botoes.

## Implementation plan

- [x] ID 085: ampliar container do editor para max-width maior e ajustar foco para largura dedicada.
- [x] ID 086: ordenar arvore no helper compartilhado e separar busca/cabecalho da lista rolavel nos seletores.
- [x] ID 087: criar estado de foco do Kanban e renderizar o quadro em overlay fullscreen responsivo.
- [x] ID 088: reposicionar/remover sombra lateral de prioridade para alinhar com a linha/checkbox.
- [x] ID 089: trocar filtro das colunas Kanban para usar `hideCompleted` da pasta atual, nao da subpasta.
- [x] ID 090: reduzir padding/margens desktop do chrome/topbar preservando altura dos controles.
- [x] Rodar checks disponiveis e validacao visual local com screenshots.

## Progress

- 2026-06-02 - Lidas skills BuilderFlow e doit-workflow, `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md` e specs recentes.
- 2026-06-02 - Mapeados arquivos de editor, seletor de pasta, Pastas/Kanban, Hoje e topbar.
- 2026-06-02 - Criada esta spec antes da implementacao.
- 2026-06-02 - Implementados ajustes locais para IDs 085-090.
- 2026-06-02 - Type-check e lint passaram. Build compilou e falhou no passo final de symlink standalone por EPERM no OneDrive/Windows, problema ja visto em specs anteriores.
- 2026-06-02 - Validacao visual Playwright passou para todos os IDs, desktop e mobile quando aplicavel. Screenshots salvos em `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/`.
- 2026-06-02 - Browser integrado abriu `http://127.0.0.1:3300/today` e redirecionou para login por nao compartilhar a sessao de teste. Validacao completa foi feita por Playwright com usuario de teste.
- 2026-06-02 - Servidor temporario `pnpm --filter @doit/web exec next dev -p 3300 -H 127.0.0.1` iniciado com PID 9416 e listener filho 8576; ambos encerrados, sem listener restante na porta 3300.

## Decisions

- Decision: corrigir a ordenacao de pastas no helper `flattenFolderOptions`.
  Reason: o helper e compartilhado pelos seletores relevantes e preserva a hierarquia com subpastas alfabeticas.
  ADR needed: no
- Decision: implementar foco do Kanban como overlay local, sem alterar rota ou schema.
  Reason: entrega tela cheia reversivel e isolada do modo lista.
  ADR needed: no
- Decision: ajustar o marcador de prioridade da pagina Hoje via CSS, sem remover prioridade.
  Reason: mantem a informacao visual existente e resolve o desalinhamento.
  ADR needed: no
- Decision: usar a configuracao `hideCompleted` da pasta aberta para montar colunas Kanban.
  Reason: atende ao ID 089 e preserva a regra propria quando o usuario entra diretamente em uma subpasta.
  ADR needed: no
- Decision: reduzir rails laterais do editor normal em vez de remover completamente os paineis.
  Reason: aumenta o texto util no fluxo normal e preserva contexto de pastas/metadados.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/notas/[id]/page.tsx` - largura util do editor normal/foco e rails laterais mais compactas.
- `apps/web/src/app/(app)/notas/page.tsx` - modo foco do Kanban e regra de concluidos baseada na pasta aberta.
- `apps/web/src/app/(app)/today/today.css` - remocao do risco vertical e prioridade aplicada ao checkbox.
- `apps/web/src/components/folders/folder-options.tsx` - ordenacao alfabetica hierarquica dos seletores de pasta.
- `apps/web/src/components/items/item-detail.tsx` - seletor de pasta com busca fixa, lista rolavel e cancelar explicito.
- `apps/web/src/components/items/quick-capture.tsx` - seletor de pasta com lista rolavel estavel.
- `apps/web/src/components/layout/app-chrome.tsx` - menor margem/padding desktop em volta da topbar.
- `apps/web/src/components/layout/topbar.tsx` - topbar desktop mais compacta preservando botoes.
- `specs/validate-085-090.mjs` - validacao Playwright focada nos IDs 085-090.
- `specs/2026-06-02-corrigir-085-090-ui-pastas-editor.md` - spec BuilderFlow do lote.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `BASE_URL=http://127.0.0.1:3300 node specs\validate-085-090.mjs`

Results:

- Type-check: passed.
- Lint: passed with pre-existing warnings for `<img>`, hook dependencies, custom font loading and Next lint deprecation.
- Build: compile, lint/type validation, static generation and trace collection completed; final standalone copy failed with `EPERM: operation not permitted, symlink ...` under OneDrive/Windows.
- Frontend validation: passed all scripted checks for IDs 085-090.
- Temporary server: `pnpm --filter @doit/web exec next dev -p 3300 -H 127.0.0.1`, PID 9416 with listener child 8576; stopped after validation, no listener remained on port 3300.
- Global screenshot copy: script attempted to create/copy to `G:\Meu Drive\.agentes`; no failure was reported in the final validation run.

Frontend evidence:

- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/01-doitmd-editor-normal-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/02-doitmd-editor-focus-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/03-doitmd-editor-mobile-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/04-doitmd-folder-picker-open-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/05-doitmd-folder-picker-search-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/06-doitmd-kanban-normal-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/07-doitmd-kanban-focus-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/08-doitmd-kanban-subfolder-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/09-doitmd-today-topbar-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/10-doitmd-today-mobile-2026-06-02.png`
- `specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor/resultados.json`

## Risks

- Risk: screenshots podem expor dados reais da base local.
  Mitigation: usar dados de teste/seed em validacao automatizada sempre que possivel.
- Risk: build em Windows/OneDrive pode falhar no passo de symlink standalone.
  Mitigation: registrar resultado exato se ocorrer e validar runtime via dev server.

## Next step

Review manual e PR `dev` -> `main`.
