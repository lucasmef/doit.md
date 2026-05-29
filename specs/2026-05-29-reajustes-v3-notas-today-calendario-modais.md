# Reajustes v3: long press, notas desktop, espaçamento, Hoje, calendário, pastas e modais

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Terceira rodada de reajustes sobre o que já foi entregue (PR #30 + menu de contexto de pastas +
novo layout Today v3). Corrigir 20 itens ativos (IDs 009, 016, 019, 020, 022, 023, 025, 026, 027 =
reajuste; 028–034 = pendentes novos). Sem refatoração ampla; preservar desktop e mobile; manter o
padrão visual (fundos esbranquiçados, cards suaves, menos poluição, sem múltiplas barras de rolagem).

## Context

App doit.md (Next.js 15 App Router, React 19, Tailwind, SWR, pnpm). Arquivos-chave já mapeados:

- `components/layout/app-chrome.tsx` — espaçamento global topbar→conteúdo (`pt-5 lg:pt-0`, `lg:mb-6`).
- `components/ui/dialog.tsx` — confirm/prompt base; overlay `bg-navy-900/40 backdrop-blur-sm`.
- `components/agents/agents-editor-modal.tsx` — overlay `bg-navy-900/40 backdrop-blur-sm`.
- `components/calendar/calendar-event-capture.tsx` — overlay `bg-navy-900/24 backdrop-blur-md` (mais forte/divergente).
- `components/calendar/calendar-board.tsx` — overlays `/35` e `/45` `backdrop-blur-sm`.
- `app/(app)/calendar/page.tsx` — calendário (mês/semana/fullscreen), `+X mais`, modal de evento.
- `app/(app)/today/page.tsx` + `today.css` — layout Today v3 (board/sidebar/center).
- `app/(app)/notas/page.tsx` — pastas/notas, `FolderMenu`, kanban, lista, header.
- `components/items/quick-capture.tsx` + `components/capture/capture-mode-tabs.tsx` — quick add e abas.
- `components/items/bulk-actions.tsx` (`ItemContextMenu`) — menu de contexto de item (long press).
- `hooks/use-folders.ts`, `hooks/use-preferences.ts`, `hooks/use-long-press.ts`.

Referências de design: `docs/doitmd-layout-codex-package/desktop/{modais,quick-add,menu-pasta,menu-contextual,today-single-board-v3}-standalone.html`.

## Scope

- [ ] ID 009 — menu por long press mostra título/identidade do item (tarefa e nota).
- [ ] ID 016 — notas desktop: remover scroll interno do seletor de pastas e do painel direito; usar a altura.
- [ ] ID 019 — reduzir espaçamento superior global (moderado, mobile+desktop).
- [ ] ID 020 — Hoje: ordenação (eventos→com horário→prioridade alta/média/baixa→sem prioridade→recentes) + barra lateral por prioridade (vermelho/laranja/amarelo/neutro).
- [ ] ID 022 — calendário desktop fullscreen: eventos sem truncamento/compressão; melhor distribuição.
- [ ] ID 023 — tarefas em pastas usam checkbox desmarcado (não verde/check) quando abertas.
- [ ] ID 025 — consolidar ações da pasta em menu único (sumir botões soltos do topo).
- [ ] ID 026 — ordenação alfabética padrão + persistência por pasta.
- [ ] ID 027 — ação segura "Excluir pasta" no menu (com confirmação).
- [ ] ID 028 — padronizar overlay/backdrop dos modais + reduzir blur.
- [ ] ID 029 — desktop abre direto o modal completo de criação.
- [ ] ID 030 — aba "Evento" consistente com "Tarefa"/"Nota".
- [ ] ID 031 — calendário mobile: `+X` no lugar de `+X mais`.
- [ ] ID 032 — evento clicado fica destacado.
- [ ] ID 033 — menu de pasta funciona nas pastas destacadas.
- [ ] ID 034 — menu de pasta funciona no Kanban via botão direito.

## Out of scope

- Refatorar calendar-board/calendar-sidebar legado, auth, sync, schema, API, dados.
- Reabrir itens já validados como OK em rodadas anteriores.

## Grill Gate

Decision: not_needed

Reason: critérios objetivos e observáveis; mockups disponíveis para modais/quick-add/menus; nenhuma
decisão arquitetural, de dados, auth ou billing. Persistência de ordenação por pasta usa o mecanismo
de preferências já existente (`usePreferences`), sem mudança de schema.

## Decisões técnicas

- ID 019: padrão global — reduzir `pt-5`→`pt-3` (mobile) e `lg:mb-6`→`lg:mb-4`; manter respiro moderado.
- ID 028: criar um padrão único de overlay (scrim `bg-navy-900/35` + `backdrop-blur-[2px]`) e aplicar em todos os modais (dialog, agents, calendar-event-capture, calendar-board, calendar/page, quick-capture).
- ID 026: persistir `folderSort: Record<folderId, sortKey>` em `usePreferences().prefs`; default = alfabético; ler/gravar por pasta.
- ID 027: trocar `confirm()` nativo do FolderMenu por `useDialog().confirm` (danger), com aviso de cascata.

## Implementation plan

- [ ] Global/modais: app-chrome (019), overlays (028), quick-capture desktop full (029), tabs Evento (030).
- [ ] Today: ordenação + barra de prioridade (020).
- [ ] Calendar: fullscreen events (022), `+X` mobile (031), destaque de evento (032).
- [ ] Notas/Pastas: scroll desktop (016), checkbox (023), menu consolidado (025), sort+persistência (026), excluir pasta (027), menu em destacadas (033) e kanban botão direito (034).
- [ ] Long press com contexto do item (009).
- [ ] Validação: type-check, lint, build, validação visual local + screenshots; commit/push em `dev`.

## Progress

- 2026-05-29 — Contexto carregado (AGENTS.md, specs recentes, mockups). Spec criada. BuilderFlow instalada em `.claude/skills/builderflow/`.

## Files changed

- `components/layout/app-chrome.tsx` — espaçamento superior global reduzido (`pt-5`→`pt-3`, `lg:mb-6`→`lg:mb-4`) (019).
- `components/ui/dialog.tsx`, `components/agents/agents-editor-modal.tsx`, `components/calendar/calendar-event-capture.tsx`, `components/calendar/calendar-board.tsx` (3 overlays), `app/(app)/calendar/page.tsx` (DayPopup), `components/items/quick-capture.tsx`, `app/(app)/notas/page.tsx` (drawer) — overlay padronizado `bg-navy-900/35 backdrop-blur-[2px]` (028).
- `components/items/quick-capture.tsx` — detecção de desktop (`matchMedia`) força modal completo (`isExpanded`); abas Tarefa/Nota/Evento também no header expandido de tarefa (029, 030).
- `components/capture/capture-mode-tabs.tsx` — abas inativas com superfície esbranquiçada visível (Evento deixa de parecer transparente) (030).
- `app/(app)/today/page.tsx` + `today.css` — lista unificada ordenada (eventos→com horário→prioridade→sem prioridade/recentes) + barra lateral por prioridade `prio-1/2/3/0` (020).
- `app/(app)/calendar/page.tsx` — `monthMaxVisible` (mais eventos no fullscreen desktop) (022); `+X` no mobile / `+X mais` no desktop (031); `selectedEventId` + `handleEventClick` com destaque em mês/semana/dia/agenda (032).
- `hooks/use-preferences.ts` — novo campo `folderSort: Record<string,string>` (default `{}`) com parsing seguro (026).
- `app/(app)/notas/page.tsx` — `sortKey` derivado/persistido por pasta (default alfabético) (026); sidebar sticky + remoção de `overflow-auto` internos do painel direito/kanban (016); helper `itemGlyphTone` (tarefa aberta neutra, verde só concluída) (023); topo só com "Novo item" + kebab (025); `SidebarFolderRow` com menu nas Destacadas/busca (033); `onContextMenu` nas colunas do kanban (034); excluir já com `confirm` danger (027).
- `components/items/bulk-actions.tsx` — header do menu de contexto mostra tipo + título sempre (mobile e desktop) (009).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — só warnings pré-existentes (img/exhaustive-deps), nenhum erro novo.
- [x] `pnpm --filter @doit/web build` — `✓ Compiled` + SSG 21/21; falha apenas no copy do `output: standalone` (EPERM symlink Windows/OneDrive), não relacionada ao código.

Frontend evidence:

- *Pendente de revisão manual no navegador.* As mudanças são majoritariamente CSS/estrutura e passaram em type-check + build. A validação visual automatizada (Playwright sign-up+seed) não foi executada nesta rodada; recomenda-se conferir localmente os pontos da seção "Next step".

## Risks

- Risk: remover altura fixa/overflow das notas desktop pode reintroduzir scroll de página inesperado.
  Mitigation: usar a altura do viewport via flex no shell desktop sem `overflow-auto` aninhado.
- Risk: mudança de ordenação na Hoje pode conflitar com lógica existente de seções.
  Mitigation: alterar somente o comparador, preservando fetch/seções.

## Next step

Revisão visual manual (mobile 390×844 + desktop 1440×900):
- Hoje: confirmar ordem (eventos→com horário→prioridade→sem prioridade) e barra lateral colorida por prioridade.
- Notas desktop: sidebar sem barra de rolagem própria e painel direito sem scroll interno (só a página rola); kanban sem scroll vertical interno.
- Pastas: tarefa aberta com checkbox neutro (não verde); topo só com "Novo item" + kebab; menu funcionando em Destacadas (sidebar) e em coluna do kanban (botão direito); ordenação alfabética padrão e persistente por pasta.
- Calendário desktop fullscreen: mais eventos por célula sem truncar; mobile mostra `+X`; evento clicado destacado.
- Modais: overlay/blur consistente e mais leve; desktop abre modal completo direto; aba Evento com superfície visível.
- Long press (mobile) e clique direito (desktop) em item: header mostra tipo + título.
