# Corrigir busca, long press, checkboxes e Hoje

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Corrigir os cinco itens mais urgentes informados: busca abrindo notas, long press mobile sem selecao de texto indevida, checkboxes de tarefas em pastas, alinhamento da pagina Hoje e checkbox da pagina Hoje.
Manter o escopo curto, sem reabrir itens ja validados e sem refatoracao ampla.

## Context

BuilderFlow e `doit-workflow` foram usados. O app e uma PWA Next.js 15; as telas relevantes estao em `apps/web/src/app/(app)/today/page.tsx`, `apps/web/src/app/(app)/notas/page.tsx`, `apps/web/src/components/layout/topbar.tsx`, `apps/web/src/components/items/bulk-actions.tsx` e `apps/web/src/hooks/use-long-press.ts`. Specs anteriores mostram que 009/023/Hoje ja tiveram ajustes, mas os sintomas atuais indicam regressao visual/interativa localizada.

## Scope

- [x] ID 042: resultado de busca de nota abre diretamente a nota correta.
- [x] ID 009: long press mobile em Hoje/Pastas nao seleciona texto e menu identifica o item.
- [x] ID 023: tarefas em pastas usam checkbox visual igual ao da Hoje, sem aparencia de concluida quando abertas.
- [x] ID 037: Hoje sem pontos verdes indevidos e com alinhamento correto para itens com/sem horario.
- [x] ID 038: checkbox da Hoje volta ao padrao azul, branco e vazio quando aberto; check so quando concluido.

## Out of scope

- Alterar schema, auth, sync, dados Markdown ou regras de auditoria.
- Refatorar navegacao global, layout completo de Today v3 ou o sistema de pastas.
- Reabrir itens de calendario, quick add, modais ou ordenacao ja validados.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos, o escopo esta limitado a cinco bugs e a solucao pode ser inferida pelo codigo existente e specs recentes. Nenhuma decisao arquitetural ou de dados e necessaria.

Questions, if any:
1. N/A

Answers:
1. N/A

## Acceptance criteria

- [x] Busca: clicar em nota navega para `/notas/<id>` e abre a nota correta, inclusive com pasta/subpasta.
- [x] Busca: tarefas/eventos/outros tipos continuam abrindo pelo fluxo atual.
- [x] Long press: tarefa e nota no mobile abrem menu sem selecionar texto.
- [x] Long press: menu mostra titulo/identidade do item selecionado.
- [x] Pastas: tarefa aberta aparece com checkbox vazio; concluida aparece marcada.
- [x] Hoje: pontos verdes indevidos removidos.
- [x] Hoje: item sem horario alinha mais a esquerda; item com horario reserva espaco para horario.
- [x] Hoje: checkbox aberto azul/branco/vazio; concluido mostra check e segue sumindo pela logica existente.

## Implementation plan

- [x] Revisar busca/topbar e corrigir destino de notas.
- [x] Revisar long press, menu de contexto e classes de selecao mobile em Hoje/Pastas.
- [x] Unificar o visual de checkbox de tarefa aberta entre Pastas e Hoje sem mudar status logic.
- [x] Remover marcadores verdes/ajustar grid da Hoje.
- [x] Rodar checks e validacao visual local com screenshots.

## Progress

- 2026-05-29 21:03 - Lidas as skills BuilderFlow e doit-workflow, AGENTS, CONTEXT, ADR e specs relacionadas.
- 2026-05-29 21:03 - Criada spec viva da rodada com escopo limitado aos IDs 042, 009, 023, 037 e 038.
- 2026-05-29 21:30 - Corrigida busca para notas usando rota `/notas/<id>` e evitando resultados duplicados desktop/mobile no DOM.
- 2026-05-29 21:38 - Ajustados checkbox/alinhamento da Hoje e checkbox de tarefas em Pastas.
- 2026-05-29 21:45 - Endurecida prevencao de selecao nos alvos de long press em Hoje/Pastas.
- 2026-05-29 22:00 - Validacao Playwright passou 16/16 e screenshots foram salvos/copiados.

## Decisions

- Decision: trabalhar em `dev`.
  Reason: ADR-002 define `dev` como branch de desenvolvimento local/git.
  ADR needed: no
- Decision: corrigir navegacao de nota na busca navegando direto para `/notas/<id>`.
  Reason: notas usam editor imersivo dedicado e `ItemDetail` ja redireciona notas para essa rota quando selecionadas por outros fluxos.
  ADR needed: no
- Decision: selecionar resultado de busca no `pointerdown`, mantendo `click` como fallback.
  Reason: evita perda do clique quando o popover fecha/recicla antes do evento `click`.
  ADR needed: no
- Decision: aplicar `user-select: none` apenas em `[data-long-press-target]` dentro de Hoje/Pastas.
  Reason: bloqueia selecao acidental no long press sem afetar inputs, modais e editor de notas.
  ADR needed: no

## Files changed

- `apps/web/src/components/layout/topbar.tsx` - busca navega notas para `/notas/<id>`, preserva itens nao-nota via selecao, evita popovers duplicados e adiciona atributos de teste.
- `apps/web/src/hooks/use-long-press.ts` - marca alvos de long press e limpa selecao quando o long press dispara.
- `apps/web/src/app/globals.css` - bloqueia selecao mobile apenas nos alvos de long press em Hoje/Pastas.
- `apps/web/src/app/(app)/today/page.tsx` - checkbox da Hoje passou a renderizar check apenas no estado temporariamente concluido; linhas distinguem com/sem horario.
- `apps/web/src/app/(app)/today/today.css` - remove ponto de horario vazio, alinha tarefas sem horario e padroniza checkbox azul/branco.
- `apps/web/src/app/(app)/notas/page.tsx` - checkbox de tarefa aberta em Pastas usa fundo branco/borda azul; root recebeu escopo `doit-folder-browser`.
- `specs/validate-042-009-023-037-038.mjs` - validacao Playwright para os cinco IDs.
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/` - evidencias visuais.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `node specs\validate-042-009-023-037-038.mjs`

Results:

- Type-check passou sem erros.
- Lint passou com warnings pre-existentes (`img`, `exhaustive-deps`, fonte em layout).
- Build compilou, validou tipos/lint e gerou 21/21 paginas; falhou apenas no passo final de standalone por `EPERM: operation not permitted, symlink` em Windows/OneDrive, mesmo comportamento ja conhecido.
- Playwright: 16/16 checks passaram usando servidor temporario `pnpm --filter @doit/web dev` em `127.0.0.1:3000`.

Frontend evidence:

- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/01-search-result-desktop.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/02-search-opened-note-desktop.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/02b-search-opened-note-mobile.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/03-today-mobile-open-checkboxes.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/04-longpress-today-task-mobile.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/05-today-mobile-after-complete.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/06-folder-task-checkbox-mobile.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/07-longpress-note-mobile.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/08-folder-desktop-checkboxes.png`
- `specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today/09-today-desktop-alignment.png`
- Copias globais salvas em `G:\Meu Drive\.agentes` com nomes `doitmd-*2026-05-29*.png`.

## Risks

- Risk: endurecer `user-select` pode bloquear selecao onde o usuario precisa digitar/editar.
  Mitigation: aplicar escopo mobile nas superficies de lista, liberando inputs, textareas, modais e editor de notas.
- Risk: ajustar checkbox por classe pode afetar tarefas concluidas.
  Mitigation: separar explicitamente `item.status === 'done'` de tarefas abertas.

## Next step

Revisao manual opcional dos screenshots e do fluxo real com dados do usuario.
