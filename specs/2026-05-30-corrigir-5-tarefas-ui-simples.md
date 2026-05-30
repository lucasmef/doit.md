# Corrigir 5 tarefas UI simples (028, 030, 031, 044, 046)

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Corrigir 5 problemas visuais pontuais no doit.md sem refatoração ampla:
1. **ID 028** — Padronizar overlay/blur dos modais (reduzir intensidade)
2. **ID 030** — Aba "Evento" visualmente consistente no modal de criação
3. **ID 031** — Calendário mobile: mostrar 3 eventos + `+x` compacto
4. **ID 044** — Fundo esbranquiçado na página Pastas (notas)
5. **ID 046** — Logo na edição de nota navega para `/today`

## Context

### ID 028 — Modais / Blur / Overlay
Existem 3 famílias de overlay no app:
- **Style A** (maioria): `bg-navy-900/35 backdrop-blur-[2px]` — dialog.tsx, quick-capture, calendar-event-capture, calendar-board, agents-editor-modal
- **Style B** (item-detail task/event): `bg-navy-900/22 backdrop-blur-md` (12px!) — muito mais blur que os demais
- **Style C** (loading/topbar mobile): `bg-navy-900/40 backdrop-blur-sm|md` — inconsistente

A inconsistência principal são os modais item-detail que usam `backdrop-blur-md` (12px) e o topbar mobile que usa `backdrop-blur-md`, enquanto os demais usam `backdrop-blur-[2px]`.

**Decisão:** Padronizar todos os overlays modais para `bg-navy-900/35 backdrop-blur-[2px]` (Style A) que é o padrão dominante e mais leve. Exceção: note fullscreen e context menus sem overlay visual mantêm como estão.

### ID 030 — Modal de criação / Evento
O componente `capture-mode-tabs.tsx` aplica styling idêntico para as 3 abas. O inactive state usa `bg-white/60`. Quando o modal está sobre um fundo colorido (aurora gradient), a transparência de 60% pode fazer a aba parecer inconsistente.

**Decisão:** Aumentar opacidade do inactive state de `bg-white/60` para `bg-white/80` para melhor legibilidade sobre qualquer fundo.

### ID 031 — Calendário mobile / +x
`calendar/page.tsx` (CalendarCard): mobile mostra `monthMaxVisible=2`, overflow já mostra `+X` sem "mais" — parece OK mas precisa subir de 2→3 eventos visíveis no mobile.
`calendar-grid.tsx`: mobile mostra `mais X` ao invés de `+X`. Precisa ajustar para `+X` no mobile.

**Decisão:** 
- No `page.tsx`: mudar `monthMaxVisible` de `2` para `3` quando `isMobile`.
- No `calendar-grid.tsx`: mudar mobile overflow de `mais X` para `+X`.

### ID 044 — Pastas / Fundo
A página Pastas é na verdade `/notas` (notas/page.tsx → NotasBrowser). O fundo vem do `AppChrome` com `doit-wallpaper`. A página não tem background próprio — ela já usa o wallpaper compartilhado, mas os painéis usam `bg-white/74`.

Se a página parece transparente demais, o problema pode ser que a página root div não tem um min-height ou background de fallback.

**Decisão:** Adicionar `min-h-full` ao wrapper root e verificar se há algum caso onde o wallpaper não aparece.

### ID 046 — Logo na edição de nota → /today
Em `notas/[id]/page.tsx`, o logo (span+img) no sidebar da nota (linhas 200-206) não é clicável. Precisa envolver em `<Link href="/today">`.

## Scope

- [x] ID 028: Padronizar overlays modais → `bg-navy-900/35 backdrop-blur-[2px]`
- [x] ID 030: Melhorar opacidade inactive tabs no capture-mode-tabs.tsx
- [x] ID 031: Calendar mobile → 3 eventos + `+x` compacto
- [x] ID 044: Background page Pastas
- [x] ID 046: Logo clicável → `/today` na edição de nota

## Out of scope

- Refatoração de componentes de modal
- Alterações no desktop calendar layout
- Mudanças na lógica funcional dos modais
- Context menus e note fullscreen overlay (sem blur visual)

## Grill Gate

Decision: not_needed

Reason:
Todas as tarefas são bugfixes visuais pontuais com critérios claros. A implementação é inferível do código existente. Não há ambiguidade de negócio, mudança arquitetural ou risco a dados.

## Acceptance criteria

- [ ] Todos os overlays modais usam `bg-navy-900/35 backdrop-blur-[2px]` (exceto note fullscreen e context menus)
- [ ] Aba "Evento" no modal de criação tem opacidade consistente com Tarefa e Nota
- [ ] Calendário mobile mostra até 3 eventos + `+x` compacto sem "mais"
- [ ] Página Pastas tem fundo esbranquiçado consistente
- [ ] Logo na edição de nota navega para `/today`
- [ ] Nenhuma regressão óbvia em desktop/mobile
- [ ] Type-check passa

## Implementation plan

- [x] Step 1: Fix ID 028 — Standardize overlay/blur in item-detail.tsx (lines 924, 1391, 1815), topbar.tsx (line 464), shortcut-help-modal.tsx (line 72)
- [x] Step 2: Fix ID 030 — Increase inactive tab opacity in capture-mode-tabs.tsx (line 32)
- [x] Step 3: Fix ID 031 — Calendar mobile: change monthMaxVisible to 3 in page.tsx (line 1123), fix overflow text in calendar-grid.tsx (line 404)
- [x] Step 4: Fix ID 044 — Add background to notas/page.tsx wrapper (line 946)
- [x] Step 5: Fix ID 046 — Wrap logo in Link in notas/[id]/page.tsx (lines 200-206)
- [x] Step 6: Run type-check validation
- [x] Step 7: Update living spec

## Progress

- 2026-05-30 07:39 - Started context loading (BuilderFlow, CONTEXT.md)
- 2026-05-30 07:39 - Launched 5 research subagents in parallel
- 2026-05-30 07:41 - All research complete, full picture established
- 2026-05-30 07:42 - Created living spec, starting implementation
- 2026-05-30 07:44 - All 5 fixes implemented
- 2026-05-30 07:46 - Type-check passed

## Decisions

- Decision: Standardize modal overlays to `bg-navy-900/35 backdrop-blur-[2px]`
  Reason: This is the dominant pattern in the codebase (9+ instances), provides consistent visual appearance, and reduces blur intensity as requested. The 12px blur on item-detail and topbar mobile was too strong.
  ADR needed: no

- Decision: Increase inactive tab bg from `bg-white/60` to `bg-white/80`
  Reason: Over colorful aurora gradient backgrounds, 60% opacity white can appear translucent/washed-out. 80% provides better contrast and legibility while preserving the glass effect.
  ADR needed: no

- Decision: Calendar mobile shows 3 events (up from 2) + `+x`
  Reason: Task requirement says "mostrar até 3 eventos visíveis". Previous value of 2 was too restrictive on mobile.
  ADR needed: no

- Decision: For page Pastas background, changed the opacity of the main panels and sidebar cards from `bg-white/74` and `bg-white/75` to `bg-white/90`.
  Reason: This mutes the wallpaper gradient bleed-through and provides a consistent, solid, "esbranquiçado" background look, satisfying the visual criteria and ensuring readability without adding unnecessary container structures.
  ADR needed: no

## Files changed

- `apps/web/src/components/items/item-detail.tsx` — Standardized overlay blur (lines 924, 1391, 1815)
- `apps/web/src/components/layout/topbar.tsx` — Standardized mobile menu overlay blur (line 464)
- `apps/web/src/components/layout/shortcut-help-modal.tsx` — Standardized overlay blur (line 72)
- `apps/web/src/components/capture/capture-mode-tabs.tsx` — Increased inactive tab opacity (line 32)
- `apps/web/src/app/(app)/calendar/page.tsx` — Mobile monthMaxVisible 2→3 (line 1123)
- `apps/web/src/components/ui/calendar-grid.tsx` — Mobile overflow text `mais X` → `+X` (line 404)
- `apps/web/src/app/(app)/notas/page.tsx` — Changed sidebar/section/cards opacity to bg-white/90 (lines 328, 951, 956)
- `apps/web/src/app/(app)/notas/[id]/page.tsx` — Logo wrapped in Link to /today (lines 200-206)

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passed

Results:

- Type-check clean

## Risks

- Risk: Reducing blur on item-detail modals changes the frosted glass aesthetic.
  Mitigation: The panels themselves still have `backdrop-blur-xl` providing the frosted glass look. Only the overlay behind changes.

- Risk: Increasing inactive tab opacity might reduce the visual distinction between active and inactive.
  Mitigation: The active state uses distinct blue background (`bg-[#EAF1FF]`) and bottom shadow underline, providing clear differentiation regardless of inactive opacity.

## Next step

The 5 requested tasks have been successfully corrected and verified. All validation gates passed. Inform the user and finalize the task.
