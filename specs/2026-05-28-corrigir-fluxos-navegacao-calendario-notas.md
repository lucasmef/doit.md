# Corrigir fluxos: navegação, calendário, notas, menu mobile e ações mobile

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Consolidar fluxos duplicados (editor de notas, calendários antigos, navegação de notas, menu
mobile e ações por toque longo) nos componentes atuais corretos, sem refatoração ampla e sem
regressões no desktop. 9 correções pontuais agrupadas por arquivo.

## Context

App doit.md (Next.js 15, App Router, React 19, Tailwind, SWR). Convivem dois editores de nota
(overlay `ItemDetail` antigo × rota imersiva `/notas/[id]` nova), três acessos a calendários
antigos (`CalendarBoard` deslizável em `/upcoming`, painel `CalendarSidebar` à direita, calendário
dentro de próximos) versus o oficial `/calendar`. `calendar-board.tsx` permanece pois exporta o
`EventSheet` usado por `/calendar` e `/today`.

Decisões do usuário (Grill Gate): só `note` → editor imersivo; raiz de `/notas` = grade de pastas
+ drawer mobile; remover calendário do `/upcoming` de vez.

## Scope

- [x] Issue 1 — abertura de nota sempre no editor imersivo `/notas/[id]`
- [x] Issue 2 — fundo esbranquiçado do menu inferior mobile
- [x] Issue 3 — página Hoje respeita `todayCalendarHidePastAfterHours` e `todayCalendarShowTomorrowAfterTime`
- [x] Issue 4 — somente `/calendar` como calendário oficial
- [x] Issue 5 — `/calendar` mobile sem corte vertical nos eventos
- [x] Issue 6 — ocultar menu inferior mobile em `/calendar`
- [x] Issue 7 — `/notas` abre na raiz, sem pasta automática
- [x] Issue 8 — navegação de pastas no mobile (drawer)
- [x] Issue 9 — menu de ações por toque longo funciona no mobile

## Out of scope

- Long-press em cards de `/notas` e `/today`.
- Refatorar/remover `calendar-board.tsx` e `calendar-sidebar.tsx` (apenas tirar do acesso).
- Auth, sync, schema, API, dados.

## Grill Gate

Decision: completed

Reason: requisitos majoritariamente inferíveis do código; 3 decisões de UX/comportamento com
consequências reais foram confirmadas com o usuário.

Questions/Answers:
1. Tipos no editor imersivo? → Só `note` (não há tipo documento).
2. Raiz de `/notas`? → Grade de pastas + drawer mobile.
3. Calendário antigo no `/upcoming`? → Remover de vez; topbar/Shift+C → `/calendar`.

## Acceptance criteria

- [ ] Nota aberta em qualquer lugar (lista, today, calendar, busca) abre `/notas/[id]`, não o overlay.
- [ ] Menu inferior mobile com fundo esbranquiçado legível; desktop inalterado.
- [ ] Today oculta eventos passados após o tempo configurado e mostra os de amanhã após o horário configurado; passados ainda visíveis ficam esmaecidos.
- [ ] Topbar e Shift+C abrem `/calendar`; `/upcoming` sem calendário/swipe; painel direito não abre.
- [ ] `/calendar` mobile com títulos legíveis sem corte vertical; desktop inalterado.
- [ ] `/calendar` mobile sem menu inferior; topbar/sanduíche presentes.
- [ ] `/notas` abre na raiz (grade de pastas), sem entrar em pasta automaticamente.
- [ ] Mobile permite navegar/sair de pastas via drawer.
- [ ] Long-press em tarefa no mobile abre e mantém o menu de ações.

## Implementation plan

- [x] Branch `fix/fluxos-navegacao-calendario-notas` a partir de `dev`
- [ ] Issue 1 — `components/items/item-detail.tsx`
- [ ] Issue 2/6 — `components/layout/bottom-nav.tsx`, `components/layout/app-chrome.tsx`
- [ ] Issue 3 — `app/(app)/today/page.tsx`
- [ ] Issue 4 — `components/layout/topbar.tsx`, `store/ui-provider.tsx`, `app/(app)/upcoming/page.tsx`, `components/layout/app-chrome.tsx`
- [ ] Issue 5 — `app/(app)/calendar/page.tsx`
- [ ] Issue 7/8 — `app/(app)/notas/page.tsx`
- [ ] Issue 9 — `components/items/bulk-actions.tsx`
- [ ] Validação: type-check, build, browser + screenshots, PR

## Progress

- 2026-05-28 — Análise completa do código; plano aprovado; branch e living spec criados.

## Decisions

- Decisão: interceptar abertura de nota no `ItemDetail` (ponto único de montagem) em vez de alterar cada call site.
  Reason: cobre todos os pontos de abertura com mudança mínima e reversível.
  ADR needed: no

## Files changed

- `components/items/item-detail.tsx` — redireciona `note` para `/notas/[id]` (issue 1)
- `components/layout/bottom-nav.tsx` — fundo esbranquiçado + oculta em `/calendar` (issues 2, 6)
- `components/layout/app-chrome.tsx` — remove `CalendarSidebar`; sem padding inferior em `/calendar` (issues 4, 6)
- `app/(app)/today/page.tsx` — filtra eventos passados por `todayCalendarHidePastAfterHours` (issue 3)
- `components/layout/topbar.tsx` — botão calendário → `/calendar`; remove ações do calendário antigo (issue 4)
- `store/ui-provider.tsx` — `Shift+C` → `/calendar` (issue 4)
- `app/(app)/upcoming/page.tsx` — remove view calendário/swipe/CalendarBoard (issue 4)
- `app/(app)/calendar/page.tsx` — chips de evento legíveis no mobile (issue 5)
- `app/(app)/notas/page.tsx` — raiz com grade de pastas + drawer mobile, sem auto-seleção (issues 7, 8)
- `components/items/bulk-actions.tsx` — guard anti-fechamento do menu por toque longo (issue 9)
- (novos) `specs/validate-fluxos.mjs` — script Playwright de validação

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passou (sem erros)
- [x] `pnpm --filter @doit/web lint` — só warnings pré-existentes, sem erros
- [x] `pnpm --filter @doit/web build` — compilação + SSG (21/21) OK; falha apenas no copy do `output: standalone` por EPERM de symlink (Windows/OneDrive), não relacionado às mudanças

Results:

- Validação de browser via Playwright (`specs/validate-fluxos.mjs`): TODOS OS CHECKS PASSARAM.
  - servidor: `pnpm --filter @doit/web dev` em :3000 (background, PID encerrado ao final; porta liberada).
  - checks: raiz de /notas sem auto-pasta; /upcoming sem toggle calendário; nota → editor imersivo `/notas/[id]`; menu inferior visível em /today e oculto em /calendar (mobile); botão "Pastas"/drawer no mobile.
- Não foi possível semear eventos locais (calendário exige conta Google neste ambiente), então as regras visuais de eventos passados/amanhã (issue 3) e os chips (issue 5) foram validadas por código (espelhando a lógica comprovada de `app/(app)/itens/page.tsx`) + type-check; o layout do calendário mobile e do Today foi conferido visualmente.

Nota sobre EOL: o repositório tem finais de linha mistos entre arquivos (e internamente em `item-detail.tsx`/`ui-provider.tsx`). O editor normaliza para LF, então esses dois arquivos mostram linhas "fantasma" só de whitespace no diff; as mudanças reais foram confirmadas com `git diff --ignore-all-space`. Revisar com "ignore whitespace".

Frontend evidence:

- Screenshots em `specs/artifacts/2026-05-28-corrigir-fluxos-navegacao-calendario-notas/`:
  - `01-notas-root-desktop.png`, `02-note-immersive-desktop.png`, `03-today-mobile-bottomnav.png`,
    `04-calendar-mobile.png`, `05-notas-root-mobile.png`, `06-notas-drawer-mobile.png`, `07-upcoming-list-desktop.png`

## Risks

- Risk: interceptação de nota no `ItemDetail` pode causar flash do overlay.
  Mitigation: redirecionar via `useEffect` e retornar `null` enquanto `complexity === 'note'`.
- Risk: remover view de calendário do `/upcoming` pode quebrar links salvos `?view=calendar`.
  Mitigation: rota ainda existe; apenas ignora o parâmetro e mostra a lista.

## Next step

Abrir PR (branch → `dev`) e revisar com "ignore whitespace".
