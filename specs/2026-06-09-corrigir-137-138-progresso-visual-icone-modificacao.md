# Corrigir IDs 137 e 138 — Progresso visual e ícone de última alteração

## Metadata

- Status: done
- Mode: bugfix
- Complexity: low
- Created: 2026-06-09
- Updated: 2026-06-09

## Objective

ID 137: Substituir o texto solto de progresso (`40% concluído`) por um indicador visual compacto (barra + percentual) nas listas de notas (vista lista e Kanban).

ID 138: Adicionar ícone de relógio ao lado do tempo relativo de última alteração nas listas de notas, tornando claro que aquele valor representa a última modificação.

## Context

Arquivo único afetado: `apps/web/src/app/(app)/notas/page.tsx`.

Dois componentes internos concentram a renderização de itens em lista:
- `ContentRow` — vista lista (desktop: 4 colunas; mobile: 2 colunas visíveis, colunas de progresso e data ocultas).
- `ContentCard` — cards do Kanban e Kanban-focus.

Localizações exatas:
- ID 137 em `ContentRow`: linhas 469-477 (coluna de progresso, `hidden sm:block`).
- ID 137 em `ContentCard`: linhas 393-403 (span de progresso no footer do card).
- ID 138 em `ContentRow`: linha 479 (coluna de data, `hidden sm:block`).
- ID 138 em `ContentCard`: linha 404 (tempo de modificação de tarefas no footer do card).

A lógica de cálculo (`calculateChecklistProgress`) e a lógica de ordenação NÃO são alteradas.

## Scope

- [x] ID 137: `ContentRow` — substituir texto por barra de progresso + percentual
- [x] ID 137: `ContentCard` — substituir texto por barra de progresso + percentual
- [x] ID 137: 100% continua com visual verde/teal de concluída
- [x] ID 138: `ContentRow` — adicionar ícone de relógio antes do tempo relativo
- [x] ID 138: `ContentCard` — adicionar ícone de relógio antes do tempo relativo (tarefas)
- [x] Criar componentes `NoteProgressBar` e `ClockGlyph` inline no arquivo

## Out of scope

- Alterar lógica de `calculateChecklistProgress`
- Alterar ordenação ou filtros
- Alterar editor de notas, hoje, kanban-focus column headers
- Refatorar estrutura do arquivo

## Grill Gate

Decision: not_needed

Reason: Todos os critérios de aceite e o escopo são objetivos. Componentes afetados e linhas localizadas. Nenhuma ambiguidade de regra de negócio.

## Acceptance criteria

- [ ] Nota com progresso parcial mostra barra preenchida parcialmente + percentual
- [ ] Nota com 100% mostra barra totalmente preenchida com tom verde/teal
- [ ] Ícone de relógio aparece ao lado do tempo relativo (`18h`, `1d`, etc.)
- [ ] Ícone não aparece ao lado de datas de vencimento
- [ ] Visual consistente em desktop (lista e Kanban) e mobile (card)
- [ ] Sem regressão no Kanban, editor de notas, pastas, progresso calculado

## Implementation plan

- [x] Adicionar `NoteProgressBar` (barra horizontal compacta + texto %) logo após os SVG glyphs existentes
- [x] Adicionar `ClockGlyph` (SVG inline de relógio) logo após os SVG glyphs existentes
- [x] Atualizar `ContentRow` — coluna de progresso (ID 137)
- [x] Atualizar `ContentRow` — coluna de data (ID 138)
- [x] Atualizar `ContentCard` — footer de progresso (ID 137)
- [x] Atualizar `ContentCard` — footer de data (ID 138)
- [x] Typecheck
- [x] Build ou lint

## Progress

- 2026-06-09 — Contexto carregado, componentes e linhas localizados.
- 2026-06-09 — Spec criada. Implementação aplicada.

## Decisions

- Decision: Usar barra horizontal (`div` com fill inline-style `width: percent%`) em vez de SVG ring/circle.
  Reason: Barra horizontal é mais legível em linhas compactas de lista e cards pequenos; ring exigiria SVG com `stroke-dasharray` mais verboso e não alinha com o visual tabular da `ContentRow`.
  ADR needed: no

- Decision: Ícone de relógio usa `stroke` (outline) para ser discreto e não poluir a linha.
  Reason: Todos os outros ícones do arquivo usam stroke outline.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/notas/page.tsx` — adiciona `NoteProgressBar`, `ClockGlyph`; atualiza `ContentRow` e `ContentCard`

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` — passed (sem erros)
- [x] `pnpm --filter @doit/web lint` — passed (apenas warnings pré-existentes, nenhum novo)
- [x] Servidor local: `pnpm --filter @doit/web dev` na porta 3000 (PID 22340) — encerrado após testes

Results:

- typecheck: limpo
- lint: apenas warnings pré-existentes não relacionados às mudanças
- Servidor iniciado e encerrado corretamente

Frontend evidence:

- Servidor: `pnpm --filter @doit/web dev`, porta 3000, PID 22340, encerrado OK
- Telas testadas: `/notas?folder=<id>` (lista desktop, kanban desktop, lista mobile)
- Screenshots em `specs/artifacts/2026-06-09-corrigir-137-138-progresso-visual-icone-modificacao/`
  - `row-1.png` — nota 40% → barra azul parcial + "40%" + ícone relógio ✅
  - `row-2.png` — nota 100% → barra teal completa + "100%" + título riscado + ícone relógio ✅
  - `row-3.png` — nota sem checklist → status "A fazer" + ícone relógio (sem barra) ✅
  - `row-4.png` — tarefa → status "A fazer" + ícone relógio ✅
- G:\Meu Drive\.agentes — drive G: inacessível na sessão; evidência salva apenas no projeto

## Risks

- Risk: Barra de progresso adicionando largura inesperada na coluna compacta de 96px.
  Mitigation: Barra tem `w-10` (40px) fixo + texto `%` compacto. Total fica em ~60px, abaixo dos 96px da coluna.

## Next step

Revisar diff e merge via PR (dev → main).
