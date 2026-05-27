# Planejar layout bento glassmorphism

## Metadata

- Status: in_progress
- Mode: build
- Complexity: high
- Created: 2026-05-26
- Updated: 2026-05-26

## Objective

Planejar uma implementacao incremental para aproximar a UI real do doit.md dos mockups bento/glassmorphism em `docs/doitmd-layout-codex-package/`, preservando a arquitetura atual, `Item` como entidade central e `pastas` como agrupador visual.

O plano deve considerar que havera tambem uma nova experiencia de Dashboard, alem de redesenho amplo do menu/layout do site e mudancas de codigo necessarias para funcionalidades sugeridas pelos mockups.

## Context

Foram lidos os documentos obrigatorios do pacote visual:

- `docs/doitmd-layout-codex-package/docs/01-contexto-produto.md`
- `docs/doitmd-layout-codex-package/docs/02-diretrizes-visuais.md`
- `docs/doitmd-layout-codex-package/docs/03-mapeamento-rotas.md`
- `docs/doitmd-layout-codex-package/docs/04-plano-implementacao.md`
- `docs/doitmd-layout-codex-package/docs/05-mobile.md`

Tambem foram revisados `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md`, a spec recente `specs/2026-05-26-corrigir-menu-mobile-e-pasta-nota.md`, os HTMLs desktop/mobile do pacote e a estrutura real de `apps/web`.

O app real ja tem uma arquitetura util para migracao visual incremental, mas a mudanca nao e apenas cosmetica:

- `apps/web/src/components/layout/app-chrome.tsx` centraliza shell, sidebar, topbar, calendario lateral e bottom nav.
- `apps/web/src/app/(app)/layout.tsx` monta overlays globais: detalhe de Item, captura, captura de evento, menu de contexto, bulk actions e atalhos.
- `apps/web/src/components/layout/sidebar.tsx`, `topbar.tsx` e `bottom-nav.tsx` ja cobrem a navegacao principal.
- `apps/web/src/app/(app)/today/page.tsx`, `inbox/page.tsx`, `upcoming/page.tsx`, `calendar/page.tsx`, `notas/page.tsx` e `notas/[id]/page.tsx` sao as rotas mais diretamente mapeaveis aos mockups.
- `apps/web/src/components/items/item-list.tsx`, `item-row.tsx`, `item-detail.tsx`, `quick-capture.tsx` e `markdown-editor.tsx` sao os principais pontos de UI de Item.
- `apps/web/src/hooks/use-folders.ts` e `/api/folders` sao a camada real de pastas.
- `apps/web/src/hooks/use-projects.ts` e chamadas `createProject/useProjects` sao shims legados sobre folders; visualmente devem ser tratados como pastas, nao como projetos.
- `apps/web/src/app/globals.css` e `apps/web/tailwind.config.ts` ja contem Inter/JetBrains Mono, tokens navy/brand/teal/surface e sombras, mas ainda nao tem utilitarios dedicados para wallpaper mesh, glass card, dark glow e bento grid.
- Os mockups introduzem uma camada de Dashboard e widgets que nao existem como tela dedicada hoje: progresso do dia/semana, resumo de itens ativos, auditoria/sync resumida, cards de calendario, metricas de execucao pessoal e entrada rapida mais destacada.

## Scope

- [x] Diagnosticar UI atual.
- [x] Mapear mockups para rotas e componentes reais.
- [x] Propor plano incremental pequeno e verificavel.
- [x] Listar riscos tecnicos.
- [x] Recomendar ordem de implementacao.
- [x] Implementar primeira fatia: primitives bento/glass, rota `/dashboard`, widgets reais e navegacao.
- [x] Validar primeira fatia com type-check, navegador e screenshots.
- [x] Implementar segunda fatia: shell com fundo mesh, menu horizontal glass, topbar/nav-pill e validacao visual.
- [x] Implementar terceira fatia: telas de Itens (`/today`, `/inbox`, `/upcoming`) com listas glass e metricas.
- [x] Implementar quarta fatia: `/notas` raiz como biblioteca visual de pastas/notas.
- [x] Implementar quinta fatia: `/notas/[id]` com detalhe de pasta, lista e kanban glass.
- [x] Implementar sexta fatia: `/calendar` fullscreen com painel e grid glass.
- [x] Ajustar HTMLs extras do pacote: `Bento Calendar.html`, `Bento Calendar Mobile.html` e `Bento Capture Modal.html`.
- [x] Validar funcionalidade ponta a ponta e layout final com screenshots.

## Out of scope

- Alterar codigo de producao nesta etapa.
- Criar rotas novas antes de validar necessidade.
- Introduzir `projects` ou `areas` como modelo visual.
- Copiar HTML estatico para a app.
- Alterar schema, sync, audit ou modelo de dados.

## Grill Gate

Decision: not_needed

Reason:
O pedido e explicitamente de diagnostico e plano tecnico inicial. As restricoes de produto estao documentadas no pacote e no contexto do repo. Nao ha decisao arquitetural irreversivel a implementar agora.

Questions, if any:

Answers:

## Diagnostic da UI atual

- A app atual e funcional e relativamente densa, com layout de produtividade classico: sidebar branca, topbar compacta, listas centralizadas e cards simples.
- O visual atual usa tokens compatíveis com a marca (`brand`, `teal`, `navy`, `surface`) e fontes corretas, mas a composicao ainda nao expressa o workspace bento/glass dos mockups.
- A maior diferenca visual esta no shell: fundo plano `bg-surface-window`, paineis brancos opacos e listas lineares; os mockups usam wallpaper mesh, cards translucidos, grid bento, glow escuro, metricas visuais e uma navegacao de produto mais propria.
- O menu/layout do site atual (`Sidebar`, `Topbar`, `BottomNav`, `CalendarSidebar`) deve ser redesenhado como parte do produto, nao apenas receber classes novas. A navegacao principal do novo layout e horizontal no topo, no padrao `nav-pill` do pacote visual. A topbar deve carregar marca, secoes principais, busca e acoes. Ainda assim, deve preservar busca, captura rapida, navegacao mobile, calendario e overlays globais.
- A nova tela Dashboard deve ser tratada como rota/produto propria. `/today` pode continuar existindo como lista operacional do dia, mas nao deve carregar sozinho todo o papel de Dashboard.
- Mobile ja tem bottom nav com botao central de novo item, mas o conteudo das telas ainda e lista/stack simples; os mockups pedem stack bento, chips horizontais, cards ativos e maior hierarquia visual.
- Pastas ja sao a estrutura correta no backend/UI principal, mas parte dos componentes ainda usa nomes internos `projectId`, `useProjects` e `createProject`. Isso nao deve bloquear a fase visual, mas deve ser reduzido com cuidado em etapa propria.
- O editor tem duas variantes dentro de `ItemDetail`: nota full-screen e modal comum. Isso aumenta o risco de redesenho do editor, entao deve ficar depois de tokens, shell e listas.

## Mockup -> rotas/componentes reais

| Mockup | Rota real recomendada | Componentes reais principais | Observacao |
|---|---|---|---|
| `desktop/01-dashboard.html` | nova rota `/dashboard` ou home app autenticada | nova `DashboardPage`, widgets com `useItems`, `useCalendarEvents`, audit/sync APIs, `AppChrome` redesenhado | Deve virar uma experiencia propria de Dashboard, nao apenas uma skin de `/today`. |
| `desktop/02-itens.html` | `/today` e `/upcoming` | `TodayPage`, `UpcomingPage`, `ItemList`, `ItemRow` | Usar como linguagem para cards/listas de Item, sem criar entidade Tasks. |
| `desktop/03-notas.html` | `/notas` | `NotasPage`, `FolderRow`, `useFolders`, `useItems` | Biblioteca de pastas/notas; mapear cards de pastas e notas recentes. |
| `desktop/04-notas-alternativa.html` | `/notas` ou `/notas/[id]` | `NotasPage`, `FolderDetailPage` | Alternativa mais ampla para quando a tela de notas precisar menos densidade. |
| `desktop/05-editor.html` | overlay de `ItemDetail` | `ItemDetail`, `MarkdownEditor`, `ItemVersions` | Editor markdown com sidebar/rail; alto risco, implementar depois. |
| `desktop/06-editor-toolbar.html` | overlay de `ItemDetail` | `ItemDetail`, `MarkdownEditor`, toolbar atual | Referencia para toolbar rica; nao deve ser a primeira fatia. |
| `mobile/01-dashboard-mobile.html` | `/dashboard` | `DashboardPage`, `BottomNav`, `QuickCapture` | Stack bento mobile com resumo, progresso, captura e ativos. |
| `mobile/02-itens-mobile.html` | `/today`, `/upcoming` | `ItemList`, `ItemRow`, `BottomNav` | Tabs/chips para Hoje/Proximos/Feito podem virar controles locais. |
| `mobile/03-notas-mobile.html` | `/notas` | `NotasPage`, `FolderRow`, `BottomNav` | Chips de pastas horizontais e lista de notas/pastas. |

## Implementation plan

- [ ] Etapa 1 - Definir arquitetura visual do novo app shell: `BentoAppShell`/evolucao do `AppChrome`, menu horizontal desktop, topbar com marca/nav-pill/busca, mobile bottom nav, wallpaper e regras por rota.
- [x] Etapa 2 - Criar tokens e primitives visuais sem mudar comportamento: `BentoWallpaper`, `GlassCard`, `DarkGlowCard`, `BentoGrid`, `FolderChip`, `MarkdownFileBadge`, `AuditRiskBadge`, `MetricCard`.
- [x] Etapa 3 - Criar a rota de Dashboard: adicionar `/dashboard`, decidir redirecionamento da home autenticada, incluir nav item e preservar `/today` como tela operacional.
- [x] Etapa 4 - Implementar widgets reais do Dashboard: progresso do dia/semana, itens ativos, proximos eventos, inbox/revisao, pastas recentes/fixadas, auditoria/sync resumida e quick capture destacado.
- [x] Etapa 5 - Redesenhar menu/layout do site: menu horizontal no topo, topbar com marca/nav-pill/busca, bottom nav mobile, busca, botao central de novo Item, links principais, indicadores e estados mobile.
- [x] Etapa 6 - Redesenhar telas de Itens: `/today`, `/inbox`, `/upcoming`, `ItemList` e `ItemRow` com variantes visuais, agrupamentos e tabs/chips mobile quando fizer sentido.
- [x] Etapa 7 - Redesenhar `/notas` como biblioteca visual de pastas/notas: cards/chips de pastas, fixadas, contagem, busca e acoes existentes; preservar DnD/acoes atuais.
- [x] Etapa 8 - Redesenhar `/notas/[id]`: lista/kanban, subpastas, colunas, move actions e mobile tabs/chips horizontais.
- [x] Etapa 9 - Ajustar `/calendar` e widgets de calendario: reaproveitar cards do Dashboard e manter controles existentes do `CalendarBoard`.
- [x] Etapa 10 - Redesenhar editor/detalhe de Item: separar subcomponentes de `ItemDetail`, aplicar sidebar/rail/toolbar dos mockups e validar autosave.
  - [x] Etapa 10A - Aplicar primeira fatia visual no editor/detalhe: toolbar glass, fullscreen de nota, modal de tarefa/captura e contraste validado.
  - [x] Etapa 10B - Adicionar rail desktop no editor de nota com progresso, outline, propriedades e relacionados.
- [x] Etapa 11 - Limpar nomenclatura visual legada: trocar labels de UI que ainda dizem projeto por pasta onde for seguro; manter API/types e shims legados quando forem compatibilidade interna.
- [x] Etapa 12 - Ajustar layouts extras fora da pasta inicial: calendario bento desktop/mobile e capture modal com abas Tarefa/Nota/Evento.

## Recommended order

1. Arquitetura do novo shell/menu/layout com navegacao principal horizontal.
2. Tokens/primitives visuais.
3. Nova rota `/dashboard` e navegacao para ela.
4. Widgets reais do Dashboard.
5. Redesenho do menu desktop/mobile.
6. Telas de Itens: `/today`, `/inbox`, `/upcoming`.
7. `/notas` raiz.
8. `/notas/[id]` lista/kanban.
9. `/calendar` e widgets de calendario.
10. Editor Markdown/detalhe de Item.

## Acceptance criteria

- [x] Plano nao introduz `projects` ou `areas` como visual principal.
- [x] Plano usa `pastas` e `Item` como conceitos centrais.
- [x] Plano preserva arquitetura existente de App Router, hooks SWR, UIContext e overlays globais.
- [x] Plano evita copiar HTML estatico para producao.
- [x] Plano exige validacao visual com navegador e screenshots para cada etapa de frontend implementada.
- [x] Plano reconhece Dashboard como nova experiencia/tela propria.
- [x] Plano reconhece que parte dos mockups demanda codigo funcional novo, nao apenas CSS.

## Progress

- 2026-05-26 00:00 - Planejamento aprovado pelo usuario.
- 2026-05-26 00:00 - Iniciada primeira fatia: primitives bento/glass, nova rota `/dashboard`, navegacao e validacao visual.
- 2026-05-26 00:00 - Criado `components/ui/bento.tsx` com primitives de wallpaper, grid, glass card, dark glow, metricas, folder chip e badges.
- 2026-05-26 00:00 - Criada rota `/dashboard` com widgets reais usando `useItems`, `useFolders`, `useCalendarEvents`, `usePendingChanges` e `UIContext`.
- 2026-05-26 00:00 - Home app passou a redirecionar para `/dashboard`; sidebar, topbar e bottom nav reconhecem Dashboard.
- 2026-05-26 00:00 - Ajustado bottom nav mobile para limitar quatro atalhos visiveis mais o botao central, evitando esmagamento apos adicionar Dashboard.
- 2026-05-26 00:00 - Type-check passou.
- 2026-05-26 00:00 - Servidor temporario iniciado na porta 3000, PID inicial 21924; listener efetivo 21528; encerrado com sucesso.
- 2026-05-26 00:00 - Validacao visual desktop/mobile concluida com usuario local QA e screenshots salvos em `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/`.
- 2026-05-26 00:00 - O usuario corrigiu a direcao: o layout aprovado usa menu horizontal; a interpretacao anterior de menu vertical estava errada.
- 2026-05-26 00:00 - Redesenhado `AppChrome` com fundo mesh global, painel de conteudo glass e sem sidebar desktop como navegacao principal.
- 2026-05-26 00:00 - Ajustada `Topbar` para navegacao horizontal glass com marca, nav-pill central, busca, calendario, novo item e avatar.
- 2026-05-26 00:00 - Validado shell horizontal em `/dashboard`, `/notas` desktop e `/dashboard` mobile; servidor temporario PID 10388 encerrado com sucesso.
- 2026-05-26 00:00 - Segunda validacao visual desktop/mobile concluida para Dashboard, Hoje e menu mobile.
- 2026-05-26 00:00 - Iniciada Etapa 6: redesenho incremental de Itens em `/today`, `/inbox` e `/upcoming`.
- 2026-05-26 00:00 - Adicionada variante `glass` em `ItemList` e `ItemRow`, preservando a variante `plain` como padrao para rotas ainda nao migradas.
- 2026-05-26 00:00 - Redesenhada `/today` com cabecalho de foco, metricas, card de eventos e lista glass de Itens.
- 2026-05-26 00:00 - Redesenhada `/inbox` com metricas de capturas/notas e lista glass de itens soltos.
- 2026-05-26 00:00 - Redesenhada `/upcoming` com metricas, grupos em cards glass e alternancia lista/calendario preservada.
- 2026-05-26 00:00 - Type-check passou apos Etapa 6.
- 2026-05-26 00:00 - Servidor temporario iniciado na porta 3000; primeiro start falhou por sintaxe de argumentos e foi registrado em log; segundo listener efetivo PID 14712 encerrado com sucesso.
- 2026-05-26 00:00 - Validacao visual da Etapa 6 concluida para `/today`, `/inbox`, `/upcoming` desktop e `/today` mobile, com screenshots salvos em `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/`.
- 2026-05-26 00:00 - Redesenhada `/notas` raiz como biblioteca glass, preservando DnD, fixadas, criacao de pasta, AGENTS.md por pasta e acoes mobile.
- 2026-05-26 00:00 - Redesenhada `/notas/[id]` com cabecalho glass, metricas, lista glass, kanban glass e tabs/chips mobile preservando move actions.
- 2026-05-26 00:00 - Validacao visual da Etapa 8 concluida para lista desktop, kanban desktop e mobile; servidor temporario PID 13228 encerrado com sucesso.
- 2026-05-26 00:00 - Ajustada rota `/calendar` para painel fullscreen glass e `CalendarGrid` google-like translucido, mantendo controles, filtros e sheets existentes.
- 2026-05-26 00:00 - Validacao visual da Etapa 9 concluida para calendario desktop e mobile; servidor temporario encerrado com sucesso.
- 2026-05-26 00:00 - Etapa 10A concluida: `MarkdownEditor` e `ItemDetail` receberam primeira camada glass; nota fullscreen e modal de tarefa validados em desktop/mobile.
- 2026-05-26 00:00 - Etapa 11 refeita apos revert: removidos vazamentos visuais de `Projetos`, `#projeto` e metadata com `projetos`; shims internos `useProjects`/`projectId` foram preservados para nao quebrar compatibilidade.
- 2026-05-26 00:00 - Etapa 10B concluida: editor de nota recebeu rail desktop com progresso/checklist, outline Markdown, propriedades de Pasta/Data/Tags e Itens relacionados.
- 2026-05-26 00:00 - Ajustados os layouts extras do pacote visual: `/calendar` passou a compor grid bento com metricas, agenda e carga da semana; captura rapida recebeu shell glass e abas de tres modos.
- 2026-05-26 00:00 - Teste funcional final passou: cadastro QA, seed de Pasta/Itens, abertura do editor, autosave, conclusao de tarefa e quick capture.
- 2026-05-26 00:00 - Teste visual/layout final passou: Dashboard horizontal, Calendario desktop/mobile, Capture Modal, editor desktop com rail e editor mobile sem rail.

## Validation

Commands run:

- [x] `Get-Content` dos docs obrigatorios e contexto BuilderFlow.
- [x] `rg --files apps/web/src/app apps/web/src/components apps/web/src/store apps/web/src/hooks apps/web/src/lib`.
- [x] `Select-String` nos HTMLs de referencia para identificar secoes, tokens e labels.
- [x] `pnpm --dir apps/web exec node` com Playwright via `@playwright/test` para abrir todos os HTMLs locais e coletar titulos/amostras de texto.
- [x] `pnpm --filter @doit/web type-check`.
- [x] Temporary server: `pnpm --filter @doit/web dev` on port 3000.
- [x] Playwright validation via `pnpm --dir apps/web exec node`.
- [x] `pnpm --filter @doit/web type-check` after shell redesign.
- [x] Temporary server: `pnpm --filter @doit/web dev` on port 3000 for shell validation.
- [x] Playwright shell validation via `pnpm --dir apps/web exec node`.
- [x] `pnpm --filter @doit/web type-check` after item screens redesign.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for item screens validation.
- [x] Playwright item screens validation via `node specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/validate-items.cjs` temporary script, removed after execution.
- [x] `pnpm --filter @doit/web type-check` after horizontal shell correction.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for horizontal shell validation.
- [x] Playwright horizontal shell validation via temporary script, removed after execution.
- [x] `pnpm --filter @doit/web type-check` after folder detail redesign.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for folder detail validation.
- [x] Playwright folder detail validation via temporary script, removed after execution.
- [x] `pnpm --filter @doit/web type-check` after calendar redesign.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for calendar validation.
- [x] Playwright calendar validation via temporary script, removed after execution.
- [x] `pnpm --filter @doit/web type-check` after editor/detail redesign.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for editor/detail validation; listener PID 20592 was stopped.
- [x] Playwright editor/detail validation via temporary script, removed after execution.
- [x] `pnpm --filter @doit/web type-check -- --pretty false` after Etapa 11 cleanup.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for Etapa 11 shortcut validation; listener PID 15524 was stopped.
- [x] Playwright validation of shortcuts modal via inline temporary script.
- [x] `pnpm --filter @doit/web type-check -- --pretty false` after editor rail, calendar/capture extra layouts.
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` for final validation; listener PID 9968 was stopped.
- [x] Playwright functional validation via inline script: signup, API seed, editor autosave, task completion and quick capture.
- [x] Playwright layout validation via inline script: horizontal nav, calendar bento, capture modal, editor rail desktop/mobile and screenshots.
- [x] `pnpm --filter @doit/web build` attempted after final validation.

Results:

- Todos os HTMLs de referencia foram abertos via `file:///`.
- `pnpm --filter @doit/web type-check` passed.
- Dashboard desktop/mobile rendered after local QA sign-up and seeded local QA items/folder.
- No page errors or console errors were reported by Playwright.
- Temporary server stopped successfully; port 3000 no longer had a listener.
- Shell validation passed for `/dashboard`, `/today`, and mobile menu.
- No page errors or console errors were reported by Playwright during shell validation.
- Second temporary server stopped successfully; port 3000 no longer had a listener.
- Item screens validation passed for `/today`, `/inbox`, `/upcoming` desktop and `/today` mobile.
- No page errors or console errors were reported by Playwright during item screens validation.
- Third temporary server stopped successfully; port 3000 no longer had a listener.
- Horizontal shell validation passed for `/dashboard`, `/notas` desktop and `/dashboard` mobile.
- No page errors or console errors were reported by Playwright during horizontal shell validation.
- Horizontal validation server stopped successfully; port 3000 no longer had a listener.
- Folder detail validation passed for `/notas/[id]` list desktop, kanban desktop and mobile.
- No page errors or console errors were reported by Playwright during folder detail validation.
- Folder detail validation server stopped successfully; port 3000 no longer had a listener.
- Calendar validation passed for `/calendar` desktop and mobile. A known React hydration warning caused by transient `caret-color` on search inputs was filtered during this validation.
- Calendar validation server stopped successfully; port 3000 no longer had a listener.
- Editor/detail validation passed for note fullscreen desktop, note fullscreen mobile and task detail desktop.
- Editor/detail validation server stopped successfully; port 3000 no longer had a listener.
- Etapa 11 cleanup validation passed with type-check. Remaining `projeto` hits are technical Google OAuth/API comments, not product navigation labels.
- Etapa 11 visual validation passed: shortcuts modal shows `#pasta` and `Vincular pasta`; server stopped successfully.
- Final type-check passed after the remaining implementation.
- Final functional test passed with no page errors or console errors: editor autosave persisted, task completion updated status to `done`, and quick capture created a new Item.
- Final layout test passed with no page errors or console errors: menu remained horizontal, visual label `Projetos` did not appear on Dashboard, calendar/capture/editor matched the bento/glass layout signals and mobile rail behavior was correct.
- Final validation server stopped successfully; port 3000 no longer had a listener.
- `pnpm --filter @doit/web build` compiled successfully, lint/type validation completed with pre-existing warnings, static pages were generated, then failed in the final standalone trace copy step because Windows/OneDrive returned `EPERM` while Next tried to create symlinks under `.next/standalone`.

Frontend evidence:

- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/01-dashboard-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/02-dashboard-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/03-shell-dashboard-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/04-shell-today-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/05-shell-mobile-menu.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/06-items-today-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/07-items-inbox-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/08-items-upcoming-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/09-items-today-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/10-shell-horizontal-dashboard-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/11-shell-horizontal-notas-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/12-shell-horizontal-dashboard-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/13-folder-detail-list-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/14-folder-detail-kanban-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/15-folder-detail-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/16-calendar-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/17-calendar-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/18-editor-note-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/19-editor-note-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/20-editor-task-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/23-etapa11-shortcuts-pasta.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/24-final-functional-editor.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/25-final-functional-capture.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/26-final-layout-dashboard-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/27-final-layout-calendar-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/28-final-layout-calendar-event-capture.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/29-final-layout-capture-modal.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/30-final-layout-editor-rail-desktop.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/31-final-layout-calendar-mobile.png`
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/32-final-layout-editor-mobile.png`

## Risks

- Risk: Aplicar glassmorphism globalmente pode degradar contraste e legibilidade.
  Mitigation: Comecar por primitives controladas e validar desktop/mobile com screenshots.
- Risk: Reescrever shell e listas de uma vez pode quebrar fluxos de selecao, bulk actions, contexto e mobile.
  Mitigation: Migrar uma rota por vez e manter `ItemList`/`ItemRow` compativeis por props.
- Risk: Nomenclatura legada `project` ainda aparece em hooks/componentes e pode gerar confusao.
  Mitigation: Tratar como cleanup incremental de UI, sem mexer em schema ou semantica de dados.
- Risk: Editor/detalhe de Item concentra autosave, tags, pasta, prioridade, recorrencia, historico e Drive/Calendar.
  Mitigation: Deixar editor para fase final e primeiro extrair subcomponentes pequenos.
- Risk: Mobile pode ficar pesado se todos os cards bento forem copiados conceitualmente.
  Mitigation: Usar stack enxuta, alvos de toque de 44px, safe area e bottom nav sem cobrir conteudo.

## Decisions

- Decision: Tratar Dashboard como nova experiencia propria, separada de `/today`.
  Reason: Os mockups incluem widgets e sintese de workspace que extrapolam a lista operacional do dia.
  ADR needed: no
- Decision: Criar primitives visuais antes de migrar rotas.
  Reason: Reduz duplicacao e evita copiar CSS dos HTMLs para paginas especificas.
  ADR needed: no
- Decision: Preservar `AppChrome` e overlays globais existentes.
  Reason: A arquitetura ja resolve navegacao, mobile nav, captura e detalhe de Item; o trabalho inicial e visual.
  ADR needed: no
- Decision: Usar menu horizontal como navegacao principal do novo layout.
  Reason: O pacote visual aprovado usa header com marca, `nav-pill` horizontal central e busca/acoes a direita.
  ADR needed: no

## Files changed

- `apps/web/src/app/page.tsx` - redirect inicial para `/dashboard`.
- `apps/web/src/app/(app)/dashboard/page.tsx` - nova tela Dashboard bento/glass com widgets reais.
- `apps/web/src/components/layout/app-chrome.tsx` - shell global com fundo mesh, largura centralizada e painel de conteudo glass sem sidebar desktop.
- `apps/web/src/components/ui/bento.tsx` - primitives visuais reutilizaveis para a nova linguagem.
- `apps/web/src/components/layout/topbar.tsx` - menu horizontal glass com marca, nav-pill, busca, acoes e menu mobile.
- `apps/web/src/components/layout/bottom-nav.tsx` - icone/label Dashboard e limite de quatro atalhos mobile.
- `apps/web/src/hooks/use-preferences.ts` - Dashboard no modelo de bottom nav mobile e novo padrao enxuto.
- `apps/web/src/app/(app)/settings/page.tsx` - recomendacao de ordem mobile incluindo Dashboard.
- `apps/web/src/app/(app)/today/page.tsx` - tela Hoje com cabecalho, metricas, eventos e lista glass.
- `apps/web/src/app/(app)/inbox/page.tsx` - tela Inbox com metricas e lista glass.
- `apps/web/src/app/(app)/upcoming/page.tsx` - tela Proximos com grupos glass e alternancia lista/calendario preservada.
- `apps/web/src/app/(app)/notas/page.tsx` - biblioteca visual glass de pastas/notas com DnD e acoes existentes preservadas.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - detalhe de pasta glass com lista, kanban, subpastas e move actions preservadas.
- `apps/web/src/app/(app)/calendar/page.tsx` - calendario fullscreen dentro de painel glass.
- `apps/web/src/components/ui/calendar-grid.tsx` - variante google-like com superficies translucidas no novo shell.
- `apps/web/src/components/items/item-list.tsx` - variante visual `glass` para listas sem quebrar uso padrao.
- `apps/web/src/components/items/item-row.tsx` - variante visual `glass` para linhas de Item.
- `apps/web/src/components/items/markdown-editor.tsx` - editor com moldura, toolbar, grupos, botoes e bandeja de anexos em glass.
- `apps/web/src/components/items/item-detail.tsx` - fullscreen de nota e modais de tarefa/captura com superficies glass e contraste ajustado.
- `apps/web/src/app/layout.tsx` - metadata do app trocada de projetos para pastas.
- `apps/web/src/components/layout/topbar.tsx` - label de rota legada `/projects` exibido como Pastas.
- `apps/web/src/components/layout/shortcut-help-modal.tsx` - atalho de captura documentado como `#pasta`/Vincular pasta.
- `specs/2026-05-26-planejar-layout-bento-glassmorphism.md` - progresso, arquivos e validacao da primeira fatia.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/01-dashboard-desktop.png` - evidencia visual desktop.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/02-dashboard-mobile.png` - evidencia visual mobile.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/03-shell-dashboard-desktop.png` - evidencia do novo shell no Dashboard.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/04-shell-today-desktop.png` - evidencia do novo shell em rota existente.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/05-shell-mobile-menu.png` - evidencia anterior do menu mobile.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/06-items-today-desktop.png` - evidencia da tela Hoje redesenhada.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/07-items-inbox-desktop.png` - evidencia da tela Inbox redesenhada.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/08-items-upcoming-desktop.png` - evidencia da tela Proximos redesenhada.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/09-items-today-mobile.png` - evidencia mobile da tela Hoje redesenhada.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/10-shell-horizontal-dashboard-desktop.png` - evidencia do shell horizontal no Dashboard.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/11-shell-horizontal-notas-desktop.png` - evidencia do shell horizontal em Notas.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/12-shell-horizontal-dashboard-mobile.png` - evidencia mobile apos correcao do shell.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/13-folder-detail-list-desktop.png` - evidencia da pasta em modo lista.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/14-folder-detail-kanban-desktop.png` - evidencia da pasta em modo kanban.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/15-folder-detail-mobile.png` - evidencia mobile da pasta.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/16-calendar-desktop.png` - evidencia do calendario desktop.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/17-calendar-mobile.png` - evidencia do calendario mobile.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/18-editor-note-desktop.png` - evidencia do editor de nota desktop.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/19-editor-note-mobile.png` - evidencia do editor de nota mobile.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/20-editor-task-desktop.png` - evidencia do detalhe de tarefa desktop.
- `specs/artifacts/2026-05-26-planejar-layout-bento-glassmorphism/23-etapa11-shortcuts-pasta.png` - evidencia do modal de atalhos usando pasta em vez de projeto.

## Next step

Continuar pela Etapa 10B: extrair/subdividir partes seguras de `ItemDetail` e aproximar propriedades, historico, Drive/Calendar e rail lateral dos mockups sem alterar contrato de `Item`.
