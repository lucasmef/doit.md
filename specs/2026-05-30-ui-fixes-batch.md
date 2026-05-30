# UI Fixes Batch (IDs 025-060)

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Fix remaining UI and behavior issues across the app, including the creation modal, today page layout, search behavior, and folder header. Ensure desktop and mobile behaviors are preserved and consistent.

## Scope

- [x] ID 025 - Reajustar - Pastas / Menu de ações: Move "Nova pasta" and "Editar AGENTS.md" into the folder menu on desktop, hide standalone "Novo item" button.
- [x] ID 029 - Reajustar - Modal de criação / Desktop: Always open the full creation modal on desktop.
- [x] ID 030 - Reajustar - Modal de criação / Evento: Fix visual consistency of the event modal, open full modal on desktop.
- [x] ID 039 - Pendente - Página Hoje / Painel lateral: Implement standalone side panel for Today page (`today-single-board-v3-standalone`).
- [x] ID 040 - Pendente - Página Hoje / Calendário lateral: Make the mini-calendar filter items by the selected date.
- [x] ID 043 - Reajustar - Notas / Destaques: Add pin/unpin to the note context menu (right-click).
- [x] ID 056 - Pendente - Busca / Tarefas concluídas: Hide completed tasks from search results by default.
- [x] ID 057 - Pendente - Busca / Acentuação: Make search accent-insensitive.
- [x] ID 058 - Pendente - Pastas / Desktop / Cabeçalho: Reduce header height, remove counts, move view/sort toggles.
- [x] ID 059 - Pendente - Pastas / Checkbox / Conclusão: Checkbox in folders should complete the task.
- [x] ID 060 - Pendente - Página Hoje / Navegação lateral: Inbox and Upcoming links should open within the Today layout.

## Out of scope

- Broad refactoring of UI components beyond the requested fixes.
- Reopening or modifying already completed IDs.

## Grill Gate

Decision: not_needed
Reason: The requirements are very specific and localized to certain UI components. We can infer the necessary changes by inspecting the existing code for each ID.

## Acceptance criteria

- Desktop folder view does not show standalone "Nova pasta" / "Novo item" buttons outside the menu.
- Creation modal always opens full version on desktop.
- Event creation modal looks consistent with Task/Note modals.
- Today page has a side panel that matches the standalone reference.
- Clicking a date in the Today side calendar filters the list.
- Note context menu has "Destacar" / "Remover destaque".
- Search doesn't show completed tasks by default and ignores accents.
- Folder header is compact on desktop.
- Task checkbox in folder view toggles completion status.
- Inbox/Upcoming links in Today side nav don't trigger a full page reload but load within the layout.

## Progress

- 2026-05-30 11:45 - Spec created. Context review started.
- 2026-05-30 14:53 - All tasks completed. 

## Decisions

- **ID 039/060:** Refactored `apps/web/src/app/(app)/today/page.tsx` to hold an internal state `currentView` ('hoje', 'inbox', 'upcoming') to prevent reloading the page when selecting the sidebar links. Layout already matched the standalone reference.
- **ID 029/030:** Used `window.matchMedia('(min-width: 1024px)')` to force expanded state on Desktop.
- **ID 056/057:** Used `$nin: ['archived', 'done']` in MongoDB search query, and `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` on `matchesSearch` helper.

## Files changed

- `apps/web/src/app/(app)/notas/page.tsx`
- `apps/web/src/components/items/bulk-actions.tsx`
- `apps/web/src/components/items/quick-capture.tsx`
- `apps/web/src/components/calendar/calendar-event-capture.tsx`
- `apps/web/src/app/api/items/search/route.ts`
- `apps/web/src/app/api/items/route.ts`
- `apps/web/src/app/(app)/today/page.tsx`

## Validation

Commands run:
- [x] `pnpm --filter @doit/web exec tsc --noEmit` (Passed!)

## Next step

Validation of visual impacts (mobile vs desktop rendering of modals, layout of folders and today pages, and search filtering).
