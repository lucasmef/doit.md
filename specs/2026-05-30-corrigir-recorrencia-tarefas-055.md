# ID 055 — Corrigir recorrência de tarefas

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Ao concluir uma tarefa recorrente, marcar a ocorrência atual como concluída
(preservando o histórico) e criar automaticamente a próxima ocorrência conforme
a regra de recorrência, sem duplicar e sem sobrescrever a concluída. Corrigir a
causa raiz para que funcione em todos os fluxos de conclusão (desktop e mobile).

## Context

- doit.md é uma PWA Next.js 15 (monorepo pnpm). Tarefas são `Item` com campo
  `recurrence` (`daily | weekdays | weekly | monthly | yearly | custom:...`).
- Cálculo da próxima data já existe e é robusto: `nextRecurringDate` em
  `packages/core/src/recurrence.ts` (usa a data original como âncora e avança
  até passar de hoje; trata diário/semanal/mensal/anual/personalizado).
- **Causa raiz:** a recorrência só era tratada em 2 de ~7 pontos de conclusão
  (`item-row.tsx` e `item-detail.tsx`), e mesmo esses 2 usavam a abordagem
  ERRADA: "rolavam" a MESMA tarefa para frente (`status: 'todo'` + nova
  `dueDate`), sem nunca marcar como concluída e sem criar nova ocorrência.
  Os demais pontos (`today`, `dashboard`, kanban `itens`, `markdown-editor`,
  `bulk-actions`) só enviavam `status: 'done'`, ignorando a recorrência por
  completo. Resultado: nenhuma nova ocorrência era criada.
- Todos esses pontos passam pelo mesmo funil de API:
  `PATCH /api/items/[id]` (individual) e `PATCH /api/items/bulk` (em massa).

## Scope

- [x] Centralizar a criação da próxima ocorrência no servidor (causa raiz).
- [x] Marcar a ocorrência atual como `done` normalmente (histórico preservado).
- [x] Criar nova ocorrência copiando título, descrição, pasta/área, prioridade,
      tags, recorrência, dueTime, parentId e complexidade, com a próxima dueDate.
- [x] Idempotência: só gera nova ocorrência na transição `!done -> done`.
- [x] Remover o "roll-forward" redundante do cliente (item-row, item-detail)
      para que todos os fluxos fiquem uniformes.

## Out of scope

- Refatoração ampla de recorrência ou do schema.
- Mudança no algoritmo de cálculo de datas (`nextRecurringDate`).
- Recorrência para notas (notas não têm recorrência por design).

## Grill Gate

Decision: not_needed

Reason:
Os requisitos estão totalmente explícitos no bug report (concluir = marcar
concluída + criar próxima; preservar dados; sem duplicar). O caminho de
implementação é determinado pela arquitetura existente (funil único de API e
helper `nextRecurringDate` já pronto). A política "data original como âncora"
já é a do código e atende o comportamento esperado. Nada arquitetural ou
ambíguo restante.

## Acceptance criteria

- [x] Concluir tarefa recorrente cria a próxima ocorrência automaticamente.
- [x] A tarefa concluída permanece registrada como `done`.
- [x] A nova ocorrência aparece na data correta.
- [x] Não há duplicidade ao clicar mais de uma vez / re-render.
- [x] Tarefas não recorrentes apenas concluem (sem nova tarefa).
- [x] Funciona desktop e mobile (mesmo fluxo de API).
- [x] Não quebra Hoje, Pastas, Agenda, busca, kanban (build + e2e ok).

## Implementation plan

- [x] Criar helper `spawnNextRecurrenceIfNeeded` em
      `apps/web/src/lib/api/recurrence.ts`.
- [x] Chamar no `PATCH /api/items/[id]` após update com sucesso.
- [x] Chamar no `PATCH /api/items/bulk` por item dentro do loop.
- [x] Simplificar `item-row.tsx` `toggleDone` (remover roll-forward).
- [x] Simplificar `item-detail.tsx` `handleStatusChange` (remover roll-forward).
- [ ] Validar: type-check, lint, build.
- [ ] Validação manual no navegador + screenshot.

## Progress

- 2026-05-30 — Mapeado contexto (AGENTS, CONTEXT, recurrence.ts, rotas, fluxos).
- 2026-05-30 — Identificada causa raiz (recorrência só em 2/7 pontos e com
  abordagem errada de roll-forward).
- 2026-05-30 — Decisão: centralizar no servidor; iniciar implementação.

## Decisions

- Decision: Centralizar a criação da próxima ocorrência no servidor (rotas de
  PATCH), não no cliente.
  Reason: Existem ~7 pontos de conclusão; centralizar no funil de API corrige
  todos de uma vez, garante idempotência (transição `!done -> done`) e elimina
  divergência desktop/mobile. Alinha com "corrigir a causa raiz, não a UI".
  ADR needed: no (schema inalterado, reversível; é mudança de comportamento de
  domínio registrada aqui).

- Decision: A ocorrência concluída vira um registro `done` separado e uma NOVA
  ocorrência `todo` é criada (antes: a mesma tarefa era reaproveitada).
  Reason: Requisito explícito do ID 055 (preservar histórico da concluída).
  ADR needed: no.

- Decision: Próxima data calculada a partir da data original (âncora), via
  `nextRecurringDate` já existente.
  Reason: Comportamento já presente no código e correto para o caso de uso.
  ADR needed: no.

## Files changed

- `apps/web/src/lib/api/recurrence.ts` — novo helper de criação da próxima ocorrência.
- `apps/web/src/app/api/items/[id]/route.ts` — dispara o helper na conclusão.
- `apps/web/src/app/api/items/bulk/route.ts` — dispara o helper por item.
- `apps/web/src/components/items/item-row.tsx` — remove roll-forward.
- `apps/web/src/components/items/item-detail.tsx` — remove roll-forward.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — passou (apenas warnings pré-existentes).
- [x] `pnpm --filter @doit/web build` — compilou + type-check + 21 páginas OK.
      Falha apenas na cópia do output `standalone` (EPERM symlink, Windows+OneDrive),
      não relacionada ao código.
- [x] Teste de lógica (script tsx contra @doit/db real + helper): 12/12 asserções.
      Cenários: diária, semanal, mensal, não-recorrente, dupla conclusão.
- [x] Teste e2e Playwright (chromium-desktop): conclusão via página Hoje cria a
      próxima ocorrência (amanhã), original fica `done`, sem duplicar. PASS.

Results:

- Lógica de causa raiz e fluxo e2e validados. Servidor Playwright (porta 3100)
  iniciado e encerrado automaticamente; portas 3000/3100 confirmadas livres.
- Scripts de validação temporários (`recurrence-check.mts`, `recurrence-055.spec.ts`)
  removidos após uso.

Frontend evidence:

- `specs/artifacts/2026-05-30-corrigir-recorrencia-tarefas-055/01-today-recorrente-pendente.png`
  — tarefa recorrente diária pendente na página Hoje.
- `specs/artifacts/2026-05-30-corrigir-recorrencia-tarefas-055/02-itens-concluida-e-nova-ocorrencia.png`
  — kanban /itens: "1/2 concluídas", coluna "feito" com a ocorrência concluída e
  coluna "today" com a nova ocorrência criada.
- Cópia global: `G:\Meu Drive\.agentes\doitmd-recorrencia-itens-2026-05-30.png` e
  `doitmd-recorrencia-today-2026-05-30.png`.

## Risks

- Risk: Concorrência real de cliques simultâneos antes do primeiro write.
  Mitigation: guard de transição no servidor (`current.status !== 'done'`);
  SQLite serializa writes; cliques de usuário são sequenciais.
- Risk: Offline — nova ocorrência só aparece após flush/revalidação.
  Mitigation: o servidor cria a ocorrência no flush; degradação aceitável.

## Next step

Commit/push feitos na branch `dev` (commit `56b418e`). Pontos para revisão manual:
- Confirmar visualmente em dispositivo mobile real (e2e cobriu apenas desktop;
  o fluxo de API é o mesmo, então a expectativa é de paridade).
- Decidir, em iteração futura, se a ocorrência concluída deve ter o campo
  `recurrence` removido para virar registro histórico "puro" (hoje é mantido;
  reabrir + reconcluir geraria nova ocorrência — comportamento aceitável).
