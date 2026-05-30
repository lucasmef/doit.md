# Corrigir IDs 073 e 074 - Pastas e Data

## Metadata

- Status: review
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Corrigir dois ajustes restantes sem reabrir itens ja confirmados: tarefas concluidas em pastas devem exibir estado concluido por alguns segundos antes de sumir quando a pasta oculta concluidos, e o atalho `proxima semana` deve apontar para a proxima segunda-feira nos menus e inputs de data.

## Context

- BuilderFlow e doit-workflow foram usados. O contexto lido inclui `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md`, specs recentes e os caminhos de codigo envolvidos.
- A pagina Hoje (`apps/web/src/app/(app)/today/page.tsx`) usa `temporarilyDone` e so envia `status: done` depois de 1500 ms, preservando o feedback visual.
- A pagina Pastas/Notas (`apps/web/src/app/(app)/notas/page.tsx`) filtra itens `done` quando `hideCompleted` esta ativo. Ao concluir via checkbox, ela envia `status: done` imediatamente, entao o item desaparece antes de mostrar o estado concluido.
- A recorrencia ja e tratada no servidor em `PATCH /api/items`, entao o atraso deve continuar chamando o mesmo `updateItem` para nao quebrar esse fluxo.
- Nao existe parser central unico de linguagem natural de datas. Ha logica duplicada em `quick-capture.tsx`, `item-detail.tsx`, `calendar-event-capture.tsx`, `due-date-picker.tsx` e `bulk-actions.tsx`.
- `DueDatePicker` ja calcula "Semana que vem" como segunda-feira. `bulk-actions.tsx` ainda usa `dateAfter(7)` para proxima semana.

## Scope

- [x] ID 073 - planejar correcao para Pastas mobile/desktop.
- [x] ID 074 - planejar correcao de `proxima semana`.
- [x] ID 073 - implementar atraso visual ao concluir tarefa em pasta/lista.
- [x] ID 073 - respeitar `hideCompleted` e `clearedAt`.
- [x] ID 073 - preservar pagina Hoje e recorrencia.
- [x] ID 074 - aceitar `proxima semana` e `semana que vem` como proxima segunda-feira.
- [x] ID 074 - corrigir menus/atalhos de data que usavam 7 dias.
- [x] Validar checks e evidencia visual.

## Out of scope

- Refatoracao ampla dos parsers de data.
- Mudancas em schema, API auth, sincronizacao Markdown ou regras de auditoria.
- Reabrir IDs anteriores marcados como OK.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e a regra de produto esta explicita: replicar o comportamento da pagina Hoje em Pastas e definir `proxima semana` como segunda-feira da semana seguinte. Nao ha decisao arquitetural nem conflito com ADRs.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] Em pasta com ocultar concluidos ativo, concluir uma tarefa mostra estado concluido por alguns segundos antes de sumir.
- [x] O mesmo comportamento funciona em desktop e mobile.
- [x] Em pasta configurada para manter concluidos visiveis, a tarefa permanece visivel como concluida.
- [x] `clearedAt` continua ocultando concluidos ja limpos.
- [x] A pagina Hoje mantem o comportamento atual.
- [x] Tarefas recorrentes continuam passando pelo `updateItem`/PATCH do servidor.
- [x] `proxima semana` calcula a proxima segunda-feira em qualquer dia da semana.
- [x] `semana que vem`, hoje, amanha, fim de semana, datas explicitas e demais atalhos continuam funcionando.

## Implementation plan

- [x] ID 073: adicionar estado local de conclusao temporaria na pagina Pastas/Notas.
- [x] ID 073: incluir itens temporariamente concluidos no filtro mesmo quando `hideCompleted` estiver ativo, apenas ate o PATCH executar.
- [x] ID 073: renderizar checkbox/estado visual como concluido durante o atraso e permitir reabrir imediatamente quando concluidos ficam visiveis.
- [x] ID 074: adicionar helper pequeno para proxima segunda-feira onde hoje havia `dateAfter(7)`.
- [x] ID 074: reconhecer `proxima semana`/`próxima semana` nos atalhos inline existentes.
- [x] Rodar type-check e checks relevantes.
- [x] Rodar servidor temporario, validar desktop/mobile com Browser/Playwright e salvar screenshots em `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/` e copiar para `G:\Meu Drive\.agentes`.
- [x] Atualizar esta spec com arquivos alterados, validacao e riscos antes da entrega.

## Progress

- 2026-05-30 17:00 - Lidas instrucoes BuilderFlow/doit-workflow, `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md` e specs recentes.
- 2026-05-30 17:00 - Mapeada causa provavel do ID 073 em `notas/page.tsx`: filtro remove `done` imediatamente quando `hideCompleted` ativo.
- 2026-05-30 17:00 - Mapeados pontos do ID 074: `quick-capture`, `item-detail`, `calendar-event-capture`, `due-date-picker` e `bulk-actions`.
- 2026-05-30 20:05 - Implementado atraso visual de 1500 ms em Pastas antes do `updateItem(status: done)`.
- 2026-05-30 20:05 - Criado helper `nextMondayOfNextWeekKey` em `@doit/core` e aplicado nos atalhos de data.
- 2026-05-30 20:06 - Type-check e lint passaram; build compilou e falhou apenas no passo final conhecido de symlink `EPERM` do Windows/OneDrive.
- 2026-05-30 20:14 - Validacao Playwright desktop/mobile passou e salvou screenshots no projeto e em `G:\Meu Drive\.agentes`.
- 2026-05-30 20:15 - Servidor temporario encerrado; porta 3100 liberada.
- 2026-05-30 20:23 - Validacao Playwright repetida com caso recorrente; confirmou concluida preservada e proxima ocorrencia criada apos o atraso.
- 2026-05-30 20:24 - Segundo servidor temporario encerrado; porta 3100 liberada.
- 2026-05-30 20:30 - Solicitado publish flow: ajustar docs para commit/push/PR apos tarefas validadas, commitar em `dev`, push e abrir PR para `main`.

## Decisions

- Decision: manter o atraso no cliente de Pastas e chamar `updateItem` depois do feedback visual.
  Reason: copia o comportamento correto da Hoje e preserva o funil de PATCH que trata recorrencia.
  ADR needed: no
- Decision: corrigir `proxima semana` nos parsers existentes sem consolidar todos os parsers agora.
  Reason: nao existe parser central; consolidar tudo seria refatoracao ampla fora do escopo.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/notas/page.tsx` - adiciona estado local `temporarilyDone`, atraso de 1500 ms antes de concluir e renderizacao temporaria do status concluido na lista da pasta.
- `packages/core/src/date.ts` - adiciona helpers puros para proximo dia da semana e proxima segunda-feira.
- `apps/web/src/components/items/quick-capture.tsx` - reconhece `proxima semana`/`próxima semana` e usa proxima segunda-feira.
- `apps/web/src/components/items/item-detail.tsx` - reconhece `proxima semana`/`próxima semana` e usa proxima segunda-feira.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - reconhece `proxima semana`/`próxima semana` em eventos.
- `apps/web/src/components/items/bulk-actions.tsx` - troca "proxima semana" de `+7 dias` para proxima segunda-feira.
- `apps/web/src/components/items/due-date-picker.tsx` - ajusta o rotulo do atalho rapido para `Proxima semana`.
- `specs/validate-073-074.mjs` - automacao Playwright de validacao desktop/mobile e atalho de data.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/` - screenshots de evidencia.
- `AGENTS.md` - registra que tarefas validadas devem terminar com commit em `dev`, push e PR `dev -> main`, salvo instrucao explicita em contrario.
- `docs/CONTEXT.md` - registra o handoff padrao de entrega por PR.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` - passed.
- [x] `pnpm --filter @doit/web lint` - passed with pre-existing warnings.
- [~] `pnpm --filter @doit/web build` - Next compiled, linted, type-checked, collected page data and generated static pages; failed only in final standalone trace copy with Windows/OneDrive `EPERM` while creating symlinks.
- [x] `pnpm exec tsc packages/core/src/date.ts --target ES2020 --module commonjs --outDir scratch/date-check --skipLibCheck; node ...` - verified Monday, Friday and Sunday bases all resolve to `2026-06-08`.
- [x] `node specs/validate-073-074.mjs` - passed.

Results:

- Type-check passed.
- Lint passed with existing warnings in unrelated files and existing hook/image warnings.
- Build failure is the known environment-specific symlink issue, after successful compilation and page generation.
- Date helper validation:
  - `2026-06-01 => 2026-06-08`
  - `2026-06-05 => 2026-06-08`
  - `2026-06-07 => 2026-06-08`
- Temporary server:
  - First start attempt PID `1680` used an invalid pnpm argument layout and exited.
  - Working server command: `pnpm --filter @doit/web exec next dev -p 3100 -H 127.0.0.1`.
  - Listener PIDs used by validation runs: `22020`, `1600`.
  - Port: `127.0.0.1:3100`.
  - Shutdown: `STOPPED 22020` and `STOPPED 1600`, porta 3100 liberada.

Frontend evidence:

- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-pastas-073-074-2026-05-30-01-desktop-temporario.png` - desktop, pasta oculta concluidos, tarefa ainda visivel como concluida durante atraso.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-pastas-073-074-2026-05-30-01-desktop-oculto.png` - desktop, tarefa some apos atraso.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-pastas-073-074-2026-05-30-04-desktop-keep-visible.png` - desktop, pasta mantem concluidos visiveis.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-pastas-073-074-2026-05-30-05-mobile-temporario.png` - mobile, tarefa visivel durante atraso.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-pastas-073-074-2026-05-30-05-mobile-oculto.png` - mobile, tarefa some apos atraso.
- `specs/artifacts/2026-05-30-corrigir-073-074-pastas-data/doitmd-data-074-2026-05-30-quickcapture-proxima-semana.png` - quick capture detecta `proxima semana` como `01/06`.
- Os mesmos screenshots foram copiados para `G:\Meu Drive\.agentes`.

## Risks

- Risk: atraso visual em Pastas pode atrasar a criacao da proxima ocorrencia recorrente.
  Mitigation: manter atraso curto e passar pelo mesmo `updateItem`; criterio visual prioriza feedback antes de sumir.
- Risk: parsers duplicados podem divergir no futuro.
  Mitigation: registrar que centralizacao completa fica fora do escopo; corrigir todos os pontos atuais conhecidos.

## Next step

Commit em `dev`, push para GitHub e PR `dev -> main`.
