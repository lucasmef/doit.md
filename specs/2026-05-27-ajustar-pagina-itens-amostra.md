# Ajustar pagina de Itens a amostra

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-27
- Updated: 2026-05-27

## Objective

Aproximar a pagina real de Itens (`/today`) do layout de amostra `desktop/02-itens.html`, preservando dados reais e adicionando interacoes uteis em vez de copiar HTML estatico.

## Context

O app ja tem shell horizontal glass, primitives bento e hooks reais de Items/Calendar. A pagina `/today` ainda estava mais simples que o mockup: cabecalho, metricas, eventos e lista glass. A amostra pede um bento completo com cards de progresso, destaque, captura rapida, board, semana, tags, atividade e ritmo.

## Scope

- [x] Comparar HTML de referencia com pagina atual.
- [x] Redesenhar `/today` como bento de Itens.
- [x] Adicionar captura rapida inline e comandos de status no board.
- [x] Validar type-check.
- [x] Validar visualmente no navegador e salvar screenshots.

## Out of scope

- Alterar schema, sync, audit ou contratos de Item.
- Editar frontmatter ou arquivos `.doitmd/items`.
- Trocar a arquitetura global do shell.

## Grill Gate

Decision: not_needed

Reason:
O pedido e visual/funcional em uma rota existente e a referencia foi fornecida. As escolhas tecnicas sao inferiveis pelos componentes e hooks atuais.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `/today` usa grid bento com as mesmas areas principais da amostra.
- [x] A captura rapida inline cria Item real.
- [x] O board permite abrir Item e mudar status sem bypass de regras protegidas.
- [x] Tags filtram os cards exibidos.
- [x] Validacao visual desktop/mobile tem screenshots em `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/`.

## Implementation plan

- [x] Substituir composicao atual de `/today` por cards bento.
- [x] Criar helpers locais para data, status, tags, progresso e fallback visual.
- [x] Conectar captura, foco, abrir detalhe e mudanca de status.
- [x] Rodar type-check e validacao visual.

## Progress

- 2026-05-27 00:00 - Iniciada revisao de contexto BuilderFlow, doit-workflow, spec anterior e HTML de referencia.
- 2026-05-27 00:00 - `/today` substituida por layout bento com progresso, destaque, captura rapida, board, semana, tags, atividade e ritmo.
- 2026-05-27 00:00 - Captura rapida inline conectada a `createItem`; board e cards conectados a `setSingleSelection` e `updateItem`.
- 2026-05-27 00:00 - Type-check passou.
- 2026-05-27 00:00 - Primeiro teste visual reutilizou servidor existente na porta 3000; servidor caiu antes da recaptura final.
- 2026-05-27 00:00 - Servidor temporario iniciado em `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000`; listeners efetivos PID 21260 e processo remanescente 8400; processos relacionados 8332, 23724 e 25224 encerrados com sucesso.
- 2026-05-27 00:00 - Validacao Playwright passou com usuario QA isolado, seed de Items, criacao por captura inline e screenshots desktop/mobile.

## Decisions

- Decision: Usar `/today` como pagina real de Itens.
  Reason: A navegacao desktop marca `/today`, `/inbox` e `/upcoming` sob o item "Itens", e o mockup `02-itens.html` representa a tela operacional de itens.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/today/page.tsx` - pagina de Itens redesenhada para o bento da amostra com interacoes reais.
- `specs/2026-05-27-ajustar-pagina-itens-amostra.md` - spec viva da tarefa.
- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/01-items-bento-desktop.png` - evidencia visual desktop.
- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/02-items-inline-capture-created.png` - evidencia da captura inline criando Item.
- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/03-items-bento-mobile.png` - evidencia visual mobile.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] Playwright via `pnpm --dir apps/web exec node` para signup QA, seed de Items, captura desktop, captura inline e captura mobile.

Results:

- `pnpm --filter @doit/web type-check` passou.
- Playwright passou sem `pageerror` ou erros de console.
- Servidor temporario encerrado; porta 3000 ficou sem listener, restando apenas conexoes `TimeWait`.

Frontend evidence:

- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/01-items-bento-desktop.png`
- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/02-items-inline-capture-created.png`
- `specs/artifacts/2026-05-27-ajustar-pagina-itens-amostra/03-items-bento-mobile.png`

## Risks

- Risk: tentar copiar a amostra literalmente pode criar dados falsos demais.
  Mitigation: usar os dados reais quando existirem e fallbacks apenas para manter a estrutura visual em estados vazios.

## Next step

Revisar o diff local e decidir se o mesmo padrao deve ser propagado para `/inbox` e `/upcoming`.
