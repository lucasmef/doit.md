# Corrigir Nota Em Tela Cheia Com Menu Recolhido

## Metadata

- Status: done
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-22
- Updated: 2026-05-22

## Objective

Corrigir o editor de nota em tela cheia no desktop para ocupar o espaco liberado quando o menu lateral e recolhido.
O overlay da nota deve acompanhar a largura real do menu, sem deixar parte da tela anterior visivel atras.

## Context

O layout principal usa `AppChrome` com `Sidebar` dentro do fluxo flex do desktop. O detalhe de item (`ItemDetail`) e renderizado fora desse fluxo em `apps/web/src/app/(app)/layout.tsx`, entao precisa calcular seu proprio deslocamento lateral.

`Sidebar` usa a preferencia `sidebarCollapsed` e alterna entre `260px` expandido e `68px` recolhido. O overlay de nota em tela cheia em `ItemDetail` usava `lg:left-[260px]` fixo tanto no backdrop quanto no painel, causando o espaco vazio quando o menu era recolhido.

## Scope

- [x] Localizar a causa do overlay desalinhado no desktop.
- [x] Ajustar o deslocamento lateral do editor de nota em tela cheia.
- [x] Validar type-check.
- [x] Validar o fluxo no navegador desktop com screenshots.

## Out of scope

- Redesenhar o editor de nota.
- Alterar comportamento de mobile.
- Alterar persistencia de preferencias.

## Grill Gate

Decision: not_needed

Reason:
A causa e objetiva e inferivel pelo codigo: o overlay usa largura fixa de menu expandido apesar de existir preferencia centralizada para menu recolhido.

Questions, if any:
1. N/A

Answers:
1. N/A

## Acceptance criteria

- [x] Com menu expandido no desktop, o editor de nota em tela cheia inicia depois dos `260px` do menu.
- [x] Com menu recolhido no desktop, o editor de nota em tela cheia inicia depois dos `68px` do menu.
- [x] Ao recolher/expandir o menu com a nota aberta, nao aparece faixa de outra tela atras.
- [x] Mobile continua usando `left: 0`.
- [x] Type-check passa.
- [x] Evidencia visual salva em `specs/artifacts/2026-05-22-corrigir-nota-tela-cheia-sidebar/`.

## Implementation plan

- [x] Revisar `Sidebar`, `usePreferences` e `ItemDetail`.
- [x] Importar `usePreferences` no detalhe de item.
- [x] Aplicar offset dinamico via variavel CSS no overlay de nota.
- [x] Rodar validacoes e atualizar esta spec.

## Progress

- 2026-05-22 14:32 - Revisado contexto do repositorio, BuilderFlow e arquivos de layout.
- 2026-05-22 14:32 - Encontrada causa em `apps/web/src/components/items/item-detail.tsx`: `lg:left-[260px]` fixo no overlay de nota.
- 2026-05-22 14:34 - Implementado offset dinamico baseado em `sidebarCollapsed`.
- 2026-05-22 14:35 - `pnpm --filter @doit/web type-check` passou.
- 2026-05-22 14:47 - Validado no Chrome headless em viewport desktop 1440x900: overlay `left=260` expandido e `left=68` recolhido.
- 2026-05-22 14:48 - Servidor local e Chrome headless temporarios encerrados; porta 3000 liberada.

## Decisions

- Decision: Usar a preferencia existente `sidebarCollapsed` para definir o offset do overlay.
  Reason: Evita duplicar estado de UI e acompanha o mesmo comportamento do menu.
  ADR needed: no

## Files changed

- `apps/web/src/components/items/item-detail.tsx` - usa `usePreferences` para aplicar o offset real do menu no overlay de nota em tela cheia.
- `specs/2026-05-22-corrigir-nota-tela-cheia-sidebar.md` - spec viva e validacao.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`

Results:

- Passed.
- Dev server temporario: `pnpm --filter @doit/web exec next dev -p 3000`.
- Server PID/processo: `node.exe` PID `12524`, encerrado com sucesso.
- Chrome headless PID: `6428`, encerrado com sucesso.
- Porta 3000: liberada apos validacao.

Frontend evidence:

- `specs/artifacts/2026-05-22-corrigir-nota-tela-cheia-sidebar/01-note-fullscreen-sidebar-expanded.png` - nota em tela cheia com menu expandido; medicao CDP `left=260`, `width=1180`.
- `specs/artifacts/2026-05-22-corrigir-nota-tela-cheia-sidebar/02-note-fullscreen-sidebar-collapsed.png` - nota em tela cheia com menu recolhido; medicao CDP `left=68`, `width=1372`.

## Risks

- Risk: Tailwind precisa aceitar classe arbitraria com variavel CSS em breakpoint `lg`.
  Mitigation: Validado no navegador e type-check passou.

## Next step

Revisar diff local e seguir com commit/PR quando desejado.
