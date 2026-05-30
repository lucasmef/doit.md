# Ajustes adição rápida, pastas, menu contexto e inventário de modais (IDs 065–072)

## Metadata

- Status: review
- Mode: bugfix (065–071) + research/inventory (072)
- Complexity: high
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Corrigir 7 itens pontuais de UX (adição rápida com contexto de pasta/dia, botão
Adicionar em lista, interpretação de hora, data automática, default tarefa no
Kanban, mover pasta no menu do cabeçalho, remover data no menu de contexto) e
entregar um inventário completo dos modais do app com prints e recomendação de
padronização (ID 072). Sem refatoração ampla; preservar comportamento OK.

## Context

- `quick-capture.tsx` concentra os IDs 065/067/068/069. Já deriva pasta de
  `quickCaptureFolderId` e data de `isTodayContext` (`pathname === '/today'`),
  mas **não** lê a pasta de `/notas?folder=<id>` (search param) nem a data de um
  dia aberto no calendário (`openCapture(mode, date)` ignora `date` fora de evento).
- `TIME_SHORTCUT` (linha 30) deixa o indicador de hora **opcional**, então `8`
  vira 08:00 (bug do 067).
- Página `/notas` (`notas/page.tsx`): botão "+ Adicionar" só no Kanban e no mobile
  da lista (`lg:hidden`); `handleNewItem` abre `openCapture('note')` (bug do 069).
- `FolderMenu` (long-press/clique direito) **já** tem "Mover" com submenu que
  exclui a própria pasta e descendentes. O menu **kebab do cabeçalho** (o "menu de
  ações da pasta" mais visível) **não** tem Mover (gap do 070).
- `ItemContextMenu` (`bulk-actions.tsx`) **já** tem "Remover data" (`setDate(null)`)
  quando o item tem `dueDate` — ID 071 já entregue; só falta clareza de ícone.

## Scope

- [x] 065 — adição rápida usa pasta/dia aberto como contexto.
- [x] 066 — botão Adicionar visível em modo lista (desktop) nas pastas.
- [x] 067 — hora só em `xh`, `xh00`, `xx:xx`.
- [x] 068 — fora de contexto de data, não aplicar hoje automaticamente.
- [x] 069 — adição rápida na pasta/Kanban cria tarefa por padrão.
- [x] 070 — "Mover pasta" no menu kebab do cabeçalho (reusa fluxo seguro existente).
- [x] 071 — confirmar "Remover data" e melhorar ícone.
- [x] 072 — inventário de modais + prints + recomendação.

## Out of scope

- Consolidação/remoção de modais (072 entrega só recomendação).
- Refatoração de parsing de linguagem natural além do regex de hora.
- Alterar persistência/SqlModel.

## Grill Gate

Decision: not_needed

Reason: Critérios objetivos e inferíveis do código. Decisões de produto
(default tarefa em pasta; Mover no kebab) estão explícitas nos próprios IDs.

## Acceptance criteria

- [ ] Abrir adição rápida dentro de `/notas?folder=X` pré-seleciona a pasta X.
- [ ] Abrir adição rápida em dia do calendário usa aquele dia; em `/today` usa hoje.
- [ ] Fora de tela com data, item criado sem `dueDate`.
- [ ] `8`/`123` não viram horário; `8h`, `8h00`, `08:30` viram.
- [ ] Botão Adicionar aparece em lista no desktop e cria na pasta atual.
- [ ] Kanban/lista criam tarefa por padrão (nota só ao trocar tipo).
- [ ] Kebab do cabeçalho tem "Mover pasta"; não permite destino = própria/descendente.
- [ ] Menu de contexto do item com data mostra "Remover data" e remove ao clicar.
- [ ] Inventário + prints + recomendação entregues (072).

## Implementation plan

- [x] 067: endurecer `TIME_SHORTCUT`.
- [x] 065/068: `quickCaptureDate` no UIContext + leitura de pasta da URL no open.
- [x] 069: `handleNewItem` → `openCapture('task')`.
- [x] 066: remover `lg:hidden` do botão da lista e padronizar rótulo.
- [x] 070: `initialSub` no `FolderMenu` + item "Mover pasta" no kebab.
- [x] 071: ícone "calendário com ×" para Remover data.
- [ ] Gates: type-check, lint, build.
- [ ] Prints (e2e Playwright desktop+mobile) e inventário 072.

## Progress

- 2026-05-30 - Contexto lido (AGENTS/CONTEXT/ADR + specs). Mapeado código dos 8 IDs.
- 2026-05-30 - Constatado que 071 já existe e 070 existe no menu de contexto.

## Decisions

- Decision: adição rápida em pasta/Kanban passa a criar **tarefa** por padrão.
  Reason: pedido explícito do ID 069; nota continua acessível pelas abas de modo.
  ADR needed: no
- Decision: "Mover pasta" no kebab reaproveita o `FolderMenu` em modo `move`
  (já valida ciclos), em vez de duplicar a lógica.
  Reason: menor superfície de bug; mantém uma única fonte de verdade. ADR: no

## Files changed

- `apps/web/src/components/items/quick-capture.tsx` — 067 regex de hora estrita;
  065/068 contexto de data/pasta no efeito de abertura + `currentFolderFromUrl`.
- `apps/web/src/store/ui.ts` — campo `quickCaptureDate` no contexto.
- `apps/web/src/store/ui-provider.tsx` — estado e set de `quickCaptureDate`;
  `openCapture` grava a data para modos tarefa/nota.
- `apps/web/src/app/(app)/notas/page.tsx` — 069 `handleNewItem` abre tarefa;
  066 botão "+ Adicionar" também no desktop em lista; 070 `initialSub` no
  `FolderMenu` + item "Mover pasta" no kebab do cabeçalho.
- `apps/web/src/components/items/bulk-actions.tsx` — 071 ícone `IconCalendarOff`
  no "Remover data" (remoção do `IconCalendar` órfão).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` — passou.
- [x] `pnpm --filter @doit/web lint` — passou (apenas warnings pré-existentes).
- [~] `pnpm --filter @doit/web build` — **compila OK**; falha só no passo final de
  cópia do output `standalone` (EPERM ao criar symlink no Windows/OneDrive),
  ambiente-específico e não relacionado às mudanças. CI roda em Linux.

Frontend evidence (Playwright desktop 1440×1100 + mobile Pixel 5):

- `specs/artifacts/2026-05-30-quickadd-pastas-modais-065-072/` (19 prints).
- Confirmados: quick add na pasta abre **Tarefa** com pasta pré-selecionada
  (065+069), botão "+ Adicionar" na lista (066), "Mover pasta" no kebab +
  submenu de destino sem a própria pasta (070), "Remover data" com ícone
  calendário-× (071), nota/evento/atalhos/prompt de pasta (072).
- Servidor: `next dev -p 3100` gerido pelo Playwright (subiu/encerrou sozinho).

## Risks

- Risk: `quickCaptureDate` pode reter valor entre aberturas.
  Mitigation: limpar no fechamento do modal (mesmo padrão de `quickCaptureFolderId`).
- Risk: tornar hora estrita pode parar de reconhecer "às 8".
  Mitigation: aceitável — IDs limitam aos formatos `xh/xh00/xx:xx`.

## Inventário de modais (ID 072)

| Modal | Componente | Rota origem | Padrão visual | Comportamento |
|---|---|---|---|---|
| Adição rápida tarefa | `quick-capture.tsx` | global (q/FAB) | bottom-sheet vidro (mobile) / card central (desktop) | abas Tarefa·Nota·Evento; cria e continua |
| Adição rápida nota | `quick-capture.tsx` | global (w) | igual; nota vira tela cheia | editor markdown |
| Edição tarefa/nota | `quick-capture.tsx` (editMode) | menu item / clique | card central com checkbox concluir | reaproveita o mesmo modal |
| Criar evento | `calendar-event-capture.tsx` | calendário (e) | card central vidro | abas de modo; data/hora/calendário |
| Editar evento | `calendar-event-capture.tsx` | clique no evento | igual ao criar | preenche e atualiza |
| Confirm/Prompt | `dialog.tsx` (`useDialog`) | global | card pequeno vidro, 2 botões | confirm/prompt/danger |
| Menu contexto item | `bulk-actions.tsx` `ItemContextMenu` | clique direito / long-press | popover desktop / bottom-sheet mobile | data, pasta, prioridade, remover data, excluir |
| Menu pasta | `notas/page.tsx` `FolderMenu` | clique direito / long-press | popover / bottom-sheet | abrir, favoritar, mover, renomear, excluir |
| Menu kebab pasta | `notas/page.tsx` (header) | botão ⋮ | dropdown | favoritar, ocultar, mover, nova (sub)pasta, AGENTS, excluir |
| Editor AGENTS.md | `agents-editor-modal.tsx` | menu pasta | modal grande | textarea markdown |
| Atalhos | `shortcut-help-modal.tsx` | `?` | card central | lista de teclas |
| Detalhe do item | `item-detail.tsx` | seleção de item | painel lateral/modal | visual/edição do item |

### Recomendação de padronização (072)

- **Criação rápida + criação completa + edição**: manter **um único** componente
  (`quick-capture.tsx`) que já cobre os 3 (compacto mobile, completo desktop,
  edição). É a base correta — consolidar tudo de tarefa/nota aqui.
- **Evento**: manter `calendar-event-capture.tsx` separado (campos próprios de
  data/hora/calendário), mas alinhar o **shell visual** ao do `quick-capture`
  (mesma moldura/sheet) para consistência.
- **Confirmação/prompt**: padrão único `dialog.tsx` — manter, é o modelo certo.
- **Menus de contexto** (item e pasta): manter os dois `ItemContextMenu` e
  `FolderMenu` (escopos distintos), ambos já com o padrão sheet-mobile/popover-desktop.
- **Mobile compacto**: necessário — manter o sheet compacto do `quick-capture`.
- **Candidatos a consolidar/avaliar**: `item-detail.tsx` vs edição via
  `quick-capture` (há sobreposição de edição); padronizar a moldura de
  `agents-editor-modal` e `shortcut-help-modal` com o shell comum. **Sem remoção
  agora** — recomendação para tarefa futura dedicada.

## Next step

Revisão manual dos 19 prints e decisão sobre consolidação de modais (072,
proposta acima). Commit/push na branch `dev` após revisão.
