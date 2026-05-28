# Navegador de pastas em /notas (folder-browser v2)

## Metadata

- Status: done
- Mode: build
- Complexity: high
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Transformar a rota `/notas` no navegador de pastas em dois paineis do mockup
`docs/doitmd-layout-codex-package/desktop/folder-browser-kanban-list-v2-standalone.html`
(arvore de pastas a esquerda + conteudo da pasta selecionada a direita) e
consolidar a duplicacao `/notas/pastas`, que deixa de existir como rota propria.

## Context

- App Next.js 15, React 19, Tailwind, SWR; estado de UI via `UIContext`.
- `/notas` hoje e a biblioteca bento (spec 2026-05-27); sera substituida.
- `/notas/pastas` (indice) e `/notas/pastas/[id]` (detalhe kanban/lista) sao a
  funcionalidade duplicada que o usuario quer remover.
- `/notas/[id]` continua sendo o editor imersivo da nota (Item) e NAO muda.
- Dados via `useFolders`/`buildFolderTree`, `useItems`, pins em
  `usePreferences().prefs.pinnedFolderIds`, AGENTS.md via `AgentsEditorModal`,
  criacao/edicao de pasta via `createFolder`/`updateFolder`.
- Itens tem `complexity` (capture|task|note|project|document) e `status`.

## Scope

- [x] Reescrever `apps/web/src/app/(app)/notas/page.tsx` como navegador 2 paineis.
- [x] Sidebar in-page: busca de pasta, Destacadas, Todas (arvore expansivel),
      contador por pasta, Nova pasta, Editar AGENTS.md.
- [x] Header da pasta: breadcrumb, nome, favoritar, AGENTS.md, Nova subpasta,
      Novo item, toggle Kanban/Lista, menu real de ordenacao (Manual, Atualizacao,
      Criacao, Alfabetica, Tipo, Prioridade). Sem texto explicativo longo.
- [x] Kanban: colunas = subpastas (+ "Sem pasta" para itens diretos). Nota grande
      truncada (titulo + trecho com clamp + "abrir nota"). Tarefa/evento/ref com meta.
- [x] Lista: linhas com titulo, trecho curto, tipo, status, data.
- [x] Selecao de pasta via `?folder=<id>` (deep-link) sincronizada com a URL.
- [x] Redirecionar `/notas/pastas` -> `/notas` e `/notas/pastas/[id]` -> `/notas?folder=<id>`.
- [x] Atualizar links internos para pastas (sidebar global, dashboard, editor de nota).

## Out of scope

- Mudanca de schema/API/sync/audit.
- Campo de status editorial (Inbox/Rascunho/Pronto/Publicado) — colunas = subpastas.
- Redesenho do editor `/notas/[id]`.
- Conceitos de Projeto/Area.
- Drag-and-drop de reordenacao de itens/colunas (regressao aceita na v1; mover item
  continua possivel pelo detalhe do item). Registrado em Riscos.

## Grill Gate

Decision: completed

Reason:
Duas bifurcacoes tinham consequencias diferentes e conflitavam com trabalho recente
intencional (biblioteca bento em /notas) — exigiam confirmacao.

Questions:
1. Onde vive o navegador de pastas?
2. O que define as colunas do Kanban?

Answers:
1. `/notas` vira o navegador; `/notas/pastas` e duplicado e deve deixar de existir.
2. Colunas = subpastas (comportamento atual), sem mudanca de modelo de dados.

## Acceptance criteria

- [x] Subpastas aparecem claramente na navegacao (arvore in-page).
- [x] Selecionar pasta muda o conteudo central.
- [x] Conteudo central alterna entre Kanban e Lista.
- [x] Notas grandes sao truncadas no Kanban (com "abrir nota").
- [x] Existe botao de favoritar pasta.
- [x] Existe menu real para ordenar.
- [x] Existe acesso para editar AGENTS.md (sidebar e header).
- [x] Nenhum conceito de projeto/area e introduzido.
- [x] `/notas/pastas` e `/notas/pastas/[id]` redirecionam para `/notas`.
- [x] type-check passa; validacao visual no navegador com screenshots.

## Implementation plan

- [x] Criar spec (este arquivo).
- [x] Reescrever `/notas/page.tsx` (Suspense wrapper + NotasBrowser).
- [x] Redirects em `/notas/pastas/page.tsx` e `/notas/pastas/[id]/page.tsx`.
- [x] Atualizar links: sidebar global, dashboard, editor de nota.
- [x] type-check.
- [x] Validacao no navegador + screenshots.

## Progress

- 2026-05-28 - Contexto BuilderFlow/docs/specs/rotas lido. Grill Gate respondido.
- 2026-05-28 - `/notas` reescrita como navegador 2 paineis; redirects de `/notas/pastas`
  e `/notas/pastas/[id]`; links internos atualizados. Type-check OK.
- 2026-05-28 - Validacao no navegador via Playwright (sign-up + seed por API +
  navegacao/toggle/ordenacao). Screenshots salvos. Servidor temporario do Playwright
  encerrado (sem listener em 3000/3100 ao final).

## Decisions

- Decision: navegador in-page proprio mesmo havendo arvore na sidebar global.
  Reason: mockup pede navegador com busca/AGENTS.md proprios; sidebar global e o
  shell de navegacao e pode ser recolhida.
  ADR needed: no
- Decision: colunas Kanban = subpastas.
  Reason: sem campo de status editorial; preserva comportamento atual e evita
  mudanca de modelo de dados.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/notas/page.tsx` - navegador 2 paineis (arvore + conteudo,
  Kanban/Lista, menu de ordenacao, favoritar, AGENTS.md, truncagem de nota grande,
  selecao via `?folder=`). Substitui a biblioteca bento.
- `apps/web/src/app/(app)/notas/pastas/page.tsx` - redirect server -> `/notas`.
- `apps/web/src/app/(app)/notas/pastas/[id]/page.tsx` - redirect server -> `/notas?folder=<id>`.
- `apps/web/src/components/layout/sidebar.tsx` - links de pasta -> `/notas?folder=<id>`.
- `apps/web/src/app/(app)/dashboard/page.tsx` - link de pasta -> `/notas?folder=<id>`.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - breadcrumb/links de pasta -> `/notas` e `/notas?folder=<id>`.
- `apps/web/e2e/notas-browser-capture.spec.ts` - spec de captura visual do navegador.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` - passou.
- [x] `pnpm --filter @doit/web exec playwright test e2e/notas-browser-capture.spec.ts --project=chromium-desktop` - 1 passed.

Frontend evidence (`specs/artifacts/2026-05-28-navegador-pastas-notas-v2/`):

- [x] `chromium-desktop-01-list-view.png` - Lista da pasta Roteiros.
- [x] `chromium-desktop-02-kanban-large-note-truncated.png` - Kanban por subpasta, nota grande truncada com "abrir nota".
- [x] `chromium-desktop-03-sort-menu.png` - menu real de ordenacao aberto.
- [x] `chromium-desktop-04-sorted-alpha.png` - ordenacao Alfabetica aplicada.

Server temporario (Playwright `next dev -p 3100`) encerrado; sem listener em 3000/3100 ao final.

## Risks

- Risk: remover DnD de mover itens entre pastas e uma regressao.
  Mitigation: mover continua possivel pelo detalhe do item; reintroduzir DnD em
  iteracao futura se necessario.
- Risk: duplicacao visual com a arvore da sidebar global.
  Mitigation: sidebar global e recolhivel; navegador in-page e o workspace.

## Next step

Implementar a reescrita de `/notas` e os redirects, depois validar.
