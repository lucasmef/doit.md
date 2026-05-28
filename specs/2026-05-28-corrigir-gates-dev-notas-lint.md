# Corrigir Gates DEV por lint no editor de notas

## Metadata

- Status: done
- Mode: bugfix
- Complexity: low
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Restaurar o workflow `Gates DEV` no branch `dev`, que falhou no lint incremental apos o commit `d371536`.
O erro bloqueava a Quality Gate antes do build porque havia codigo morto no editor de notas.

## Context

O workflow `Gates DEV` run `26549831199` falhou em 2026-05-28 no job `Quality Gate`.
O type-check remoto passou, mas `bash scripts/lint-incremental.sh` falhou em `apps/web/src/app/(app)/notas/[id]/page.tsx` por `PropsGrid` definido e nao usado.
O branch atual e `dev`, o repositorio e `lucasmef/doit.md`, e a arvore local estava limpa no inicio da investigacao.

## Scope

- [x] Inspecionar GitHub Actions e logs do run falho.
- [x] Reproduzir/localizar o erro de lint no arquivo apontado.
- [x] Remover o codigo morto que causa o erro.
- [x] Validar lint incremental, type-check e novo run do GitHub Actions.

## Out of scope

- Alterar workflow de deploy, branch policy ou infraestrutura.
- Mudar comportamento visual ou funcional do editor de notas.
- Editar itens Markdown sincronizados ou dados pessoais.

## Grill Gate

Decision: not_needed

Reason:
O log do GitHub Actions aponta um erro objetivo de lint em um arquivo especifico. A menor correcao e remover codigo morto sem uso, sem decisao de produto ou arquitetura.

Questions, if any:

Answers:

## Acceptance criteria

- [x] O arquivo `apps/web/src/app/(app)/notas/[id]/page.tsx` nao possui helpers mortos relacionados a `PropsGrid`.
- [x] O lint incremental equivalente ao CI passa localmente.
- [x] O type-check web passa localmente.
- [x] O workflow `Gates DEV` passa em novo run no GitHub.

## Implementation plan

- [x] Coletar evidencia do workflow falho.
- [x] Remover `PropsGrid` e helpers usados somente por ele.
- [x] Rodar validacoes locais.
- [x] Commitar e enviar a correcao para `dev`.
- [x] Monitorar novo run `Gates DEV` ate sucesso.

## Progress

- 2026-05-28 00:00 - Lidos `fix-dev-deploy`, BuilderFlow, doit-workflow, `AGENTS.md`, `docs/CONTEXT.md` e `docs/ADR.md`.
- 2026-05-28 00:00 - Identificado run falho `26549831199`, workflow `Gates DEV`, commit `d371536`.
- 2026-05-28 00:00 - Log remoto mostra falha em `next lint`: `PropsGrid` definido mas nao usado em `apps/web/src/app/(app)/notas/[id]/page.tsx`.
- 2026-05-28 00:00 - Removidos `PropsGrid`, `StatusPill` e `PropIcon`, todos sem uso no layout atual.
- 2026-05-28 00:00 - Lint direto do arquivo falho, lint incremental via Git Bash e type-check web passaram localmente.
- 2026-05-28 00:00 - Commit `13ab2fb` enviado para `dev`.
- 2026-05-28 00:02 - `Gates DEV` run `26550007691` concluiu com sucesso: Quality Gate, Security Gate, Secret Scan e DEV gates complete.

## Decisions

- Decision: remover codigo morto em vez de reconectar `PropsGrid`.
  Reason: o layout atual ja usa `NotePropertiesPanel` no painel direito; reintroduzir `PropsGrid` mudaria UI para corrigir um erro de lint.
  ADR needed: no

## Files changed

- `specs/2026-05-28-corrigir-gates-dev-notas-lint.md` - living spec da correcao.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - remove codigo morto que quebrava `@typescript-eslint/no-unused-vars`.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec next lint --file "src/app/(app)/notas/[id]/page.tsx" --file src/components/items/markdown-editor.tsx --file src/components/layout/app-chrome.tsx`
- [x] `pnpm --filter @doit/web exec tsc --noEmit`
- [x] `C:\Program Files\Git\bin\bash.exe scripts/lint-incremental.sh`
- [x] `gh run watch 26550007691 --exit-status`

Results:

- Lint direto passou com warnings pre-existentes em `/notas/[id]`.
- Type-check web passou.
- Lint incremental via Git Bash passou com warnings pre-existentes em `/notas/[id]` e `quick-capture.tsx`.
- GitHub Actions `Gates DEV` run `26550007691` passou. A Quality Gate executou type-check, lint incremental e build CI com sucesso; Security Gate e Secret Scan tambem passaram.

Frontend evidence:

- Nao aplicavel; a correcao remove codigo morto e nao altera comportamento visual esperado.

## Risks

- Risk: a remocao de helpers pode expor outro helper sem uso.
  Mitigation: validar com o mesmo lint incremental do CI antes de enviar.

## Next step

Nenhuma acao obrigatoria. O branch `dev` esta com gates verdes apos a correcao.
