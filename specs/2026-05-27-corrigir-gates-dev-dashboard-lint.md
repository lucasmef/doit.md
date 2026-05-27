# Corrigir Gates DEV por lint no dashboard

## Metadata

- Status: in_progress
- Mode: bugfix
- Complexity: low
- Created: 2026-05-27
- Updated: 2026-05-27

## Objective

Restaurar o workflow `Gates DEV` no branch `dev`, que falhou no lint incremental apos o commit `559ccfa`.
O erro bloqueava a Quality Gate antes do build por variaveis e funcoes sem uso no dashboard.

## Context

O workflow `Gates DEV` run `26508009950` falhou em 2026-05-27 no job `Quality Gate`.
O type-check remoto passou, mas o passo `bash scripts/lint-incremental.sh` falhou ao executar `next lint` nos arquivos `dashboard/page.tsx` e `today/page.tsx`.
O repositório usa `dev` como branch de integração e `main` como branch de produção, conforme ADR-002.

## Scope

- [x] Identificar o run falho e o job exato.
- [x] Corrigir os erros de lint no dashboard.
- [ ] Enviar a correção para `dev`.
- [ ] Confirmar novo run verde.

## Out of scope

- Corrigir mudanças locais não relacionadas em `apps/web/src/app/(app)/notas/page.tsx`.
- Alterar workflow de deploy, branch policy ou infraestrutura.
- Fazer validação visual, pois a correção remove apenas codigo morto e nao altera comportamento visivel.

## Grill Gate

Decision: not_needed

Reason:
O erro, o arquivo e as linhas vieram diretamente do log do GitHub Actions. A menor correção e remover codigo morto sem uso.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `itemDateLabel` nao existe mais como funcao sem uso.
- [x] `overdue` nao e mais calculado sem uso no dashboard.
- [x] O lint focado nos arquivos do run falho passa localmente.
- [ ] O workflow `Gates DEV` passa em novo run no GitHub.

## Implementation plan

- [x] Inspecionar GitHub Actions e logs do run falho.
- [x] Remover declaracoes sem uso em `dashboard/page.tsx`.
- [x] Rodar validacao focada equivalente ao lint incremental.
- [ ] Commitar e enviar apenas arquivos relacionados.
- [ ] Monitorar o novo workflow.

## Progress

- 2026-05-27 08:21 - Verificado branch `dev`, repo `lucasmef/doit.md` e autenticacao `gh`.
- 2026-05-27 08:23 - Identificado run falho `26508009950`, workflow `Gates DEV`, commit `559ccfa`.
- 2026-05-27 08:24 - Log mostrou erros `@typescript-eslint/no-unused-vars` em `dashboard/page.tsx`.
- 2026-05-27 08:26 - Removidos `itemDateLabel` e `overdue`.
- 2026-05-27 08:29 - Lint focado passou via spawn Node para evitar parsing de parenteses no shell do Windows.

## Decisions

- Decision: remover codigo morto em vez de reutilizar artificialmente.
  Reason: os simbolos nao tinham chamada restante e o fix mais estreito elimina exatamente a causa do lint.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/dashboard/page.tsx` - remove codigo sem uso que quebrava o lint incremental.
- `specs/2026-05-27-corrigir-gates-dev-dashboard-lint.md` - registra investigacao, escopo e validacao BuilderFlow.

## Validation

Commands run:

- [x] `gh run view 26508009950 --log-failed`
- [x] `gh run view 26508009950 --json status,conclusion,name,event,headBranch,headSha,jobs`
- [x] `node -e "... corepack.js pnpm --filter @doit/web exec next lint --file src/app/(app)/dashboard/page.tsx --file src/app/(app)/today/page.tsx ..."`
- [x] `corepack pnpm --filter @doit/web exec tsc --noEmit`
- [x] `corepack pnpm --filter @doit/web lint`

Results:

- GitHub log confirmou falha por `itemDateLabel` e `overdue` sem uso.
- Lint focado passou: `No ESLint warnings or errors`.
- Type-check local falhou por mudancas locais nao relacionadas em `apps/web/src/app/(app)/notas/page.tsx` (`accent` possivelmente `undefined`).
- Lint completo local falhou por mudancas locais nao relacionadas em `apps/web/src/app/(app)/notas/page.tsx` com varios simbolos sem uso.

Frontend evidence:

- Skipped. A mudanca remove codigo morto e nao altera tela, layout, navegacao, estado visual ou fluxo.

## Risks

- Risk: validacoes globais locais continuam falhando enquanto a pagina `notas` estiver em estado intermediario.
  Mitigation: nao misturar essa correcao com o trabalho local de `notas`; validar o novo run remoto baseado apenas no commit enviado.

## Next step

Commitar e enviar a correcao para `dev`, depois monitorar o novo workflow `Gates DEV`.
