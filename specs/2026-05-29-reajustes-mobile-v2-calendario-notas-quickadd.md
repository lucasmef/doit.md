# Reajustes mobile v2: calendário (mês/semana), notas (scroll/header/lista), Hoje, long press, Esc, quick add

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Segunda rodada de reajustes mobile (IDs 005, 008, 009, 010, 011, 013, 014, 015, 016) sobre o que
foi entregue na PR #30 (já em `dev`). Foco em altura/legibilidade do calendário, arquitetura de
scroll e header das notas, layout da página Hoje, long press, Esc e o modal de quick add. Sem
refatoração ampla; desktop preservado.

## Context

App doit.md (Next.js 15 App Router, React 19, Tailwind, SWR, pnpm). A casca (`app-chrome.tsx`)
usa scroll de janela (`min-h-screen`, topbar `sticky`). Hoje a página de notas força
`h-[calc(100vh-120px)]` + `overflow-auto` interno → cria scroll aninhado dentro de um card
("scroll duplo"). Calendário mobile abre maximizado (MES) com `h-[calc(100dvh-10.5rem)]` —
reserva grande demais → sobra branca embaixo. Quick add compacto usa overlay com gradiente vívido
e painel `bg-white/92` translúcido. Long press (PR #30) usa `useLongPress` (pointerdown touch +
timer 450ms); Esc usa `useEscapeClose` (pilha global + captura no document).

## Scope

- [ ] ID 005 — `/calendar` mês mobile: ocupar melhor a altura (menos branco), 2–3 eventos/dia, `+X mais` em bloco próprio.
- [ ] ID 008 — `/notas` mobile: eliminar scroll duplo (scroll único na área de conteúdo) + manter subpastas navegáveis.
- [ ] ID 009 — long press abre menu em tarefa e nota; toque simples abre; sem conflito com scroll/seleção. Endurecer.
- [ ] ID 010 — Esc fecha modal top-level sem foco; só o mais recente; validar nos principais.
- [ ] ID 011 — Hoje mobile: itens sem horário sem coluna vazia (alinham à esquerda); itens com horário com solução visual; sem layout apertado.
- [ ] ID 013 — lista de notas mobile: só título + ícone discreto (nota/tarefa); sem preview e sem rótulos "tarefa/nota/nota grande".
- [ ] ID 014 — `/calendar` semana mobile: menos dias por vez (~3) com swipe horizontal; eventos legíveis.
- [ ] ID 015 — quick add mobile: fundo esbranquiçado (não translúcido), abas nota/tarefa/evento em largura cheia, input com foco automático.
- [ ] ID 016 — header das notas mobile: remover contadores, agrupar ações (AGENTS.md/nova subpasta/favoritar) em menu kebab, remover "Novo item" do topo, botão contextual no fim da lista/kanban.

## Out of scope

- Refatorar calendar-board/calendar-sidebar (legado), auth, sync, schema, API, dados.
- Reabrir itens validados na PR #30 (ex.: ID 012 título "Calendário").

## Grill Gate

Decision: not_needed

Reason: critérios objetivos e observáveis; o item 008 autoriza explicitamente o agente a escolher a
solução técnica de scroll. Nenhuma decisão arquitetural/dados.

## Decisões técnicas

- ID 005: reduzir a reserva de altura mobile do container do calendário e garantir que o grid do mês
  preencha; manter 2 eventos + bloco `+X mais` (dentro de "2 ou 3"); estilizar `+X mais` como bloco.
- ID 008: mobile usa o scroll da janela (sem `overflow-auto` interno, sem altura fixa); `lg:` mantém
  o card de altura fixa com scroll interno (desktop ok). Subpastas navegáveis já existem (PR #30).
- ID 009: manter `useLongPress`; adicionar `touch-action: pan-y` aos cards/linhas para permitir scroll
  vertical sem cancelar o toque longo, e `-webkit-touch-callout: none` para evitar callout de seleção.
- ID 011: na agenda da Hoje, coluna de horário deixa de ser fixa: item sem horário usa grid
  `[28px_1fr]` (checkbox + título), item com horário usa `[auto_28px_1fr]` (chip de horário + checkbox + título).
- ID 013: `ContentRow` mobile → só título + ícone discreto por tipo (nota/tarefa); segunda linha e
  rótulos só no desktop (`sm:`).
- ID 014: visão semana → no mobile vira faixa rolável horizontal com `snap`, cada dia ~30% da largura
  (~3 por vez); `lg:` mantém grid de 7 colunas.
- ID 015: overlay com gradiente vívido só no modo expandido; no compacto, backdrop neutro + painel
  `bg-white` opaco; abas `CaptureModeTabs` em largura cheia com rótulo visível e alvo maior; `autoFocus` no input.
- ID 016: header das notas mobile com contadores `hidden lg:*`; ações agrupadas em menu kebab
  (mobile), botão "Novo item" do topo `hidden lg:*`; botão contextual "Novo item" no fim da lista.

## Acceptance criteria

- [ ] Mês mobile preenche a altura (sem branco grande), 2–3 eventos, `+X mais` em bloco; desktop ok.
- [ ] Semana mobile com ~3 dias e swipe horizontal; eventos legíveis; desktop 7 colunas.
- [ ] Notas mobile: sem scroll duplo; entrar em pasta só-subpastas, navegar e voltar; desktop ok.
- [ ] Lista de notas mobile: só título + ícone discreto; desktop mantém trecho.
- [ ] Header de notas mobile sem contadores; ações em menu; sem "Novo item" no topo; botão no fim.
- [ ] Long press abre menu em tarefa e nota; toque simples abre; scroll funciona.
- [ ] Esc fecha modal ativo sem foco; só o mais recente.
- [ ] Hoje mobile: item sem horário alinhado à esquerda (sem coluna vazia); com horário mostra horário.
- [ ] Quick add mobile: fundo esbranquiçado; abas em largura cheia; input com foco.

## Implementation plan

- [ ] ID 005 + 014 — `app/(app)/calendar/page.tsx` (altura mês + `+X mais` bloco; semana swipe).
- [ ] ID 008 + 013 + 016 — `app/(app)/notas/page.tsx` (scroll, header kebab, lista mobile, botão fim).
- [ ] ID 011 — `app/(app)/today/page.tsx` (grid de horário condicional).
- [ ] ID 009 — `hooks/use-long-press.ts` + cards/linhas (`touch-action`).
- [ ] ID 010 — revalidar `useEscapeClose` nos principais modais.
- [ ] ID 015 — `components/items/quick-capture.tsx` + `components/capture/capture-mode-tabs.tsx`.
- [ ] Validação: type-check, lint, build, Playwright + screenshots, PR.

## Progress

- 2026-05-29 — Análise do estado pós-PR#30; spec criada; decisões registradas.

## Files changed

- `app/(app)/calendar/page.tsx` — altura mobile do mês (`100dvh-5.5rem`), bloco `+X mais` (005); semana mobile com swipe horizontal + chips legíveis (014).
- `app/(app)/notas/page.tsx` — scroll único no mobile + altura/overflow só no `lg` (008); ícone discreto nota/tarefa na lista (013); header kebab, contadores `lg:`, "Novo item" do topo `lg:`, botão contextual no fim (016); `touch-pan-y` nos cards (009).
- `app/(app)/today/page.tsx` — grid de horário condicional (sem coluna vazia) (011); `touch-pan-y` no `TaskArticle` (009).
- `components/items/quick-capture.tsx` — aurora só no expandido + painel compacto `bg-white` opaco + `autoFocus` (015).
- `components/capture/capture-mode-tabs.tsx` — abas em largura cheia, rótulos sempre visíveis, alvo maior (015).
- `components/items/item-row.tsx` — `touch-pan-y` / `-webkit-touch-callout:none` (009).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — só warnings pré-existentes, sem erros novos.
- [x] `pnpm --filter @doit/web build` — `✓ Compiled` + SSG 21/21; falha só no copy do `output: standalone` (EPERM symlink Windows/OneDrive), não relacionada.

Frontend evidence (Playwright, sign-up local + seed via API; sem Google):

- Servidor: `pnpm --filter @doit/web dev` em :3000 (background); encerrado ao final (porta liberada, `server down`).
- Script: `specs/validate-reajustes-v2.mjs` — **25/25 checks OK** (mobile 390×844 + desktop 1440×900).
- Cobertura: 005 (mês preenche altura + `+X mais`), 014 (semana rolável ~3 dias), 008 (sem scroll aninhado + subpasta navegável), 013 (só título + ícone discreto), 016 (sem contadores, kebab, sem "Novo item" no topo, botão no fim), 011 (sem coluna vazia / com horário), 015 (painel branco opaco + abas largura cheia + input focado), 009 (long press nota e tarefa), 010 (Esc sem foco), desktop sem regressão.
- Screenshots em `specs/artifacts/2026-05-29-reajustes-mobile-v2-calendario-notas-quickadd/` (01..11).

## Risks

- Risk: trocar o scroll da notas pode afetar o kanban (precisa de altura).
  Mitigation: kanban mobile com `min-h` e scroll horizontal; vertical pela janela.
- Risk: foco automático do input pode não abrir teclado em iOS (gesto).
  Mitigation: `autoFocus` + foco no gesto de abertura; validar foco via Playwright (teclado não verificável headless).

## Next step

Implementar na ordem do plano e validar em mobile (390×844) + desktop.
