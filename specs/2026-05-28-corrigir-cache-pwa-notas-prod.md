# Corrigir cache PWA das notas em producao

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Garantir que as telas de notas atualizem apos deploy de producao.
O deploy de `main` concluiu com sucesso, mas o navegador pode continuar servindo HTML antigo pelo service worker.

## Context

O `dev` foi mergeado em `main` no commit `3aed276`, e o workflow `Deploy PROD` run `26550743832` passou.
O log do deploy mostra checkout de `main`, build de `/notas` e `/notas/[id]`, restart de `doit.service`, healthcheck OK na porta `8110` e tag `prod-2026.05.28-r104`.
O service worker atual usa `cachedFirst` para `request.mode === 'navigate'`, o que pode entregar paginas antigas de `clarity-v8-pages` antes de buscar a versao nova em segundo plano.

## Scope

- [x] Confirmar que `main` e producao receberam o merge.
- [x] Identificar o cache PWA como causa provavel da UI antiga.
- [x] Alterar o service worker para navegação network-first com fallback offline.
- [x] Invalidar caches antigos com nova versao.
- [x] Validar localmente e em GitHub Actions.
- [x] Promover para producao e confirmar deploy.

## Out of scope

- Alterar dados de notas ou sync Markdown.
- Mudar layout visual das notas.
- Alterar infraestrutura de deploy.

## Grill Gate

Decision: not_needed

Reason:
O deploy ja chegou ao `main` e a evidencia aponta para estrategia de cache local do PWA. A correcao e pequena, reversivel e preserva fallback offline.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Navegacoes de paginas usam rede primeiro quando online.
- [x] Cache offline de paginas continua funcionando como fallback.
- [x] Caches `clarity-v8-*` sao descartados por uma nova versao.
- [x] `Gates DEV` passa.
- [x] `Deploy PROD` passa em `main`.

## Implementation plan

- [x] Revisar deploy e SW atual.
- [x] Atualizar `apps/web/public/sw.js`.
- [x] Rodar validacoes locais relevantes.
- [x] Enviar para `dev`, acompanhar gates, promover para `main`.
- [x] Registrar resultado.

## Progress

- 2026-05-28 00:00 - Verificado que `origin/main` esta no merge `3aed276` e tag `prod-2026.05.28-r104`.
- 2026-05-28 00:00 - `Deploy PROD` run `26550743832` passou e reiniciou `doit.service` na porta `8110`.
- 2026-05-28 00:00 - SSH direto bloqueado por verificacao Tailscale interativa, mas os logs do GitHub Actions trazem evidencia suficiente do deploy.
- 2026-05-28 00:00 - Identificado `cachedFirst` para navegacoes no service worker `clarity-v8`.
- 2026-05-28 00:00 - Atualizado service worker para `clarity-v9` e navegacoes network-first com fallback offline.
- 2026-05-28 00:00 - Type-check web passou localmente.
- 2026-05-28 00:00 - Commit `76d32db` enviado para `dev`.
- 2026-05-28 00:00 - `Gates DEV` run `26551276714` passou com Quality Gate, Security Gate, Secret Scan e DEV gates complete.
- 2026-05-28 00:00 - PR #19 criado, checks de PR passaram e mergeado em `main`.
- 2026-05-28 00:00 - `Deploy PROD` run `26551425927` passou em `main@aedfd6e` e criou a tag `prod-2026.05.28-r105`.
- 2026-05-28 00:00 - Quality e Security paralelos em `main` tambem passaram.

## Decisions

- Decision: trocar apenas navegacoes para network-first.
  Reason: evita HTML antigo apos deploy sem remover a capacidade offline.
  ADR needed: no

## Files changed

- `specs/2026-05-28-corrigir-cache-pwa-notas-prod.md` - living spec da correcao.
- `apps/web/public/sw.js` - invalida cache antigo e troca navegacoes para network-first.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit`
- [x] `gh run watch 26551276714 --exit-status`
- [x] `gh pr checks 19 --watch`
- [x] `gh run watch 26551425927 --exit-status`
- [x] `gh run watch 26551425930 --exit-status`

Results:

- Type-check web passou.
- `Gates DEV` run `26551276714` passou.
- Checks do PR #19 passaram.
- `Deploy PROD` run `26551425927` passou e publicou `prod-2026.05.28-r105`.
- Quality run `26551425930` e Security run `26551425912` em `main` passaram.

Frontend evidence:

- Nao aplicavel como validacao visual local; a mudanca e de estrategia de cache em producao/PWA.

## Risks

- Risk: usuarios com uma aba ja aberta podem precisar recarregar para o navegador buscar o novo service worker.
  Mitigation: alterar a estrategia daqui em diante para network-first e invalidar caches antigos.

## Next step

Nenhuma acao obrigatoria. Em navegadores que ja tinham a PWA aberta com o service worker antigo, pode ser necessario recarregar a aba para o navegador buscar `sw.js` novo; a partir dai navegacoes usam network-first.
