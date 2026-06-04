# Corrigir ID 091 - Atalho W abre nota maximizada no desktop

## Metadata

- Status: done
- Mode: bugfix
- Complexity: low
- Created: 2026-06-04
- Updated: 2026-06-04

## Objective

Garantir que, no desktop, o atalho `W` abra diretamente o editor novo de notas maximizado em `/notas/[id]`.
O fluxo nao deve exibir o modal compacto/intermediario de notas, nao deve abrir o editor antigo e nao deve alterar atalhos ou fluxos de tarefa/evento fora do necessario.

## Context

- BuilderFlow e o workflow principal desta tarefa; `doit-workflow` foi usado como complemento por tocar UI do app e fluxo de Item do tipo nota.
- A spec anterior `specs/2026-06-04-corrigir-091-099-atalhos-calendario-notas.md` cobria um lote amplo, mas esta tarefa atual restringe o escopo ao ID 091.
- O atalho global fica em `apps/web/src/store/ui-provider.tsx`, usando `useKeyboard`.
- `useKeyboard` bloqueia atalhos globais quando o foco esta em input, textarea, select, ProseMirror, form ou quando ha modal/bloqueador global.
- O editor novo de notas e a rota `/notas/[id]`, renderizada por `apps/web/src/app/(app)/notas/[id]/page.tsx`.
- O modal compacto/intermediario e o `QuickCapture`, renderizado por `apps/web/src/components/items/quick-capture.tsx`.

## Scope

- [x] Revisar a implementacao atual do atalho `W`.
- [x] Garantir que `W` no desktop navegue diretamente para `/notas/[id]`.
- [x] Confirmar que nenhum modal compacto/intermediario aparece no desktop.
- [x] Confirmar que o editor antigo nao aparece.
- [x] Criar/salvar uma nota pelo fluxo do atalho.
- [x] Confirmar que mobile nao teve regressao relevante.
- [x] Confirmar que atalhos adjacentes continuam funcionando.

## Out of scope

- Reabrir ou alterar IDs 092-099.
- Refatorar arquitetura de atalhos, QuickCapture ou editor.
- Alterar fluxos de tarefa/evento fora do necessario para o ID 091.
- Alterar schemas, sync Markdown, audit ou campos protegidos.
- Criar ADR, pois nao ha decisao arquitetural.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e os caminhos de codigo existentes indicam uma validacao local e uma correcao estreita, se necessaria. Nao ha regra de negocio ambigua nem mudanca arquitetural.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [ ] No desktop, pressionar `W` fora de campos abre `/notas/[id]`.
- [ ] A tela aberta contem o editor novo de notas maximizado.
- [ ] Nenhum `[aria-modal="true"]` de captura compacta/intermediaria fica aberto apos `W`.
- [ ] O editor antigo/modal de detalhes de nota nao e aberto.
- [ ] A nota criada pelo atalho pode receber conteudo e salvar.
- [ ] `W` dentro do editor ou de input nao dispara nova nota.
- [ ] Atalhos `Q`, `E`, `H` e `?` continuam respondendo nos contextos esperados.
- [ ] Em viewport mobile, o app continua sem abrir modal compacto por regressao do ajuste de desktop.

## Implementation plan

- [x] Ler contexto BuilderFlow, doit-workflow, ADRs e spec relacionada.
- [x] Mapear `useKeyboard`, handler de `w`, `QuickCapture` e editor novo de notas.
- [x] Se o codigo nao cumprir os criterios, aplicar a menor alteracao em `ui-provider.tsx`.
- [x] Rodar type-check web.
- [x] Rodar servidor local temporario e validacao Playwright focada no ID 091.
- [x] Salvar screenshots em `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/`.
- [x] Copiar screenshot principal para `G:\Meu Drive\.agentes`.
- [x] Encerrar o servidor iniciado pelo agente.
- [x] Atualizar esta spec com resultados e riscos.

## Progress

- 2026-06-04 - Lidas as skills BuilderFlow e doit-workflow, `docs/CONTEXT.md`, `docs/ADR.md` e a spec anterior 091-099.
- 2026-06-04 - Confirmado que a tarefa atual deve ficar restrita ao ID 091.
- 2026-06-04 - Mapeado `apps/web/src/store/ui-provider.tsx`: o handler de `w` chama `openNewNoteEditor()`, cria item `complexity: 'note'`, fecha estados de captura/modal e navega para `/notas/[id]`.
- 2026-06-04 - Mapeado `apps/web/src/hooks/use-keyboard.ts`: atalhos sao bloqueados em alvos de digitacao e modais.
- 2026-06-04 - Nenhuma alteracao em codigo de producao foi necessaria: o handler atual ja cumpre o comportamento solicitado para o ID 091.
- 2026-06-04 - Criado validador focado `specs/validate-091-atalho-w.mjs`.
- 2026-06-04 - `pnpm --filter @doit/web type-check` passou.
- 2026-06-04 - Porta 3300 verificada sem listener antes de iniciar servidor.
- 2026-06-04 - Tentativa inicial de `Start-Process` com `pnpm` falhou no Windows com `%1 nao e um aplicativo Win32 valido`; reiniciado com `pnpm.cmd`.
- 2026-06-04 - Servidor temporario iniciado em `http://127.0.0.1:3300` via `pnpm.cmd --filter @doit/web exec next dev -p 3300 -H 127.0.0.1`; listener PID 13480, com arvore observada: 2776, 6288, 20260, 17372, 21000, 6824, 13480.
- 2026-06-04 - Primeira execucao do validador encontrou check instavel de persistencia porque a API foi lida enquanto a UI ainda estava em `saving...`; o validador foi ajustado para esperar o conteudo aparecer na API.
- 2026-06-04 - `BASE_URL=http://127.0.0.1:3300 node specs\validate-091-atalho-w.mjs` passou em todos os checks.
- 2026-06-04 - Screenshots salvos em `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/` e copiados para `G:\Meu Drive\.agentes`.
- 2026-06-04 - Servidor temporario encerrado; porta 3300 ficou sem listener apos shutdown.

## Decisions

- Decision: manter uma spec separada para o ID 091.
  Reason: a solicitacao atual proibe reabrir itens confirmados como OK e pede corrigir apenas o ID 091.
  ADR needed: no
- Decision: tratar `/notas/[id]` como superficie nova/maximizada de notas.
  Reason: e a rota imersiva atual do editor novo e evita `QuickCapture`.
  ADR needed: no
- Decision: nao alterar codigo de producao nesta rodada.
  Reason: a revisao confirmou que `apps/web/src/store/ui-provider.tsx` ja cria nota e navega direto para `/notas/[id]`; mudar o fluxo sem falha reproduzida aumentaria risco fora do ID 091.
  ADR needed: no
- Decision: ajustar apenas o validador quando o check de salvamento ficou instavel.
  Reason: a UI digitou o conteudo e o backend recebeu PATCHs, mas o teste lia antes da persistencia terminar; esperar a API refletir o conteudo valida o criterio real de salvar.
  ADR needed: no

## Files changed

- `specs/2026-06-04-corrigir-091-atalho-w-notas-desktop.md` - spec BuilderFlow viva desta tarefa.
- `specs/validate-091-atalho-w.mjs` - validacao Playwright focada no ID 091.
- `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/` - screenshots e resultados da validacao.

Production code changed:

- None.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `BASE_URL=http://127.0.0.1:3300 node specs\validate-091-atalho-w.mjs`

Results:

- Type-check: passed.
- Playwright ID 091: passed.
- Confirmed desktop `W` opens `/notas/[id]`.
- Confirmed new note editor is visible.
- Confirmed no compact/intermediate modal after `W` (`modalCount=0`).
- Confirmed old note detail modal/editor is not opened (`oldNoteDetailCount=0`).
- Confirmed note created through `W` saved content through the API.
- Confirmed `W` inside the editor and inside search input does not create another note.
- Confirmed shortcuts `Q`, `E`, `H` and `?` still respond.
- Confirmed mobile viewport opens the new note editor without compact modal regression.
- Temporary server: started on `127.0.0.1:3300`; listener PID 13480; process tree observed as 2776, 6288, 20260, 17372, 21000, 6824, 13480; all stopped and port 3300 was free afterward.
- Global screenshot copy: confirmed `G:\Meu Drive\.agentes\01-doitmd-atalho-w-nota-maximizada-2026-06-04.png`.

Frontend evidence:

- `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/01-doitmd-atalho-w-nota-maximizada-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/02-doitmd-atalhos-adjacentes-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/03-doitmd-mobile-sem-modal-compacto-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop/resultados.json`

## Risks

- Risk: validacao visual local pode expor dados reais.
  Mitigation: usar usuario QA local e dados gerados no teste.
- Risk: build/dev server em Windows + OneDrive pode ter limitacoes de symlink ou lock.
  Mitigation: registrar o erro exato se ocorrer e encerrar processos iniciados.
- Risk: nao houve alteracao em codigo de producao nesta rodada.
  Mitigation: o fluxo ja estava implementado como solicitado e foi validado ponta a ponta; a entrega deixa uma spec e um teste focados para regressao do ID 091.

## Next step

Revisao manual opcional do mesmo fluxo em uma sessao real do usuario: desktop, pressionar `W`, editar/salvar nota e confirmar visualmente que nenhum modal compacto aparece.
