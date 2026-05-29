# Reajustes mobile: calendário, navegação de notas, long press, Esc, badges e título

## Metadata

- Status: review
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Sete reajustes pontuais (IDs 005, 008, 009, 010, 011, 012, 013) sobre fluxos já entregues em
`specs/2026-05-28-corrigir-fluxos-navegacao-calendario-notas.md`. Foco em legibilidade e
navegação mobile sem regressão no desktop. Sem refatoração ampla.

## Context

App doit.md (Next.js 15 App Router, React 19, Tailwind, SWR, pnpm monorepo). Arquivos centrais:
`app/(app)/calendar/page.tsx` (calendário oficial), `app/(app)/notas/page.tsx` (navegador de
pastas), `app/(app)/today/page.tsx` (Hoje), `components/items/item-row.tsx` +
`components/items/bulk-actions.tsx` (long-press → menu de contexto), `hooks/use-keyboard.ts` +
`store/ui-provider.tsx` (atalhos globais), modais diversos com `aria-modal="true"`.

Causa-raiz do Esc (ID 010): o handler global de Escape em `ui-provider` é bloqueado por
`hasShortcutBlocker()` sempre que existe `[aria-modal="true"]`; os modais tratam Esc via
`onKeyDown` no próprio nó, que só dispara com foco interno. Sem foco no modal, nada fecha.

## Scope

- [x] ID 005 — `/calendar` mês mobile: chips de evento legíveis (sem iniciais/reticências, sem corte vertical).
- [x] ID 008 — `/notas` mobile: pasta só com subpastas navegável (subpastas clicáveis no painel de conteúdo).
- [x] ID 009 — long press abre menu de ações em tarefas E notas (cards de `/notas` e `/today`).
- [x] ID 010 — Esc fecha o modal top-level mesmo sem foco interno; fecha só o mais recente; nada quando não há modal.
- [x] ID 011 — Hoje mobile: remover badge "hoje" redundante; mostrar horário só quando houver; caixa de horário do evento mais escura.
- [x] ID 012 — título visível "Calendario" → "Calendário".
- [x] ID 013 — `/notas` lista mobile: só o título (sem preview/trecho); desktop mantém título + trecho.

## Out of scope

- Refatorar/remover `calendar-board.tsx`, `calendar-sidebar.tsx` (legado).
- Auth, sync, schema, API, dados.
- Reabrir itens já corrigidos no spec de 2026-05-28.

## Grill Gate

Decision: not_needed

Reason: critérios objetivos e observáveis fornecidos pelo usuário; causas inferíveis do código.
Nenhuma decisão arquitetural, de dados ou ambígua.

## Acceptance criteria

- [ ] Mês mobile: títulos de evento quebram em até 2 linhas, sem virar iniciais; sem clipping vertical; desktop inalterado.
- [ ] Pasta só com subpastas: ao abrir, mostra as subpastas clicáveis e permite descer/voltar; raiz de /notas inalterada.
- [ ] Long press (~450ms) em tarefa e em nota abre o menu de contexto; toque simples abre o item; scroll e seleção de texto não conflitam.
- [ ] Esc fecha o modal ativo com foco fora dele; com 2 modais fecha só o de cima; sem modal não fecha tela indevida.
- [ ] Hoje mobile: tarefa comum sem badge "hoje"; com horário mostra o horário; evento mostra horário em caixa mais escura/legível.
- [ ] Título do calendário aparece como "Calendário" (mobile e nav desktop).
- [ ] Lista de notas no mobile mostra só o título; desktop mantém trecho.

## Implementation plan

- [ ] Novo hook `hooks/use-escape-close.ts` (pilha global + listener captura no document).
- [ ] Wire do hook nos modais quebrados: dialog, item-detail, EventSheet, DayPopup, agents-editor-modal, drawer de pastas mobile, calendar-event-capture.
- [ ] ID 005 — chips e padding do mês mobile em `calendar/page.tsx`.
- [ ] ID 008 — seção "Subpastas" navegável no painel de conteúdo de `notas/page.tsx` (lista + headers de coluna kanban clicáveis).
- [ ] ID 009 — hook `useLongPress` reutilizável + aplicar nos cards de notas/itens (`notas/page.tsx`, `today/page.tsx`).
- [ ] ID 011 — badges de `today/page.tsx`.
- [ ] ID 012 — `topbar.tsx`, `sidebar.tsx`, `dashboard/page.tsx`.
- [ ] ID 013 — `ContentRow` em `notas/page.tsx`.
- [ ] Validação: type-check, lint, build, browser + screenshots, PR.

## Progress

- 2026-05-29 — Análise do código concluída; causa-raiz do Esc identificada; spec criada.

## Decisions

- Decisão: Esc via pilha global + listener de captura no `document` (em vez de ampliar o handler do `ui-provider`).
  Reason: cobre modais de estado local (dialog, EventSheet, DayPopup) que o `ui-provider` não conhece; garante "fecha só o topo" e independe de foco.
  ADR needed: no

## Files changed

- `hooks/use-escape-close.ts` (novo) — pilha global + listener de captura no document (ID 010).
- `hooks/use-long-press.ts` (novo) — toque longo + clique-direito reutilizável (ID 009).
- `components/ui/dialog.tsx` — Esc fecha confirm/prompt sem foco (ID 010).
- `components/items/item-detail.tsx` — Esc fecha overlay de tarefa/evento (ID 010).
- `components/calendar/calendar-board.tsx` — Esc fecha `EventSheet` (ID 010).
- `components/calendar/calendar-event-capture.tsx` — Esc fecha captura de evento sem foco (ID 010).
- `components/agents/agents-editor-modal.tsx` — Esc fecha editor AGENTS.md (ID 010).
- `app/(app)/calendar/page.tsx` — Esc no `DayPopup` (ID 010); chips do mês mobile com quebra em 2 linhas + padding/altura (ID 005).
- `app/(app)/notas/page.tsx` — Esc no drawer mobile (ID 010); seção "Subpastas" navegável + headers de coluna kanban clicáveis (ID 008); long press em `ContentCard`/`ContentRow` (ID 009); `ContentRow` mobile só com título e colunas responsivas (ID 013).
- `app/(app)/today/page.tsx` — `TaskArticle` com long press (ID 009); remoção do badge "hoje" redundante + horário condicional + caixa de horário mais escura (ID 011).
- `components/layout/topbar.tsx`, `components/layout/sidebar.tsx`, `app/(app)/dashboard/page.tsx` — "Calendario" → "Calendário" (ID 012).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — só warnings pré-existentes (`react-hooks/exhaustive-deps`, `no-img-element`), sem erros novos.
- [x] `pnpm --filter @doit/web build` — `✓ Compiled successfully` + SSG 21/21 OK; falha apenas no copy do `output: standalone` (EPERM de symlink no Windows/OneDrive), não relacionada às mudanças.

Frontend evidence (Playwright, sign-up local + seed via API; sem Google):

- Servidor: `pnpm --filter @doit/web dev` em :3000 (background); encerrado ao final (porta liberada, confirmado `server down`).
- Script: `specs/validate-reajustes.mjs` — **17/17 checks OK** (mobile 390×844 + desktop 1440×900).
- Cobertura: ID012 título "Calendário"; ID005 chip do mês com título completo + quebra 2 linhas (mobile) e truncate (desktop); ID013 lista mobile só título + preview oculto (desktop mantém); ID008 pasta só-subpastas mostra subpasta clicável, entra e volta à raiz; ID009 long press em nota e em tarefa abre o menu; ID011 tarefa sem horário sem badge "hoje" e tarefa com horário exibe "14:30"; ID010 Esc fecha diálogo sem foco interno; sem regressão no calendário/lista desktop.
- Screenshots em `specs/artifacts/2026-05-29-reajustes-mobile-calendario-notas-modais/`:
  `01-calendar-mobile-mes.png`, `02-notas-lista-mobile.png`, `03-notas-pasta-so-subpastas-mobile.png`,
  `04-notas-dentro-subpasta-mobile.png`, `05-longpress-nota-menu-mobile.png`, `06-today-mobile-badges.png`,
  `07-longpress-tarefa-menu-mobile.png`, `08-calendar-desktop.png`, `09-notas-lista-desktop.png`.

Nota: a API deriva o título da nota da primeira linha do conteúdo — irrelevante para o app; só ajustou-se o seed do teste.

## Risks

- Risk: listener global de Esc em captura com `stopPropagation` poderia engolir Esc de outros fluxos.
  Mitigation: só age quando a pilha tem modal; quando vazia, não intercepta (atalhos do ui-provider seguem funcionando).
- Risk: quebra de chips no mês mobile pode estourar a altura da célula.
  Mitigation: limite de 2 linhas + min-height; validar em largura de celular.

## Next step

Abrir PR (branch → `dev`). Revisar com "ignore whitespace" (EOL mistos no repo).
