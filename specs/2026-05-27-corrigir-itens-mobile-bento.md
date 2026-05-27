# Corrigir Itens Mobile Bento

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-27
- Updated: 2026-05-27

## Objective

Corrigir a tela mobile de itens em `/today`, que esta inutilizavel no celular, para seguir o layout de referencia `Bento Tasks Mobile.html` com cards compactos, tabs, progresso e captura rapida.

## Context

BuilderFlow e doit-workflow estao ativos. A rota `/today` ja tem um bento desktop implementado, mas no mobile reaproveita a mesma grade/board, gerando uma experiencia pouco utilizavel. O HTML de referencia define uma experiencia mobile especifica: header `tasks`, card de progresso, tabs `today/upcoming/done`, secoes com cards de tarefas, e quick capture escuro.

## Scope

- [x] Revisar contexto do repo, ADRs, spec anterior e HTML de referencia.
- [x] Implementar layout mobile dedicado em `/today`.
- [x] Preservar comportamento real de itens: abrir item, concluir/reabrir e captura rapida.
- [x] Validar type-check.
- [x] Validar no navegador mobile e salvar screenshots.

## Out of scope

- Alterar schema, sync, audit ou arquivos `.doitmd/items`.
- Reescrever a experiencia desktop existente.
- Trocar a navegacao global mobile fora do necessario para a tela.

## Grill Gate

Decision: not_needed

Reason:
O problema, rota e referencia visual foram fornecidos. A solucao tecnica e inferivel pelo codigo atual: manter desktop, adicionar render mobile dedicado e reutilizar hooks/acoes existentes.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Em viewport mobile, `/today` exibe header `tasks`, progresso, tabs, secoes e captura rapida como a referencia.
- [x] Cards de tarefa mobile sao tocaveis, legiveis e nao ficam presos em colunas/overflow inutilizavel.
- [x] Concluir/reabrir item e abrir detalhe continuam funcionando.
- [x] Captura rapida cria item real para hoje.
- [x] Screenshot mobile salvo em `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/`.

## Implementation plan

- [x] Adicionar componentes/helpers locais para cards mobile.
- [x] Renderizar experiencia mobile `lg:hidden` e manter bento desktop `hidden lg:block`.
- [x] Ajustar type errors e validar.
- [x] Rodar servidor temporario, testar `/today` mobile no navegador, capturar screenshot e encerrar servidor.

## Progress

- 2026-05-27 09:00 - Iniciada revisao de contexto BuilderFlow, AGENTS, ADR, spec anterior e HTML mobile de referencia.
- 2026-05-27 09:00 - Identificado que `/today` usa o board desktop tambem no mobile.
- 2026-05-27 09:10 - Implementado render mobile dedicado em `/today` com header, card de progresso, tabs, secoes, task cards e quick capture.
- 2026-05-27 09:15 - Type-check passou.
- 2026-05-27 09:20 - Validacao visual mostrou que a topbar global mobile ainda quebrava a fidelidade da referencia.
- 2026-05-27 09:22 - Topbar global ocultada somente em `/today` mobile; desktop preservado.
- 2026-05-27 09:23 - Playwright mobile passou com signup QA, seed de itens, tabs, quick capture e screenshots.
- 2026-05-27 09:24 - Servidor temporario encerrado; porta 3000 sem listener.

## Decisions

- Decision: Criar render mobile dedicado em `/today`.
  Reason: A referencia mobile e estruturalmente diferente do board desktop; adaptar a mesma grade manteria o problema de usabilidade.
  ADR needed: no
- Decision: Ocultar a topbar global somente em `/today` mobile.
  Reason: O layout de referencia comeca direto no header `tasks`; a topbar `Hoje` ocupava a primeira dobra e impedia fidelidade visual.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/today/page.tsx` - render mobile dedicado da tela de itens.
- `apps/web/src/components/layout/app-chrome.tsx` - oculta a topbar global apenas em `/today` mobile.
- `specs/2026-05-27-corrigir-itens-mobile-bento.md` - spec viva da tarefa.
- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/01-tasks-mobile-bento.png` - evidencia visual mobile principal.
- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/02-tasks-mobile-upcoming-tab.png` - evidencia da tab upcoming.
- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/03-tasks-mobile-capture-created.png` - evidencia da captura rapida criando item.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] Playwright via `pnpm --dir apps/web exec node` com iPhone 13, signup QA, seed de itens, tabs, captura rapida e screenshots.

Results:

- `pnpm --filter @doit/web type-check` passou.
- Playwright mobile passou sem `pageerror` ou erros de console.
- Servidor temporario: `pnpm --dir apps/web exec next dev -H 127.0.0.1 -p 3000`, processo inicial 15152, listener efetivo 22560, encerrado com sucesso; porta 3000 sem listener.

Frontend evidence:

- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/01-tasks-mobile-bento.png`
- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/02-tasks-mobile-upcoming-tab.png`
- `specs/artifacts/2026-05-27-corrigir-itens-mobile-bento/03-tasks-mobile-capture-created.png`

## Risks

- Risk: divergir dados reais do mockup ao copiar a referencia literalmente.
  Mitigation: preservar dados reais e usar apenas a estrutura/estilo visual da referencia.

## Next step

Revisar o diff local.
