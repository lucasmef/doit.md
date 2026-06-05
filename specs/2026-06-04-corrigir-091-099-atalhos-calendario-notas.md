# Corrigir IDs 091-099 - Atalhos, Calendario, Inbox e Notas

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-06-04
- Updated: 2026-06-04

## Objective

Corrigir somente os IDs 091 a 099, sem reabrir itens previamente confirmados como OK e sem refatoracao ampla. O lote ajusta atalhos globais, filtros visiveis do calendario, topo e clique mobile do mes, menu mobile, atraso visual de conclusao no Inbox e fluxos de abertura/edicao do editor novo de notas.

## Context

- BuilderFlow foi usado como workflow principal; `doit-workflow` foi usado como complemento por tocar Items, calendario, Inbox, notas e UI do app.
- Specs recentes indicam que IDs 085-090 foram concluidos e nao devem ser reabertos.
- Atalhos globais ficam em `apps/web/src/store/ui-provider.tsx` e respeitam `useKeyboard`, que bloqueia inputs, textareas, ProseMirror, forms e modais.
- A tela atual de calendario e `apps/web/src/app/(app)/calendar/page.tsx`; a selecao de calendarios existente em `calendar-board.tsx` nao e usada por essa tela.
- O editor novo de notas e a rota `/notas/[id]`; fluxos que ainda chamam `setQuickCaptureEditId` para notas abrem o modal antigo/intermediario.
- O `ItemList` ja tem atraso de remocao para itens concluidos, mas o Inbox filtrava `done` antes da lista receber a transicao.
- A rail direita do editor novo contem pasta/data/anexos, mas ficava oculta no mobile.

## Scope

- [x] ID 091 - Atalho `W` abre editor novo de notas em tela cheia.
- [x] ID 092 - Calendario permite escolher calendarios visiveis com persistencia.
- [x] ID 093 - Remover texto `Semana X` do topo do calendario.
- [x] ID 094 - Clique em evento no mes mobile abre lista do dia.
- [x] ID 095 - Menu sanduiche mobile fica opaco/legivel.
- [x] ID 096 - Inbox preserva feedback de conclusao por alguns segundos.
- [x] ID 097 - Nota aberta pela pagina Hoje usa editor/modal novo.
- [x] ID 098 - Editor novo de notas mobile expoe acoes de anexos, pasta e data.
- [x] ID 099 - Expandir nota compacta mobile abre editor novo em tela cheia.

## Out of scope

- Reabrir IDs ja confirmados como OK.
- Alterar schemas, sync Markdown, audit ou campos protegidos.
- Refatorar ampla arquitetura do calendario ou editor.
- Mudar deploy, auth ou comportamento de eventos Google fora dos filtros visuais.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e os caminhos de codigo existentes indicam solucoes locais. Nao ha mudanca arquitetural nem regra de negocio ambigua que exija pergunta antes de implementar.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] `W` fora de campos cria/abre nota diretamente em `/notas/[id]` e nao dispara dentro de inputs/editor/modais.
- [x] Calendario exibe menu sanduiche para marcar/desmarcar calendarios e persiste a selecao.
- [x] Topo do calendario nao exibe `Semana X`, mantendo mes/data e navegacao.
- [x] Evento/tarefa no mes mobile abre a lista do dia, sem abrir direto o evento pequeno; desktop preservado.
- [x] Menu sanduiche mobile tem fundo suficientemente opaco e legivel sobre calendario/conteudo.
- [x] Inbox mantem evento/tarefa concluido visivel temporariamente antes de sumir.
- [x] Hoje abre notas via editor novo em `/notas/[id]`.
- [x] Editor novo mobile permite anexar, editar pasta e editar/remover data.
- [x] Expandir nota compacta mobile cria a nota e navega direto ao editor novo em tela cheia.
- [x] Checks disponiveis e validacao visual desktop/mobile documentados.

## Implementation plan

- [x] ID 091: trocar handler do atalho `W` para criar nota vazia e navegar para `/notas/[id]`, usando bloqueios existentes do `useKeyboard`.
- [x] ID 092: adicionar `visibleCalendarIds` em preferencias, buscar calendarios na tela atual, filtrar eventos e renderizar menu sanduiche persistido.
- [x] ID 093: remover `weekNumber`/`SEMANA` do header mensal sem afetar header de semana/dia.
- [x] ID 094: no mes mobile, direcionar clique em eventos/itens para `onDayClick(key)`; manter desktop abrindo evento/item.
- [x] ID 095: aumentar opacidade do overlay/painel do menu mobile mantendo padrao visual.
- [x] ID 096: ajustar Inbox para deixar `ItemList` receber itens `done` soltos e aplicar atraso visual.
- [x] ID 097: na pagina Hoje, abrir notas com `router.push('/notas/[id]')`; tarefas continuam no modal/painel atual.
- [x] ID 098: adicionar controles mobile de pasta/data na pagina nova de nota e garantir anexos visiveis/acionaveis no mobile.
- [x] ID 099: trocar expansao de nota compacta por criacao+navegacao direta ao editor novo.
- [x] Rodar checks e validacao visual local com screenshots em `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/`.

## Progress

- 2026-06-04 - Lidas instrucoes BuilderFlow, doit-workflow, AGENTS.md, CONTEXT.md, ADR.md e spec dos IDs 085-090.
- 2026-06-04 - Mapeados atalhos, calendario atual, menu mobile, Inbox, pagina Hoje, QuickCapture e editor novo de notas.
- 2026-06-04 - Criada esta spec antes da implementacao.
- 2026-06-04 - Implementados ajustes locais para IDs 091-099.
- 2026-06-04 - `pnpm --filter @doit/web type-check` falhou inicialmente porque `node_modules` estava incompleto; executado `pnpm install` e o type-check passou.
- 2026-06-04 - `pnpm --filter @doit/web lint` passou com avisos preexistentes.
- 2026-06-04 - `pnpm --filter @doit/web build` compilou, validou tipos/lint e gerou paginas, mas falhou no passo final de symlink standalone com `EPERM` no OneDrive/Windows.
- 2026-06-04 - Servidor temporario iniciado em `http://127.0.0.1:3300` via `pnpm --filter @doit/web exec next dev -p 3300 -H 127.0.0.1`; listener PID 12320 e processos Node relacionados 16492, 6976, 11048, 12320.
- 2026-06-04 - Validacao Playwright `BASE_URL=http://127.0.0.1:3300 node specs\validate-091-099.mjs` passou para todos os IDs 091-099 e gerou screenshots.
- 2026-06-04 - Servidor temporario encerrado; porta 3300 sem listener apos shutdown.

## Decisions

- Decision: usar a rota `/notas/[id]` como unica superficie nova de notas.
  Reason: evita modal antigo/intermediario e preserva o editor atual ja implementado.
  ADR needed: no
- Decision: persistir calendarios visiveis em `usePreferences`.
  Reason: ja e o mecanismo local de preferencias de UI do app e atende persistencia sem API/schema.
  ADR needed: no
- Decision: reaproveitar `ItemList` para atraso visual no Inbox.
  Reason: o componente ja implementa o comportamento correto; o bug e o filtro prematuro da pagina.
  ADR needed: no
- Decision: tratar `visibleCalendarIds: null` como selecao inicial "todos" e `[]` como selecao vazia explicita.
  Reason: permite persistir tanto o padrao inicial quanto o caso em que o usuario oculta todos os calendarios.
  ADR needed: no
- Decision: validar calendarios visiveis com mock Playwright de `/api/calendar/calendars` e `/api/calendar/events`.
  Reason: evita depender de conta Google real no ambiente local e valida o comportamento da UI atual.
  ADR needed: no

## Files changed

- `apps/web/src/store/ui-provider.tsx` - atalho `W` cria nota e navega ao editor novo.
- `apps/web/src/components/items/quick-capture.tsx` - expandir nota compacta/nota em edicao navega ao editor novo.
- `apps/web/src/app/(app)/calendar/page.tsx` - menu de calendarios visiveis, filtro persistido, topo sem `Semana X`, clique mobile em mes abre lista do dia.
- `apps/web/src/hooks/use-preferences.ts` - preferencia `visibleCalendarIds`.
- `apps/web/src/components/layout/topbar.tsx` - menu mobile com painel opaco.
- `apps/web/src/app/(app)/inbox/page.tsx` - deixa `ItemList` aplicar atraso visual para concluidos.
- `apps/web/src/app/(app)/today/page.tsx` - notas abrem via `/notas/[id]`.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - acoes mobile de anexos, pasta e data no editor novo.
- `specs/validate-091-099.mjs` - validacao Playwright dos IDs 091-099.
- `specs/2026-06-04-corrigir-091-099-atalhos-calendario-notas.md` - spec BuilderFlow viva.

## Validation

Commands run:

- [x] `pnpm install`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `BASE_URL=http://127.0.0.1:3300 node specs\validate-091-099.mjs`

Results:

- `pnpm install`: restored missing local dependencies.
- Type-check: passed after install.
- Lint: passed with preexisting warnings for `<img>`, hook dependencies, font loading and Next lint deprecation.
- Build: compiled successfully, lint/type validation passed, static pages generated; failed only at final standalone traced-file symlink copy with `EPERM` under OneDrive/Windows.
- Playwright: passed all scripted checks for IDs 091-099.
- Temporary server: started on 127.0.0.1:3300; listener PID 12320; related Node PIDs 16492, 6976, 11048, 12320; all stopped and port 3300 was free afterward.
- Global screenshot copy: screenshots copied to `G:\Meu Drive\.agentes`.

Frontend evidence:

- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/01-doitmd-shortcut-w-editor-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/02-doitmd-today-note-new-editor-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/03-doitmd-note-mobile-actions-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/04-doitmd-quick-note-expand-editor-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/05-doitmd-calendar-visible-menu-desktop-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/06-doitmd-calendar-mobile-day-list-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/07-doitmd-mobile-menu-opaque-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/08-doitmd-inbox-completion-delay-desktop-2026-06-04.png`
- `specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas/resultados.json`

## Risks

- Risk: validacao visual pode expor dados reais locais.
  Mitigation: usar usuario QA local e dados seedados; screenshots globais tambem foram copiados conforme regra.
- Risk: build em Windows/OneDrive pode falhar no passo de symlink standalone.
  Mitigation: erro exato registrado; compilacao, lint/type validation e geracao de paginas passaram.
- Risk: filtros de calendario local so foram validados com calendario Google mockado.
  Mitigation: UI, persistencia e filtragem foram exercitadas sem depender de conta Google real; revisar manualmente com calendarios reais.

## Next step

Revisao manual dos fluxos em dados reais e, se aprovado, publicar via fluxo `dev` -> PR para `main`.
