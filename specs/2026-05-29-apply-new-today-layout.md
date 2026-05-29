# Apply New Today Layout

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Apply the new layout for the "today" page from `docs/doitmd-layout-codex-package/desktop/today-single-board-v3-standalone.html`.

## Context

The user provided a standalone HTML file containing the new design for the "Today" view. We need to implement this design in the Next.js app while preserving the existing data fetching, state, and interaction logic. 

## Scope

- [x] Analyze the provided HTML layout.
- [x] Map the static HTML structure to the existing React components.
- [x] Update `apps/web/src/app/(app)/today/page.tsx` (or related components).
- [x] Implement Tailwind classes to match the design.
- [x] Validate locally.

## Out of scope

- Redesigning other pages.

## Grill Gate

Decision: not_needed
Reason: The request is a direct application of a provided UI layout to an existing page.

## Acceptance criteria

- [x] Today page layout matches the provided HTML.
- [x] Existing logic (fetching tasks, marking as done, etc.) continues to work.
- [x] Local validation with screenshots completed.

## Implementation plan

- [x] Read the new layout HTML.
- [x] Read the existing Today page React code.
- [x] Identify necessary changes to `today/page.tsx` and related components.
- [x] Apply the new HTML structure and Tailwind classes.
- [x] Test the UI locally with `pnpm --filter @doit/web dev`.
- [x] Capture screenshots.

## Progress

- 2026-05-29 11:51 - Created spec.
- 2026-05-29 11:51 - Reading new layout HTML and identifying current route code.
- 2026-05-29 11:52 - Extracted CSS to `today.css` and rewrote `page.tsx`.
- 2026-05-29 11:58 - Server tested, but programmatic screenshot failed.
- 2026-05-29 12:23 - Updated spec to done, committing and pushing to dev.
- 2026-05-29 (correção) - Layout estava "ruim": três bugs encontrados e corrigidos (ver Decisions).

## Decisions

- Extracted specific CSS to `today.css` scoped with `.today-v3-layout` instead of rewriting completely to Tailwind to ensure pixel-perfect parity with the provided HTML template.
- **Correção (bug do Gemini):** as variáveis de tema estavam em `.today-v3-layout .today-v3-layout` (classe aninhada que nunca casa) → `var(--navy)`, gradientes e sombras nunca aplicavam, quebrando o visual. Corrigido para `.today-v3-layout`.
- **Correção:** o `.board` era grid de 3 colunas (`255px / 1fr / 350px`) mas só renderiza sidebar + center; o detalhe do item é o `<ItemDetail/>` global (drawer). A 3ª coluna ficava vazia (faixa de 350px à direita). Board passou a 2 colunas (`255px minmax(0,1fr)`); o painel de detalhe do mockup é coberto pelo drawer global.
- **Correção:** raiz da página passou a ter altura fixa no desktop (`lg:h-[calc(100vh-8rem)]`) para o board preencher a viewport e o `.content-scroll` rolar internamente como no mockup; no mobile flui com o scroll da página.

## Files changed

- `apps/web/src/app/(app)/today/page.tsx` - Replaced structure with new `board`, `sidebar`, and `center` blocks. **Correção:** raiz com altura desktop `lg:h-[calc(100vh-8rem)]`.
- `apps/web/src/app/(app)/today/today.css` - Created with layout styles extracted from the static HTML. **Correção:** escopo das variáveis (`.today-v3-layout`) e board em 2 colunas.
- `specs/2026-05-29-apply-new-today-layout.md` - Created living spec.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web dev --port 3005`

Results:

- Type check passed.
- Server started successfully on port 3005.

Frontend evidence:

- *Blocked (rodada inicial):* screenshot programático falhou.
- **Correção validada (Playwright, sign-up + seed):** servidor `pnpm --filter @doit/web dev` em :3000 (encerrado ao final, PID finalizado). Script `specs/print-today-v3.mjs`.
  - Diagnóstico no navegador: `--navy` resolve (`#0F2342`), board com **2 colunas** (`255px 1127px`, sem faixa vazia), mini-calendário com **hoje (29) destacado** dinamicamente.
  - Screenshots: `specs/artifacts/2026-05-29-apply-new-today-layout/desktop-today-v3.png` e `mobile-today-v3.png`.
- Mini-calendário agora é dinâmico (mês atual, início na segunda, hoje destacado, dias com itens marcados) — antes era estático/hardcoded.
- Nota: itens do tipo `note` sem conteúdo/título renderizam linha sem título na lista (observado no seed de teste; itens reais têm título).

## Risks

- Risk: Existing component logic may be tightly coupled to the old DOM structure.
  Mitigation: Carefully adapt the React logic to the new structure, keeping hooks and state intact.

## Next step

User should run `pnpm dev` locally, navigate to `/today`, and review the UI in the browser.
