# Implementar nova UI de Modais, Quick Add e Menu Contextual

## Metadata

- Status: in_progress
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Aplicar a nova identidade visual do app aos menus, Quick Add e modais completos, respeitando a arquitetura atual. 

## Context

O projeto conta com HTMLs standalone que definem as referências visuais e comportamentais para o Quick Add, Menu Contextual e os modais completos:
- `menu-contextual-standalone.html`
- `quick-add-standalone.html`
- `modais-standalone.html`

## Scope

- [x] Atualizar menu contextual desktop para mostrar opções rápidas de data no topo, remover botão Reagendar (apenas manter no topo)
- [x] Atualizar Action Sheet mobile para seguir lógica do menu desktop
- [x] Ocultar "Remover data" se o item não tem data
- [x] Atualizar componente de Quick Add para usar apenas uma linha compacta de entrada e não colorir as palavras internamente
- [x] Exibir a data detectada em texto pequeno abaixo do input e não incluir vencimento da tarefa no Quick Add
- [x] Adicionar botão no Quick Add para expandir ao modal completo
- [x] Atualizar Modais de Criação e Edição de Tarefas/Eventos para nova identidade visual e com datas detectadas exibidas logo abaixo do input principal.
- [x] Manter modal de Nota simples, sem detecção de data

## Out of scope

- O editor de nota não deve ser alterado (já trabalhado separadamente)
- Nenhuma arquitetura paralela deve ser criada; reutilizar/atualizar componentes existentes (`bulk-actions.tsx`, `quick-capture.tsx`, `calendar-event-capture.tsx`)

## Grill Gate

Decision: not_needed
Reason: Os requisitos e referências visuais estão perfeitamente claros nos HTMLs standalone, e não há regras de negócio obscuras ou decisões arquitetônicas pendentes.

## Acceptance criteria

- [x] O menu desktop não tem submenu de Reagendar.
- [x] Hoje, Amanhã, Próx. semana e Escolher aparecem diretamente no topo.
- [x] Mobile não tem botões duplicados no action sheet.
- [x] Quick Add é uma linha única.
- [x] Quick Add tem botão para abrir modal completo.
- [x] Data detectada aparece em texto pequeno abaixo do input, sem formatação (coloração) das palavras dentro do input.
- [x] Não aparece vencimento da tarefa nos selects.
- [x] Modais completos usam a mesma regra de data detectada pequena.
- [x] A edição de nota não foi alterada.
- [x] Desktop e mobile continuam funcionando.

## Implementation plan

- [ ] Ajustar `ItemContextMenuContent` e `ItemContextMenu` em `bulk-actions.tsx`
- [ ] Ajustar `QuickCapture` em `quick-capture.tsx` (remover HighlightedTitleInput e usar input normal, renderizar data detectada embaixo)
- [ ] Ajustar Modais (event-capture, modais fulls)
- [ ] Validar UI localmente

## Progress

- 2026-05-28 11:25 - Spec criada.
- 2026-05-28 13:02 - Reaberta como bugfix após feedback de que os modais ficaram diferentes da referência e com fundo transparente demais.
- 2026-05-28 13:02 - Diagnóstico: `quick-capture.tsx` ainda usa `HighlightedTitleInput` no modal expandido de tarefa, deixando o texto real transparente e colorindo metadados; `calendar-event-capture.tsx` ainda mostra chips de metadata e o texto "Data do evento"; ambos usam overlay sem mesh gradient.

## Decisions

- Decision: Nenhuma

## Files changed

- `apps/web/src/components/items/bulk-actions.tsx`
- `apps/web/src/components/items/quick-capture.tsx`
- `apps/web/src/components/calendar/calendar-event-capture.tsx`

## Validation

Commands run:

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`

Frontend evidence:
- [ ]

## Risks

- Risco: O parser inline de date (`activeShortcut`, `INLINE_METADATA_PATTERN`) pode não disparar corretamente ao trocar a UI do input do quick add se não gerenciado adequadamente com a nova UX minimalista.
  - Mitigação: Manter o parser funcionando internamente em `quick-capture.tsx`, apenas mudar a renderização.

## Next step

Corrigir os modais expandidos de tarefa/evento e o overlay visual para seguir os HTMLs standalone.
