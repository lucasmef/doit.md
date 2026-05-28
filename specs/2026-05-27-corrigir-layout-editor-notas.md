# Corrigir layout editor notas

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-27
- Updated: 2026-05-27

## Objective

Fazer a rota do editor de notas (`/notas/[id]`) seguir o modelo `docs/doitmd-layout-codex-package/desktop/06-editor-toolbar.html`, com editor imersivo em tres colunas, toolbar logo abaixo do topo, folha branca central e trilhos glass laterais.

## Context

O editor atual ja usa `/notas/[id]`, `MarkdownEditor` com TipTap e uma estrutura em tres colunas, mas ainda fica dentro do `AppChrome` padrao com topbar/painel externo. A toolbar do editor tambem aparece dentro do corpo da nota, abaixo das propriedades, enquanto o modelo coloca a toolbar imediatamente abaixo do top bar da folha central.

## Scope

- [x] Revisar mock HTML e implementacao atual do editor.
- [x] Adaptar `AppChrome` para modo imersivo no editor de nota.
- [x] Ajustar `/notas/[id]` para a estrutura visual do mock.
- [x] Permitir que `MarkdownEditor` renderize a toolbar em slot externo.
- [x] Validar type-check e navegador com screenshots.

## Out of scope

- Alterar schema, APIs, sync ou audit.
- Editar arquivos Markdown de itens.
- Implementar editor preview/split completo.

## Grill Gate

Decision: not_needed

Reason:
O usuario apontou um arquivo HTML de referencia claro e a diferenca principal e visual/local. Nao ha decisao de produto ou arquitetura a confirmar.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `/notas/[id]` no desktop ocupa o viewport como o mock, sem topbar externa do app.
- [x] A tela tem sidebar esquerda, folha branca central e rail direito com os mesmos tamanhos base do modelo.
- [x] A toolbar Markdown aparece logo abaixo do top bar da folha central.
- [x] O corpo da nota mantem edicao real via TipTap.
- [x] Evidencia visual salva em `specs/artifacts/2026-05-27-corrigir-layout-editor-notas/`.

## Implementation plan

- [x] Adicionar modo imersivo em `AppChrome` para `/notas/[id]`.
- [x] Adicionar variante/portal de toolbar ao `MarkdownEditor`.
- [x] Reorganizar a pagina do editor para topbar, toolbar, cover, titulo, propriedades e editor.
- [x] Ajustar CSS global para prose/editor sheet conforme o mock.
- [x] Rodar validacoes e registrar resultados.

## Progress

- 2026-05-27 20:28 - Lidos BuilderFlow, doit-workflow, `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md`, mock HTML e specs relacionadas.
- 2026-05-27 20:28 - Identificado que a toolbar real fica dentro do corpo da nota, diferente do mock.
- 2026-05-27 21:05 - Retomado trabalho parcial existente sem reverter alteracoes locais.
- 2026-05-27 21:12 - Ajustado wallpaper imersivo, topbar, toolbar, propriedades, sidebar/rail e prose do editor para seguir `desktop/06-editor-toolbar.html`.
- 2026-05-27 21:19 - Validado `/notas/[id]` com conta QA local e screenshot desktop salvo.
- 2026-05-27 21:22 - Servidor temporario na porta 3000 encerrado; nenhum listener ficou ativo.
- 2026-05-27 21:35 - Corrigido feedback visual: removido o cover roxo do meio do editor e clareadas as cores do wallpaper/rails.
- 2026-05-27 21:38 - Revalidado com Playwright: nenhum bloco gradient grande abaixo da toolbar (`coverLike: 0`) e rails com `rgba(255, 255, 255, 0.86)`.
- 2026-05-27 21:52 - Movidos controles de status, pasta, data, tags e anexos para o painel direito; corpo da nota ficou reservado para titulo e conteudo.
- 2026-05-27 21:56 - Revalidado com Playwright: painel direito contem propriedades/anexos; toolbar nao contem anexo; corpo nao contem labels de status/owner/tags.
- 2026-05-28 00:00 - Identificado que o layout nao estava aparecendo para o usuario porque os cards na tela `/notas` ainda usavam `setSingleSelection` (abrindo o painel lateral) em vez de navegar para `/notas/[id]`.
- 2026-05-28 00:00 - Substituido `setSingleSelection` por `router.push('/notas/[id]')` em `apps/web/src/app/(app)/notas/page.tsx`.

## Decisions

- Decision: manter o TipTap real e mover apenas a renderizacao visual da toolbar para um slot acima do corpo.
  Reason: preserva comportamento de edicao existente e reduz risco.
  ADR needed: no

## Files changed

- `apps/web/src/components/layout/app-chrome.tsx` - modo imersivo especifico para `/notas/[id]` com wallpaper do mock.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - estrutura visual do editor em tres colunas, topbar, propriedades, rail e remocao do cover roxo.
- `apps/web/src/components/items/markdown-editor.tsx` - variante `sheet`, portal da toolbar, portal de anexos no painel direito e ordem/acoes visuais da toolbar.
- `apps/web/src/app/globals.css` - estilos de prose para a folha do editor.
- `apps/web/src/app/(app)/notas/page.tsx` - links dos cards atualizados para navegar para a pagina imersiva em vez de abrir o painel lateral.
- `specs/2026-05-27-corrigir-layout-editor-notas.md` - spec viva da tarefa.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000`
- [x] Playwright local via `pnpm --dir apps/web exec node`

Results:

- `type-check` passou antes e depois da validacao visual.
- `type-check` passou novamente apos a correcao de cores/cover.
- Servidor temporario iniciou em `http://127.0.0.1:3000`; listener registrado em `PID 8856`.
- Browser in-app (`iab`) nao estava disponivel nesta sessao; validacao visual foi feita com Playwright local como fallback.
- Playwright criou conta QA local, criou uma pasta e uma nota, abriu `/notas/[id]` e salvou screenshot desktop.
- Revalidacao Playwright confirmou ausencia de cover roxo grande no corpo do editor e rails brancos com opacidade aplicada.
- Revalidacao Playwright confirmou propriedades/anexos no painel direito e ausencia de controles de metadata no corpo da nota.
- Nenhum erro de console/pageerror foi reportado por Playwright.
- Servidor temporario encerrado; porta 3000 sem listener ativo ao final.

Frontend evidence:

- `specs/artifacts/2026-05-27-corrigir-layout-editor-notas/02-editor-toolbar-desktop.png` - editor desktop com sidebar, folha central, toolbar e rail.
- `specs/artifacts/2026-05-27-corrigir-layout-editor-notas/04-editor-colors-final-desktop.png` - correcao de cores, sem bloco roxo no meio do editor.
- `specs/artifacts/2026-05-27-corrigir-layout-editor-notas/05-editor-right-panel-properties-desktop.png` - propriedades e anexos no painel direito.

## Risks

- Risk: a validacao visual pode depender de dados/autenticacao local.
  Mitigation: usar o servidor local existente ou registrar bloqueio se nao for possivel acessar uma nota real.

## Next step

Revisar visualmente o screenshot e ajustar apenas detalhes finos se o modelo ainda divergir do esperado.
