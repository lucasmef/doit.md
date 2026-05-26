# Corrigir menu mobile e pasta de nota

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-26
- Updated: 2026-05-26

## Objective

Corrigir regressoes mobile e de organizacao de notas: permitir remover a pasta de uma nota para ela voltar ao Inbox, garantir fundo solido no menu sanduiche mobile e fazer o calendario usar o mesmo menu mobile global em vez de abrir um menu separado.

## Context

O app usa Next.js App Router, SWR e `Item` como entidade central. Notas soltas aparecem no Inbox quando nao tem `folderId`. A edicao pelo detalhe do item chamava `updateItem` com `folderId: undefined` ao escolher Inbox, o que nao remove o campo no PATCH individual. O calendario em `/calendar` ocultava o `Topbar`, entao usava um sanduiche proprio dentro do `CalendarBoard` para filtros.

## Scope

- [x] Revisar fluxo de `folderId` em detalhe de item, bulk actions e API.
- [x] Corrigir remocao de pasta no detalhe da nota.
- [x] Deixar o menu mobile global com fundo solido.
- [x] Renderizar o menu mobile global tambem em `/calendar` e mover acoes de calendario para dentro dele.
- [x] Validar type-check e fluxo mobile no navegador com screenshots.

## Out of scope

- Alterar schema de banco de dados.
- Alterar fluxo de sync Markdown.
- Redesenhar navegacao desktop.

## Grill Gate

Decision: not_needed

Reason:
A regra de produto e inferivel pelo codigo existente: `folderId` ausente/nulo define nota solta, e nota solta conta no Inbox. A navegacao mobile ja tem menu global em `Topbar`; o bug era o calendario contornar esse menu.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Escolher Inbox/Sem pasta no detalhe de uma nota persiste `folderId` removido/nulo e a nota aparece no Inbox.
- [x] O menu sanduiche mobile abre com painel visualmente solido.
- [x] Em `/calendar` no mobile, o sanduiche abre o mesmo menu global e acoes especificas do calendario aparecem dentro dele.
- [x] Type-check do web passa.
- [x] Screenshots mobile sao salvos em `specs/artifacts/2026-05-26-corrigir-menu-mobile-e-pasta-nota/`.

## Implementation plan

- [x] Ajustar PATCH individual para normalizar `folderId: null` e remover campo quando necessario.
- [x] Atualizar chamadas de UI para enviar `folderId: null` ao remover pasta.
- [x] Estender menu mobile do `Topbar` para expor acoes de calendario via eventos.
- [x] Exibir `Topbar` no calendario apenas no mobile e remover o sanduiche proprio do calendario fullscreen.
- [x] Rodar validacao e atualizar esta spec.

## Progress

- 2026-05-26 00:00 - Started context review with BuilderFlow and doit-workflow rules.
- 2026-05-26 00:00 - Found `handleProjectChange` sends `folderId: projectId || undefined`, which cannot clear the folder through the item PATCH endpoint.
- 2026-05-26 00:00 - Found `/calendar` hides `Topbar` in `AppChrome` and `CalendarBoard` owns a separate fullscreen filter menu button.
- 2026-05-26 08:31 - Started temporary dev server. First explicit `-p 3000` attempt failed because Next interpreted the port argument as a project directory.
- 2026-05-26 08:32 - Started temporary dev server with `pnpm --filter @doit/web dev`; listener PID was 17428.
- 2026-05-26 08:34 - Browser validation found the calendar grid intercepting clicks because the mobile menu was rendered inside the header stacking context.
- 2026-05-26 08:36 - Moved the mobile menu overlay outside the header and validated screenshots successfully.
- 2026-05-26 08:37 - Validated `folderId: null` clears a note folder and the note appears in `GET /api/items?folderId=null`.
- 2026-05-26 08:38 - Stopped the temporary server; port 3000 no longer had a listener.

## Decisions

- Decision: Use `null` as the UI/API signal for clearing `folderId`.
  Reason: Existing guards accept null/empty values and bulk PATCH already treats null/empty as unset.
  ADR needed: no
- Decision: Keep calendar filter UI as the existing sheet, but open it from actions inside the global mobile menu on `/calendar`.
  Reason: This avoids duplicating app navigation while preserving the existing calendar controls.
  ADR needed: no

## Files changed

- `apps/web/src/components/items/item-detail.tsx` - send `folderId: null` when selecting Inbox/Sem pasta.
- `apps/web/src/app/api/items/[id]/route.ts` - unset `folderId` when PATCH receives `null` or empty string.
- `apps/web/src/components/layout/topbar.tsx` - render mobile menu as a fixed sibling overlay with solid background and calendar-specific actions.
- `apps/web/src/components/layout/app-chrome.tsx` - show mobile `Topbar` on `/calendar` and adjust mobile calendar height.
- `apps/web/src/components/calendar/calendar-board.tsx` - remove the separate fullscreen calendar hamburger and handle menu action events.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] Temporary server: `pnpm --filter @doit/web dev` on port 3000, listener PID 17428, stopped successfully.
- [x] Playwright mobile validation via `pnpm --dir apps/web exec node`.

Results:

- `pnpm --filter @doit/web type-check` passed.
- Mobile visual validation passed for `/calendar` topbar/menu, calendar filters opened from global menu, and `/today` menu solid background.
- Functional API validation passed: created a temporary local test user, folder, note, PATCHed `folderId: null`, and confirmed the note returned in `/api/items?folderId=null`.

Frontend evidence:

- `specs/artifacts/2026-05-26-corrigir-menu-mobile-e-pasta-nota/01-calendar-mobile-topbar.png`
- `specs/artifacts/2026-05-26-corrigir-menu-mobile-e-pasta-nota/02-calendar-global-menu-open.png`
- `specs/artifacts/2026-05-26-corrigir-menu-mobile-e-pasta-nota/03-calendar-filters-from-global-menu.png`
- `specs/artifacts/2026-05-26-corrigir-menu-mobile-e-pasta-nota/04-today-global-menu-solid.png`

## Risks

- Risk: The validation created temporary QA users/items in the local development database.
  Mitigation: They use `example.invalid` emails and are isolated to local dev data.

## Next step

Review the local diff and continue normal dev branch flow.
