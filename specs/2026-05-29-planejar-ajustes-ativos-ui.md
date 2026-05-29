# Planejar ajustes ativos de UI

## Metadata

- Status: planned
- Mode: research
- Complexity: high
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Planejar a proxima rodada de ajustes ativos do doit.md sem implementar codigo neste momento.
O entregavel e uma PRD/spec tecnica de handoff para outro agente implementar apenas os IDs ativos:
009, 022, 023, 025, 028, 030, 031 e 035 a 046.

## Context

Contexto carregado antes do planejamento:

- `AGENTS.md`: regras do repo, BuilderFlow obrigatorio, prints para alteracoes visuais, sem deixar servidor rodando.
- `docs/CONTEXT.md`: Next.js 15, React 19, SWR, UIContext, `usePreferences`, validacao visual obrigatoria para frontend.
- `docs/ADR.md`: BuilderFlow ativo; fluxo local dev -> dev git -> main git -> main VPS.
- Specs recentes: `2026-05-29-reajustes-v3-notas-today-calendario-modais.md`, `2026-05-29-apply-new-today-layout.md`, `2026-05-29-menu-contexto-pastas.md`, `2026-05-29-reajustes-mobile-v2-calendario-notas-quickadd.md`.
- Arquivos mapeados:
  - `apps/web/src/app/(app)/today/page.tsx` e `today.css`: Hoje v3, mini calendario, filtros ainda decorativos, textos `Agenda`/`finalizado`, layout de linha e checkbox.
  - `apps/web/src/app/(app)/notas/page.tsx`: navegador de pastas/notas, menu de pasta, tarefas em lista/cards, destacadas, ordenacao por pasta, long press.
  - `apps/web/src/app/(app)/calendar/page.tsx`: calendario bento, fullscreen desktop, `+x`, eventos por celula.
  - `apps/web/src/components/items/bulk-actions.tsx`: menu de contexto de item por long press/clique direito.
  - `apps/web/src/components/capture/capture-mode-tabs.tsx`, `quick-capture.tsx`, `calendar-event-capture.tsx`: abas Tarefa/Nota/Evento e modais de criacao.
  - `apps/web/src/components/ui/dialog.tsx`, `components/items/item-detail.tsx`, `components/layout/topbar.tsx`, `components/agents/agents-editor-modal.tsx`: overlays/backdrops divergentes.
  - `apps/web/src/components/layout/topbar.tsx`: busca global seleciona item via `setSelectedItemId`, sem navegacao contextual para notas/pastas.
  - `apps/web/src/hooks/use-preferences.ts`: persistencia local ja guarda `pinnedFolderIds` e `folderSort`; caminho recomendado para preferencias leves por pasta.
  - `apps/web/src/app/(app)/notas/[id]/page.tsx`: editor de nota com logo/link lateral atualmente voltando para biblioteca, nao para Hoje.

## Scope

- [ ] ID 009 - Reajustar long press mobile e selecao de texto em Hoje/Pastas.
- [ ] ID 022 - Reajustar renderizacao de eventos no calendario desktop fullscreen.
- [ ] ID 023 - Padronizar checkbox de tarefas em pastas com o modelo da Hoje.
- [ ] ID 025 - Consolidar acoes de pasta em um unico menu.
- [ ] ID 028 - Padronizar overlay/backdrop de modais com menos blur.
- [ ] ID 030 - Padronizar aba `Evento` no modal de criacao.
- [ ] ID 031 - Compactar linha `+x` no calendario mobile.
- [ ] ID 035 - Persistir configuracao de concluidos por pasta.
- [ ] ID 036 - Criar acao `Limpar concluidos`.
- [ ] ID 037 - Ajustar layout dos itens da pagina Hoje.
- [ ] ID 038 - Corrigir checkbox da pagina Hoje.
- [ ] ID 039 - Implementar painel lateral direito da pagina Hoje.
- [ ] ID 040 - Tornar calendario/navegacao lateral da pagina Hoje funcionais.
- [ ] ID 041 - Remover filtros e textos redundantes da pagina Hoje.
- [ ] ID 042 - Corrigir navegacao da busca para abrir a nota/item correto.
- [ ] ID 043 - Permitir destacar notas.
- [ ] ID 044 - Ajustar fundo da pagina Pastas.
- [ ] ID 045 - Reorganizar manualmente pastas destacadas.
- [ ] ID 046 - Logo na edicao de nota navega para Hoje.

## Out of scope

- Reabrir IDs que o usuario ja confirmou como OK e que nao estao na lista ativa.
- Refatoracao ampla de layout, design system, banco, sync, auth ou schemas.
- Alterar `packages/db/src/schemas/`.
- Implementar codigo nesta etapa de planejamento.
- Criar PRD/TASKS/STATUS/HANDOFF separados; esta living spec e a fonte unica.

## Grill Gate

Decision: not_needed

Reason:
Os criterios ativos sao objetivos e verificaveis. As escolhas tecnicas que tinham multiplos caminhos foram resolvidas por preferencia conservadora:
usar `usePreferences` para persistencias leves de UI por pasta/nota, manter `UIContext` para selecao global, reutilizar menus existentes e evitar schema/API salvo se a implementacao provar que `localStorage` nao atende. Nao ha mudanca arquitetural obrigatoria nesta rodada.

## PRD/spec tecnica por ID

### ID 009 - Acoes mobile / long press

Problema:
Long press abre menu, mas a selecao de texto nativa ainda compete com o gesto; o menu precisa identificar claramente o item.

Objetivo:
Em mobile, long press em tarefa/nota em Hoje e Pastas deve abrir menu de acoes sem selecionar texto; toque simples continua abrindo o item.

Escopo:
- Aplicar bloqueio de selecao apenas nas superficies de lista/card das paginas Hoje e Pastas.
- Manter selecao liberada em modais, inputs, textareas, ProseMirror/MarkdownEditor e edicao de notas.
- Garantir que o header do menu mostre tipo e titulo/contexto do item.

Criterios de aceite:
- [ ] Long press em tarefa abre o menu de acoes.
- [ ] Long press em nota abre o menu de acoes.
- [ ] O menu mostra titulo e tipo/contexto do item.
- [ ] Scroll vertical nao dispara menu indevidamente.
- [ ] Nao ha selecao de texto nas superficies mobile de Hoje/Pastas.
- [ ] Inputs, textareas, modais e editor continuam permitindo selecao.
- [ ] Toque simples abre item normalmente.

Riscos:
- Bloquear `user-select` de forma global quebraria editor ou campos.
- `preventDefault` agressivo pode prejudicar scroll.

Validacao:
- Mobile 390x844: Hoje e Pastas, long press em tarefa e nota, drag vertical para scroll, toque simples.
- Testar selecao de texto dentro do editor de nota e campos do quick add.

### ID 022 - Calendario desktop fullscreen

Problema:
Eventos em fullscreen ainda podem ficar truncados/comprimidos em celulas do mes.

Objetivo:
Aproveitar a area expandida para distribuir eventos com altura estavel, sem sobreposicao e sem quebra do modo normal/mobile.

Escopo:
- Ajustar apenas `apps/web/src/app/(app)/calendar/page.tsx` e estilos/classes locais se necessario.
- Diferenciar limites de eventos entre mobile, desktop normal e desktop fullscreen.
- Validar dias com muitos eventos.

Criterios de aceite:
- [ ] Fullscreen desktop mostra eventos legiveis e sem sobreposicao.
- [ ] Celulas usam a altura expandida em vez de manter densidade do modo normal.
- [ ] Modo normal segue funcional.
- [ ] Mobile nao muda negativamente.
- [ ] Dia com muitos eventos mostra itens visiveis + indicador compacto/popup.

Riscos:
- Aumentar muito `monthMaxVisible` pode piorar celulas pequenas.
- Misturar eventos e tarefas pode exigir limite combinado por altura.

Validacao:
- Desktop 1440x900 e 1920x1080: modo MES normal e fullscreen, com 0, 1, 3, 6+ eventos no dia.
- Mobile 390x844: mes ainda compacto.

### ID 023 - Checkbox de tarefas em pastas

Problema:
Tarefas abertas em pastas parecem concluidas por tom verde/check.

Objetivo:
Usar visual igual ou equivalente ao da Hoje: aberto = checkbox vazio, fundo branco/neutro, contorno azul; concluido = check.

Escopo:
- Lista, cards, kanban e pontos onde tarefas aparecem dentro de Pastas.
- Nao alterar visual de notas como documentos.

Criterios de aceite:
- [ ] Tarefa aberta mostra checkbox desmarcado.
- [ ] Checkbox aberto nao usa verde nem check preenchido.
- [ ] Tarefa concluida pode aparecer marcada.
- [ ] Aplica em lista, cards e kanban dentro de Pastas.

Riscos:
- Icone unico `ItemTypeGlyph` pode misturar nota/tarefa; separar `TaskCheckboxGlyph` evita ambiguidade.

Validacao:
- Pastas em lista e kanban com tarefa todo/doing/done e nota.

### ID 025 - Menu de acoes das pastas

Problema:
Acoes de pasta ainda estao soltas em varios botoes/menus.

Objetivo:
Consolidar acoes secundarias da pasta atual em um unico menu, deixando visivel apenas acao primaria indispensavel.

Escopo:
- Header de pasta selecionada.
- Menu contextual de pasta quando aplicavel.
- Acoes: AGENTS.md, nova pasta/subpasta, novo item, ordenacao, visualizacao, excluir, ocultar/mostrar concluidos, limpar concluidos e similares.

Criterios de aceite:
- [ ] Header nao mostra `AGENTS.md`, `Nova subpasta`, `Novo item` e kebab todos soltos.
- [ ] Acoes secundarias estao em um unico menu.
- [ ] Menu tem grupos claros e mantem descoberta.
- [ ] Espaco util aumenta e poluicao visual diminui.

Riscos:
- Esconder demais `Novo item` pode prejudicar fluxo principal; recomendado manter no desktop se for acao primaria e mover no mobile para menu/botao final.

Validacao:
- Desktop e mobile em raiz, pasta, subpasta, pasta vazia, kanban e lista.

### ID 028 - Blur dos modais

Problema:
Overlays/backdrops usam blur e opacidades diferentes; alguns estao fortes.

Objetivo:
Padronizar overlay visual com scrim leve e blur baixo.

Escopo:
- `DialogProvider`, `AgentsEditorModal`, quick capture, calendar event capture, `EventSheet`, `ItemDetail`, mobile menu/topbar sheets e drawers relacionados.
- Criar constante/helper CSS se fizer sentido, sem refatoracao ampla.

Criterios de aceite:
- [ ] Modais usam padrao visual consistente.
- [ ] Blur reduzido, sem `backdrop-blur-md/2xl/[24px]` em overlays principais.
- [ ] Painel continua legivel com contraste suficiente.
- [ ] Dialogs, painels e sheets nao parecem de sistemas diferentes.

Riscos:
- Reduzir blur sem ajustar scrim pode perder contraste.

Validacao:
- Abrir quick add, evento, item detail, dialog confirm/prompt, AGENTS.md, drawer de pastas e menu mobile.

### ID 030 - Aba Evento no modal de criacao

Problema:
`Evento` parece transparente/apagado em relacao a `Tarefa` e `Nota`.

Objetivo:
Padronizar fundo, contraste e estados ativo/inativo das tres abas.

Escopo:
- `CaptureModeTabs` e os lugares onde ele e renderizado em quick add/event capture.

Criterios de aceite:
- [ ] `Evento` tem o mesmo peso visual das outras abas.
- [ ] Estado ativo/inativo e legivel em desktop e mobile.
- [ ] Nao parece desabilitado.

Riscos:
- Ajustar apenas uma aba gera inconsistencia; mexer no componente comum e melhor.

Validacao:
- Quick add compacto/expandido, criar evento, criar tarefa, criar nota.

### ID 031 - Calendario mobile: linha `+x`

Problema:
Indicador `+x mais` ocupa espaco demais no mobile.

Objetivo:
Mostrar ate 3 eventos/itens visiveis por dia e um unico indicador compacto `+x` quando houver excedente.

Escopo:
- Mes mobile em `calendar/page.tsx`.
- Desktop pode manter texto mais descritivo se nao conflitar, mas mobile deve ser apenas `+x`.

Criterios de aceite:
- [ ] Mobile mostra ate 3 linhas visiveis por dia.
- [ ] Excedente renderiza `+1`, `+2`, `+10`, sem `mais`.
- [ ] Indicador ocupa uma unica linha compacta.
- [ ] Nao ocupa altura de dois eventos.

Riscos:
- Celulas pequenas podem nao comportar 3 eventos em todos os viewports; usar CSS responsivo com line-height baixo.

Validacao:
- Mobile 390x844 e 360x740 com dias de 0, 1, 3 e 4+ eventos.

### ID 035 - Configuracao de concluidos por pasta

Problema:
Pastas precisam escolher entre ocultar concluidos automaticamente ou manter visiveis.

Objetivo:
Persistir configuracao individual por pasta, default ocultar concluidos automaticamente.

Escopo:
- Preferencia local `folderCompletedVisibility` ou similar em `usePreferences`.
- Estado por `folderId`; pasta nova/sem chave usa default `auto-hide`.
- Aplicar ao filtro de itens da pasta.

Criterios de aceite:
- [ ] Pasta nova/sem config oculta concluidos automaticamente.
- [ ] Usuario pode manter concluidos visiveis por pasta.
- [ ] Escolha persiste ao sair e voltar.
- [ ] Config de uma pasta nao afeta outras.

Riscos:
- Se precisa sincronizar entre dispositivos, `localStorage` nao basta. Para esta rodada, preferencia de UI local e o menor caminho.

Validacao:
- Alternar pasta A para mostrar concluidos, pasta B permanece ocultando; recarregar pagina.

### ID 036 - Limpar concluidos

Problema:
Quando concluidos ficam visiveis, usuario precisa oculta-los manualmente sem apagar.

Objetivo:
Adicionar acao `Limpar concluidos` no menu de pasta quando fizer sentido.

Escopo:
- Deve atuar como limpeza de visualizacao, nao deletar/arquivar item.
- Recomendado persistir um marcador por pasta, como `folderCompletedClearedAt[folderId]`, e esconder concluidos com `updatedAt/completedAt` anterior ao marcador quando a pasta esta em modo mostrar concluidos.

Criterios de aceite:
- [ ] Acao aparece quando ha concluidos visiveis na pasta.
- [ ] Clique oculta concluidos visiveis.
- [ ] Nao apaga, arquiva nem muda status.
- [ ] Respeita configuracao da pasta.

Riscos:
- O modelo pode nao ter `completedAt`; usar `updatedAt` como fallback visual e documentar decisao.

Validacao:
- Pasta em modo mostrar concluidos: concluir item, ver item, clicar limpar, item some; alternar modo para mostrar/ocultar e recarregar.

### ID 037 - Hoje: layout dos itens

Problema:
Pontos verdes/coluna vazia atrapalham alinhamento; horario deve ocupar espaco apenas quando existe.

Objetivo:
Remover pontos verdes, alinhar tarefas sem horario mais a esquerda e reservar coluna adequada para horario quando houver.

Escopo:
- `today/page.tsx` e `today.css`.
- Manter notas, tarefas e eventos alinhados visualmente.

Criterios de aceite:
- [ ] Pontos verdes a esquerda removidos.
- [ ] Tarefa sem horario aproveita alinhamento a esquerda.
- [ ] Tarefa com horario exibe horario sem comprimir titulo.
- [ ] Desktop e mobile funcionam.

Riscos:
- Mudar grid de `.row` pode afetar event rows; usar classes condicionais (`has-time`, `no-time`, `event`).

Validacao:
- Hoje desktop/mobile com tarefa sem horario, com horario, evento e nota.

### ID 038 - Hoje: checkbox

Problema:
Checks da Hoje parecem tarefa concluida quando aberta.

Objetivo:
Voltar ao modelo: checkbox azul, fundo branco, vazio para tarefa aberta; check apenas quando concluida.

Escopo:
- Checkbox de tarefas em Hoje; preservar regra de sumir apos delay.

Criterios de aceite:
- [ ] Aberta: contorno/azul, fundo branco, vazio.
- [ ] Concluida: check aparece.
- [ ] Apos alguns segundos, tarefa concluida some conforme regra atual.
- [ ] Estado aberto nao parece concluido.

Riscos:
- O icone atual sempre desenha check; precisa render condicional.

Validacao:
- Marcar tarefa na Hoje; observar estado imediato e desaparecimento.

### ID 039 - Hoje: painel lateral direito

Problema:
Falta painel direito do layout `today-single-board-v3-standalone`.

Objetivo:
Adicionar painel lateral desktop com detalhes/acoes do item selecionado, sem quebrar mobile.

Escopo:
- Desktop: board com 3 colunas se houver espaco; painel mostra detalhes uteis do item selecionado.
- Mobile/tablet: manter drawer/selecionado atual ou esconder painel.
- Nao substituir `ItemDetail` global sem necessidade; evitar dois detalhes abertos ao mesmo tempo.

Criterios de aceite:
- [ ] Desktop mostra painel direito com item selecionado.
- [ ] Painel tem titulo, tipo/status, data/horario, prioridade/tags/pasta e acoes basicas.
- [ ] Sem item selecionado, mostra estado vazio util.
- [ ] Mobile nao quebra e nao ganha coluna extra.

Riscos:
- Conflito com `ItemDetail` global, que abre por `selectedItemId`. Implementacao deve decidir: painel inline para desktop Hoje e drawer global apenas fora dele, ou painel que usa o mesmo selectedItemId sem abrir modal.

Validacao:
- Desktop selecionar tarefa/evento/nota; mobile selecionar item.

### ID 040 - Hoje: calendario lateral funcional

Problema:
Mini calendario e nav lateral parecem decorativos/bugados.

Objetivo:
Clicar num dia deve selecionar data e carregar tarefas/eventos daquele dia; nav lateral deve funcionar ou ser removida.

Escopo:
- Adicionar `selectedDate` na Hoje.
- Filtrar agenda e itens centrais por `selectedDate`, nao somente `today`.
- Destacar dia selecionado no mini calendario.
- Fazer nav `Hoje`, `Abertos`, `Agenda`, `Tarefas`, `Atrasados` mudar modo/filtro ou remover opcoes decorativas.

Criterios de aceite:
- [ ] Clicar em dia lateral carrega lista daquele dia.
- [ ] Dia selecionado fica claro.
- [ ] Lista central reflete a data.
- [ ] Nav lateral funciona ou itens sem funcao sao removidos.
- [ ] Nao existem controles decorativos quebrados.

Riscos:
- Hoje atualmente mistura eventos hoje/amanha e foco/atrasados; separar `selectedDate` de `mode` evita regressao.

Validacao:
- Escolher hoje, amanha e outro dia com dados; testar `Abertos`, `Agenda`, `Tarefas`, `Atrasados`.

### ID 041 - Hoje: remover filtros e textos redundantes

Problema:
Toggle `Todos / Agenda / Tarefas` e textos `Agenda`/`finalizado` poluem a lista.

Objetivo:
Limpar a interface, usando icones/estado visual em vez de texto redundante.

Escopo:
- Remover toggle superior.
- Remover badge textual `Agenda` e texto `finalizado`.
- Manter icone para diferenciar evento/tarefa/nota.

Criterios de aceite:
- [ ] Toggle `Todos / Agenda / Tarefas` removido.
- [ ] Texto `Agenda` ao lado de eventos removido.
- [ ] Texto `finalizado` removido.
- [ ] Icone diferencia tipo.
- [ ] Esmaecimento indica finalizado.

Riscos:
- Sem label textual, acessibilidade precisa de `aria-label`/title nos icones.

Validacao:
- Hoje desktop/mobile com eventos passados, eventos futuros e tarefas.

### ID 042 - Busca nao abre nota

Problema:
Selecionar resultado de busca nao abre a nota correta/contextual.

Objetivo:
Ao clicar em resultado, abrir o item correto usando a rota/experiencia adequada.

Escopo:
- Topbar busca desktop/mobile.
- Para nota: navegar para `/notas/<id>?folder=<folderId>` quando houver pasta, ou abrir rota de nota sem folder quando nao houver.
- Para tarefa/outros: usar `setSingleSelection(item.id)` na tela atual ou navegar para contexto quando necessario.
- Evitar editor antigo.

Criterios de aceite:
- [ ] Resultado de nota abre nota correta.
- [ ] Se nota tem pasta, contexto da pasta e breadcrumbs ficam corretos.
- [ ] Tarefas/outros itens pesquisaveis abrem no painel/detalhe correto.
- [ ] Mobile e desktop funcionam.

Riscos:
- `SearchResults` hoje recebe so `itemId`; precisa receber o item inteiro ou callback resolver pelo array.

Validacao:
- Buscar nota em pasta, nota sem pasta, tarefa, evento/item pesquisavel se existir.

### ID 043 - Destacar notas

Problema:
So pastas podem ser destacadas; notas tambem precisam destaque.

Objetivo:
Permitir destacar/remover destaque de notas e exibi-las em area de destacados sem confundir com pastas.

Escopo:
- Preferencia leve `pinnedNoteIds` em `usePreferences`.
- Acoes no menu de item/nota e editor.
- Secao `Destacadas` em Pastas separando `Pastas` e `Notas`, ou labels claros.

Criterios de aceite:
- [ ] Nota pode ser destacada.
- [ ] Nota destacada aparece na area de destacados.
- [ ] Acesso rapido abre a nota.
- [ ] Existe acao para remover destaque.
- [ ] Nota destacada nao parece pasta destacada.

Riscos:
- Reusar `priority === 1` como favorito conflita com prioridade; usar `pinnedNoteIds`.

Validacao:
- Destacar/remover nota pela lista/menu/editor; recarregar; clicar atalho.

### ID 044 - Fundo da pagina Pastas

Problema:
Pastas destoa do padrao esbranquicado.

Objetivo:
Garantir fundo esbranquicado consistente com cards/paineis do app.

Escopo:
- Container de `/notas`; evitar transparencias excessivas que deixem wallpaper/gradiente dominante.

Criterios de aceite:
- [ ] Fundo geral de Pastas e esbranquicado.
- [ ] Nao parece transparente nem destoante.
- [ ] Cards/painels mantem contraste suave.
- [ ] Desktop e mobile validados.

Riscos:
- Aplicar fundo em container errado pode criar faixas/brancos duplos.

Validacao:
- `/notas` raiz, pasta selecionada, drawer mobile.

### ID 045 - Reorganizar pastas destacadas

Problema:
Usuario precisa ordenar manualmente pastas destacadas.

Objetivo:
Permitir alterar ordem de `pinnedFolderIds` sem afetar ordenacao normal.

Escopo:
- Persistencia ja e a propria ordem de `prefs.pinnedFolderIds`.
- Mecanismo recomendado: botoes mover para cima/baixo no menu de pasta e, se simples, drag handle na secao destacadas desktop/mobile.

Criterios de aceite:
- [ ] Usuario altera ordem das pastas destacadas.
- [ ] Ordem persiste.
- [ ] Funciona em desktop e mobile.
- [ ] Nao altera ordem das pastas normais.

Riscos:
- Drag and drop pode aumentar escopo; botoes mover sao mais seguros para esta rodada.

Validacao:
- Com 3 pastas destacadas, mover primeira/ultima/meio, recarregar.

### ID 046 - Logo na edicao de nota vai para Hoje

Problema:
No editor de nota, logo deve ser atalho para home/Hoje.

Objetivo:
Clique no logo dentro da edicao navega para `/today`.

Escopo:
- `apps/web/src/app/(app)/notas/[id]/page.tsx`, areas de logo no editor/sidebar/topbar local.
- Preservar autosave antes de sair; se houver timer pendente, forcar persistencia ou aguardar fluxo seguro.

Criterios de aceite:
- [ ] Clique no logo no editor navega para `/today`.
- [ ] Alteracoes nao salvas nao sao perdidas no fluxo existente.
- [ ] Navegacao normal do editor continua.

Riscos:
- Ha autosave debounce de 600ms; navegar imediatamente pode descartar texto recente se componente desmontar antes de persistir.

Validacao:
- Editar texto, clicar logo imediatamente, voltar a nota e conferir conteudo.

## Agrupamento recomendado

Pagina Hoje:
- IDs 037, 038, 039, 040, 041, parte do 009.

Pastas/Notas:
- IDs 023, 025, 035, 036, 043, 044, 045, 046, parte do 009.

Calendario:
- IDs 022, 031.

Modais/Criacao:
- IDs 028, 030.

Busca/Navegacao:
- ID 042, ID 046.

## Implementation plan

- [ ] 1. Base de preferencias: adicionar chaves em `usePreferences` para `folderCompletedVisibility`, `folderCompletedClearedAt`, `pinnedNoteIds` e manter ordem de `pinnedFolderIds`.
- [ ] 2. Pastas/Notas: aplicar filtro de concluidos, `Limpar concluidos`, menu unico, checkbox de tarefas, notas destacadas, reorganizacao de destacadas e fundo.
- [ ] 3. Hoje: corrigir layout/checkbox, remover filtros/textos, implementar `selectedDate`/nav lateral e painel direito.
- [ ] 4. Calendario: ajustar fullscreen desktop e `+x` mobile.
- [ ] 5. Modais: padronizar overlay/backdrop e aba Evento.
- [ ] 6. Busca/Navegacao/long press: corrigir busca, logo para Hoje e endurecer long press/selection.
- [ ] 7. Validacao: type-check, lint, build, navegador local desktop/mobile, screenshots no projeto e copia em `G:\Meu Drive\.agentes`.

## Decisions

- Decision: usar `usePreferences` para preferencias leves desta rodada.
  Reason: ja existe localStorage para UI (`pinnedFolderIds`, `folderSort`), evita schema/API e atende persistencia local pedida.
  ADR needed: no

- Decision: `Limpar concluidos` deve ocultar da visualizacao, nao alterar status/arquivo.
  Reason: criterio explicito; usar marcador visual por pasta e filtro.
  ADR needed: no

- Decision: notas destacadas devem usar `pinnedNoteIds`, nao prioridade.
  Reason: prioridade semantica nao e favorito; evita confundir nota destacada com prioridade alta.
  ADR needed: no

- Decision: para ID 045, priorizar botoes mover acima/baixo em vez de drag-only.
  Reason: menor risco, funciona em desktop/mobile e acessibilidade; drag pode ser follow-up se desejado.
  ADR needed: no

## Files changed

- `specs/2026-05-29-planejar-ajustes-ativos-ui.md` - living spec de planejamento e handoff.

## Validation

Commands run:

- [x] Context reads only: `Get-Content`/`rg` em docs, specs e arquivos relevantes.
- [ ] `pnpm --filter @doit/web exec tsc --noEmit` - skipped; sem codigo de produto alterado.
- [ ] `pnpm --filter @doit/web lint` - skipped; sem codigo de produto alterado.
- [ ] `pnpm --filter @doit/web build` - skipped; sem codigo de produto alterado.

Frontend evidence:

- Skipped nesta etapa, porque o usuario pediu planejamento sem implementacao. A implementacao deve gerar screenshots em `specs/artifacts/2026-05-29-planejar-ajustes-ativos-ui/` ou em nova spec de execucao, e copiar os prints para `G:\Meu Drive\.agentes`.

## Risks

- Risk: A rodada e grande e cruza Hoje, Pastas, Calendario, Modais e Busca.
  Mitigation: implementar na ordem recomendada, validando por frente tecnica.

- Risk: Preferencias em localStorage nao sincronizam entre dispositivos.
  Mitigation: aceitar como preferencia local nesta rodada; se o usuario pedir sincronizacao, tratar como mudanca de modelo/API separada.

- Risk: Hoje pode conflitar painel inline com `ItemDetail` global.
  Mitigation: definir um comportamento unico para `/today` desktop antes de codar: painel inline usa `selectedItemId`, drawer global nao deve cobrir o painel nessa rota.

- Risk: bloqueio de selecao no mobile pode afetar editor/campos.
  Mitigation: escopar CSS a containers de lista/card e excluir `[contenteditable]`, `.ProseMirror`, `input`, `textarea`, modais e editor.

## Checklist final de validacao

Desktop:
- [ ] Hoje 1440x900: sem toggle redundante, sem textos `Agenda`/`finalizado`, checkbox correto, painel direito, calendario lateral funcional.
- [ ] Hoje: clicar dias diferentes muda lista central e destaque.
- [ ] Pastas: menu unico, checkbox correto em lista/cards/kanban, concluidos por pasta, limpar concluidos, destacadas ordenaveis.
- [ ] Calendario fullscreen: dias com muitos eventos sem truncamento/sobreposicao.
- [ ] Busca: nota abre rota/editor correto com pasta.
- [ ] Modais: overlay consistente e aba Evento legivel.

Mobile:
- [ ] Hoje 390x844: long press abre menu sem selecao de texto; toque simples abre item; layout sem horario alinhado.
- [ ] Pastas mobile: long press nota/tarefa, menu unico, drawer sem scroll duplo, selecao em inputs/editor preservada.
- [ ] Calendario mobile: ate 3 eventos e `+x` compacto sem `mais`.
- [ ] Quick add/mobile modal: aba Evento consistente.

Regressao geral:
- [ ] Criar tarefa, nota e evento.
- [ ] Abrir/editar nota e navegar pelo logo para `/today` sem perder autosave.
- [ ] Concluir tarefa e observar desaparecimento conforme regra atual.
- [ ] Recarregar app e confirmar persistencias de pasta/destaques/ordem.
- [ ] Type-check, lint e build.
- [ ] Screenshots salvos no projeto e copiados para `G:\Meu Drive\.agentes`.

## Next step

Enviar o prompt de execucao para o Antigravity CLI implementar a rodada, usando BuilderFlow e atualizando esta spec ou criando uma spec de execucao unica se preferir manter planejamento separado.
