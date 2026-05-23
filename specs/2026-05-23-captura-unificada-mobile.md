# Captura unificada mobile

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-23
- Updated: 2026-05-23

## Objective

Unificar a experiencia de captura em mobile para Tarefa, Nota e Evento com um bottom sheet consistente, controle segmentado no topo e troca por gesto horizontal. Ajustar atalhos globais para `q` abrir tarefa, `w` abrir nota e `e` abrir evento.

## Context

O app ja possui `QuickCapture` para tarefas/notas e `CalendarEventCapture` para eventos. Eles sao renderizados globalmente no layout logado. A pesquisa previa em `specs/2026-05-23-pesquisar-modais-adicao.md` apontou que nao havia spec dedicada para unificacao. O usuario definiu o modelo recomendado: um modal unico com modos Tarefa, Nota e Evento, swipe horizontal no mobile, botao `+` abrindo ultimo tipo usado ou tarefa por padrao, e entidades continuando separadas apos salvar.

Atualizacao de escopo em 2026-05-23: no celular, os tres modos devem abrir inicialmente com a mesma estrutura compacta: abas, um unico campo de texto com acao `+` acoplada e expansao por handle/toque ou swipe para cima.

Atualizacao de escopo em 2026-05-23: no desktop, o modal de evento deve ser mais compacto, sem cabecalho redundante (`Google Calendar`, `Novo evento`, `X`), com escolha de calendario no rodape. A quick capture de nota nao deve exibir acoes de exportar/imprimir, e o botao de tela cheia nao deve ocupar uma linha propria.

## Scope

- [x] Adicionar estado global de modo de captura e ultimo modo usado.
- [x] Fazer `q`, `w` e `e` abrirem Tarefa, Nota e Evento respectivamente.
- [x] Fazer o botao `+` mobile abrir o ultimo modo usado, ou Tarefa por padrao.
- [x] Adicionar controle segmentado Tarefa/Nota/Evento nos sheets de captura.
- [x] Adicionar swipe horizontal entre modos no mobile, sem disparar em campos de texto.
- [x] Fazer Tarefa, Nota e Evento abrirem compactos no celular com apenas campo principal e acao `+`.
- [x] Expandir por handle/toque ou swipe para cima.
- [x] Compactar modal de evento desktop e mover calendario para o rodape.
- [x] Remover exportar/imprimir do editor dentro da quick capture.
- [x] Reposicionar botao de tela cheia da nota para o header da captura.
- [x] Atualizar ajuda de atalhos.
- [x] Validar type-check e fluxo visual.

## Out of scope

- Unificar entidades de dados; tarefa, nota e evento continuam separados.
- Reescrever do zero os formularios de tarefa, nota ou evento.
- Alterar APIs de criacao de item ou calendario.
- Remover o fluxo de editar item existente.

## Grill Gate

Decision: not_needed

Reason:
O usuario especificou o comportamento esperado, ordem dos modos, atalhos e regra do botao mobile. A implementacao pode seguir os componentes existentes sem decisao arquitetural.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `q` abre captura no modo Tarefa.
- [x] `w` abre captura no modo Nota.
- [x] `e` abre captura no modo Evento.
- [x] O botao `+` mobile abre o ultimo modo usado, ou Tarefa por padrao.
- [x] O topo do bottom sheet permite alternar entre Tarefa, Nota e Evento.
- [x] No celular, cada modo abre com somente um campo de texto e botao `+`.
- [x] Handle/toque ou swipe para cima abre o formulario grande existente.
- [x] Modal de evento desktop nao mostra cabecalho `Google Calendar`/`Novo evento`/`X`.
- [x] Select de calendario fica na parte de baixo do modal de evento.
- [x] Editor de nota na quick capture nao mostra botoes de exportar/imprimir.
- [x] Swipe horizontal alterna modos no mobile quando o gesto nao comeca em campo editavel.
- [x] `pnpm --filter @doit/web type-check` passa.
- [x] Evidencia visual salva em `specs/artifacts/2026-05-23-captura-unificada-mobile/`.

## Implementation plan

- [x] Estender `UIContext` com modo de captura.
- [x] Atualizar `UIProvider` e atalhos globais.
- [x] Ajustar `QuickCapture` para abrir em Tarefa/Nota, compartilhar header segmentado e colapsar no mobile.
- [x] Ajustar `CalendarEventCapture` para usar o mesmo header, alternar modos e colapsar no mobile.
- [x] Atualizar `BottomNav`, ajuda de atalhos e smoke visual.
- [x] Rodar validacoes e atualizar esta spec.

## Progress

- 2026-05-23 - Contexto BuilderFlow, docs e componentes de captura revisados.
- 2026-05-23 - Estado global `captureMode`/`lastCaptureMode` criado e atalhos `q`, `w`, `e` ajustados.
- 2026-05-23 - Header segmentado e swipe horizontal adicionados aos sheets de tarefa/nota e evento.
- 2026-05-23 - Smoke visual passou em Chromium desktop/mobile e screenshots foram salvos.
- 2026-05-23 - Sheets mobile ajustados para abrir compactos com apenas campo principal e botao `Expandir`.
- 2026-05-23 - Compacto mobile recebeu botao explicito `Adicionar` em tarefa/nota e `Criar` em evento.
- 2026-05-23 - Compacto mobile refinado para campo + botao circular `+`; expansao passou para handle/toque e swipe para cima.
- 2026-05-23 - Modal de evento desktop compactado, calendario movido para rodape e fechamento mantido por `Cancelar`.
- 2026-05-23 - Quick capture de nota ajustada para esconder exportar/imprimir e mover tela cheia para o header.
- 2026-05-23 - Smoke visual atualizado para validar compacto mobile e expansao do formulario de evento.

## Decisions

- Decision: preservar formularios existentes e unificar a camada de abertura/header/troca de modo.
  Reason: reduz risco em fluxos de salvar tarefa, nota e evento enquanto entrega a experiencia unificada.
  ADR needed: no

## Files changed

- `apps/web/src/store/ui.ts` - adiciona tipos e API de modo de captura.
- `apps/web/src/store/ui-provider.tsx` - centraliza abertura por modo e troca atalho de evento para `e`.
- `apps/web/src/components/capture/capture-mode-tabs.tsx` - componente compartilhado de abas e handlers de swipe.
- `apps/web/src/components/items/quick-capture.tsx` - adiciona abas Tarefa/Nota/Evento e modo inicial por atalho.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - adiciona abas, swipe e troca de modo.
- `apps/web/src/components/items/quick-capture.tsx` - adiciona versao compacta mobile com campo unico e `Expandir`.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - adiciona versao compacta mobile com campo unico e `Expandir`.
- `apps/web/src/components/items/quick-capture.tsx` - troca botoes empilhados por campo + botao circular `+`.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - troca botoes empilhados por campo + botao circular `+`.
- `apps/web/src/components/capture/capture-mode-tabs.tsx` - adiciona swipe para cima como gesto de expandir.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - remove cabecalho desktop e move calendario para rodape.
- `apps/web/src/components/items/markdown-editor.tsx` - adiciona opcao para esconder acoes de documento.
- `apps/web/src/components/items/quick-capture.tsx` - esconde exportar/imprimir no editor de nota e move fullscreen para o header.
- `apps/web/src/components/layout/bottom-nav.tsx` - botao `+` abre o ultimo modo usado.
- `apps/web/src/components/layout/shortcut-help-modal.tsx` - documenta `E` para evento.
- `apps/web/src/app/(app)/settings/page.tsx` - documenta `E` para evento.
- `apps/web/e2e/visual-capture.spec.ts` - valida `E` e as abas do capture sheet.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web test:visual`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web test:visual`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web test:visual`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web test:visual`
- [x] `pnpm --filter @doit/web type-check`
- [x] `Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue`

Results:

- Type-check passou.
- Smoke visual Playwright passou em `chromium-desktop` e `chromium-mobile`.
- Smoke visual atualizado passou com evento compacto no mobile, expansao do evento e quick capture compacto.
- Smoke visual passou validando botoes compactos desabilitados antes de texto.
- Smoke visual passou com a versao compacta campo + `+` e expansao por handle.
- Smoke visual passou apos compactar o modal desktop de evento e ajustar o editor da quick capture.
- Nenhum processo ficou ouvindo na porta 3100 apos o teste.

Frontend evidence:

- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-desktop-01-calendar.png`
- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-desktop-02-event-modal.png`
- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-desktop-03-quick-capture.png`
- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-mobile-01-calendar.png`
- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-mobile-02-event-modal.png`
- `specs/artifacts/2026-05-23-captura-unificada-mobile/chromium-mobile-03-quick-capture.png`

## Risks

- Risk: `e` deixara de ser o atalho primario para editar item selecionado.
  Mitigation: aplicar o pedido explicito do usuario e manter edicao acessivel via UI existente.

## Next step

Revisar a experiencia no dispositivo real e decidir se a edicao por atalho deve ganhar uma nova tecla dedicada.
