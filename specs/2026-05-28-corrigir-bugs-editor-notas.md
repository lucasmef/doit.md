# Corrigir bugs do editor de notas

## Metadata

- Status: review
- Mode: bugfix
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Corrigir quatro erros reportados pelo usuario no editor imersivo de notas (`/notas/[id]`), aproximando o comportamento do esperado sem alterar o modelo de dados nem o autosave.

## Context

O editor imersivo vive em `apps/web/src/app/(app)/notas/[id]/page.tsx` (shell de 3 colunas: `Sidebar` | `main` editor | `OutlineRail`) e usa `components/items/markdown-editor.tsx` (variante `sheet`) com handles de reordenacao de `components/items/block-reorder-extension.ts`. Estilos do handle e da prose em `apps/web/src/app/globals.css`.

Bugs reportados:

1. A seta `<` (no topo da sidebar) navega para `/notas` em vez de recolher o menu da esquerda.
2. O botao `…` (no topbar do editor) arquiva a nota direto, em vez de abrir um menu de acoes.
3. O conteudo do editor aparece centralizado (coluna `mx-auto`), quando deveria ficar alinhado a esquerda.
4. Os handles de arrastar linhas (`.doit-block-handle`) ficam truncados/sobrepostos ao texto na variante `sheet` (prose com `px-0`, handle em `left:0.25rem`).

Observacao: o mockup `desktop/06-editor-toolbar.html` rotula a `<` como "Back to notes" e tambem centraliza a coluna (`.ed-col { margin: 0 auto }`). O usuario, como dono do produto, pediu comportamento diferente; a navegacao para a biblioteca continua disponivel pelo breadcrumb `notas` e pela busca da sidebar.

## Scope

- [x] `<` recolhe/expande a sidebar esquerda em vez de navegar.
- [x] `…` abre um menu de acoes (Imprimir, Arquivar nota) em vez de arquivar direto.
- [x] Coluna do editor alinhada a esquerda.
- [x] Handles de arrastar com gutter, sem cobrir o texto.

## Out of scope

- Alterar schema, sync, audit ou autosave.
- Redesenhar a sidebar/rail alem do colapso.
- Mexer no editor modal (`item-detail.tsx`) fora do necessario.

## Grill Gate

Decision: not_needed

Reason:
O usuario reportou os quatro bugs com o comportamento esperado explicito. Sao correcoes de UI locais, reversiveis e verificaveis. A unica divergencia do mockup (bug 1 e 3) foi resolvida a favor da instrucao direta do usuario, preservando navegacao alternativa.

## Acceptance criteria

- [x] Clicar `<` recolhe a sidebar; ha como reexpandir; nao navega para fora.
- [x] Clicar `…` abre um menu; arquivar exige acao explicita no menu.
- [x] Texto/titulo do editor alinhados a esquerda.
- [x] Handle de arrastar visivel a esquerda do texto, sem truncar.
- [x] `pnpm --filter @doit/web type-check` passa.
- [x] Validacao no navegador com screenshots.

## Implementation plan

- [x] Bug 1: estado `sidebarCollapsed` no `NoteEditorPage`; `<` na sidebar chama `onCollapse`; grid vira `lg:grid-cols-[1fr_280px]` e a sidebar nao e renderizada; botao `>` "Expandir menu" aparece no topbar do editor.
- [x] Bug 2: `…` virou dropdown (`role="menu"`) com "Imprimir" e "Arquivar nota"; backdrop fixo fecha ao clicar fora.
- [x] Bug 3: removido `mx-auto` da coluna do editor (`w-full max-w-[760px] ...`).
- [x] Bug 4: regra escopada `.doit-note-sheet-prose .doit-block-handle { left: -1.5rem }` em globals.css.
- [x] Validacao: type-check + navegador + screenshots.

## Files changed

- `apps/web/src/app/(app)/notas/[id]/page.tsx` - `<` recolhe sidebar (estado + render condicional + grid), `…` vira dropdown, coluna alinhada a esquerda, botao expandir no topbar.
- `apps/web/src/app/globals.css` - gutter do handle de reordenacao na variante sheet.

## Progress

- 2026-05-28 - Investigados `notas/[id]/page.tsx`, `markdown-editor.tsx`, `block-reorder-extension.ts`, `globals.css` e o mockup `06-editor-toolbar.html`. Causas confirmadas para os 4 bugs.
- 2026-05-28 - Implementadas as 4 correcoes. Type-check web passou.
- 2026-05-28 - Validacao Playwright no servidor dev ja ativo em 127.0.0.1:3000 (nao iniciado pelo agente): signup QA, login, seed de nota via `/api/items`, abertura do editor. Resultados: `textAlign=start`; handle em `deltaToText=-24px` (borda direita 349 < texto 353, sem sobreposicao); `…` abre `role=menu` e a nota permaneceu `inbox` (nao arquivada); `<` recolhe a sidebar (expandVisible=true, sidebarGone=true) e `>` reexpande. Sem erros de console/page. Script temporario removido apos execucao.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` - passou.
- [x] Playwright via `node` (NODE_PATH=apps/web/node_modules) contra servidor dev em 127.0.0.1:3000 - passou, sem erros.

Frontend evidence:

- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/01-editor-default-desktop.png` - editor com texto alinhado a esquerda.
- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/02-editor-menu-open.png` - menu `…` aberto (Imprimir / Arquivar nota).
- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/03-editor-sidebar-collapsed.png` - sidebar recolhida com botao expandir.
- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/04-editor-handle-hover.png` - handle de arrastar no gutter, sem cobrir o texto.

Server note: o servidor dev ja estava rodando em 127.0.0.1:3000 e nao foi iniciado pelo agente; permanece ativo (nada para encerrar).

## Risks

- Risk: em larguras pequenas de desktop (variante sheet com `px-6`), o handle a `-1.5rem` fica proximo da borda esquerda do card.
  Mitigation: em telas de toque o handle ja fica oculto (`@media (hover: none)`); no desktop largo (`lg:px-16`) ha folga suficiente.

## Segunda rodada (refinamentos do editor)

Feedback adicional do usuario, todos aplicados em `notas/[id]/page.tsx`:

- [x] Remover o campo de "titulo" separado na edicao. O titulo continua existindo tecnicamente como a primeira linha do Markdown; a PATCH `/api/items/[id]` ja re-deriva `title` de `contentMd` para notas, entao o autosave de conteudo mantem o titulo em sincronia. Removidos estado/handlers de titulo (`localTitle`, `onTitleChange`, `titleInputRef`, `autosizeTitle`).
- [x] Remover o icone grande "M↓" no topo do corpo do editor.
- [x] Corrigir os botoes do topbar: agora sao `Imprimir` (window.print) e `Baixar` (download da nota em `.md`). Removidos os antigos `export`/`share` (copiar link). `Imprimir` saiu do menu `…`, que agora tem so `Arquivar nota`.
- [x] Notas nao mostram mais `status` nas propriedades (removido o campo; `EDITABLE_STATUSES`/`ItemStatus` eliminados).
- [x] Selecao de pasta exibe as pastas aninhadas (helper `flattenFolderOptions` + indentacao `↳` por profundidade).

### Validacao da segunda rodada

- `pnpm --filter @doit/web type-check` - passou.
- `next lint` no arquivo - apenas warnings pre-existentes (`<img>` do logo, exhaustive-deps), sem novos erros.
- Playwright no servidor dev em 127.0.0.1:3000 (signup, seed de pastas aninhadas Trabalho>Sprints e nota): `titleFieldCount=0`, `bigMBadge=false`, `hasImprimir=1`, `hasBaixar=1`, `hasExport=0`, `hasShare=0`, `statusLabelCount=0`, `folderOptions=["inbox","Trabalho","  ↳ Sprints"]`, download = `layout-qa.md`. Sem erros de console/page. Script temporario removido.

Frontend evidence (segunda rodada):

- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/05-editor-no-title-badge.png` - editor sem titulo separado e sem badge M↓, com botoes Imprimir/Baixar e propriedades sem status.
- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/06-folder-nested-select.png` - selecao de pasta aninhada (Sprints sob Trabalho).

## Terceira rodada (modo foco)

O trio `edit/preview/split` no canto direito da toolbar do editor era decorativo (sem handler) e nao faz sentido num editor WYSIWYG. Substituido por um toggle de **Modo foco**:

- [x] Botao `Foco` / `Sair do foco` no canto direito da toolbar (`markdown-editor.tsx`, variante sheet).
- [x] No modo foco, a pagina esconde a Sidebar e a OutlineRail e o editor ocupa a largura toda (`focusMode` em `notas/[id]/page.tsx`; grid vira `lg:grid-cols-1`).
- [x] `Esc` sai do modo foco.
- [x] Topbar (breadcrumb, saved, Imprimir, Baixar, `…`) permanece, para nao perder as acoes do documento.
- [x] Corrigido risco de portal orfao: o host de anexos (`#note-editor-attachments`) vive na rail; ao alternar foco a rail desmonta/remonta. Adicionado `focusMode` as deps do efeito que resolve o host em `markdown-editor.tsx`, garantindo que o painel de anexos volte ao sair do foco.

### Validacao da terceira rodada

- `pnpm --filter @doit/web type-check` - passou.
- `next lint` em `notas/[id]/page.tsx` e `markdown-editor.tsx` - apenas warnings pre-existentes, sem novos erros.
- Servidor dev do usuario havia parado; iniciei um temporario `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000` so para validar e encerrei ao final (porta 3000 sem listener).
- Playwright: `focoButton=1`; antes `sidebar=1, rail=1, attachBtn=1`; no foco `sidebar=0, rail=0, exitBtn=1, editorWidth=1440`; apos `Esc` `sidebar=1, rail=1, attachBtn=1` (anexos voltaram - fix do portal confirmado). Sem erros de console/page. Script temporario removido.

Frontend evidence (terceira rodada):

- `specs/artifacts/2026-05-28-corrigir-bugs-editor-notas/07-editor-focus-mode.png` - editor em modo foco (sidebar/rail ocultas, botao "Sair do foco").

## Quarta rodada (reverter `<` para navegacao)

O usuario reconsiderou: o botao `<` deve voltar para a biblioteca (igual antes), nao recolher o menu. Como o colapso so tinha esse gatilho, removi a feature inteira:

- [x] `<` voltou a ser `<Link href="/notas">` ("Voltar para biblioteca").
- [x] Removidos estado `sidebarCollapsed`, prop `onCollapse` da `Sidebar`, o grid de colapso e o botao `>` "Expandir menu" do topbar (`onExpandSidebar`).
- [x] Modo foco mantido e simplificado: grid `focusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[260px_1fr_280px]'`.

Nota: o mockup `06-editor-toolbar.html` rotula a `<` como "Back to notes", entao o comportamento agora bate com o mockup tambem.

### Validacao da quarta rodada

- `pnpm --filter @doit/web type-check` - passou (inclui edicao externa concorrente que extraiu backlinks para `@/lib/note-relations`).
- `next lint` em `notas/[id]/page.tsx` - apenas warnings pre-existentes.
- Playwright (servidor dev temporario): `recolherCount=0`, `expandirCount=0`, `backHref=/notas`; modo foco segue ocultando sidebar+rail sem botao de expandir. Confirmado tambem que `/notas` so e protegida por auth (redireciona para `/sign-in?callbackUrl=/notas`), ou seja, nao auto-redireciona para uma nota - logo o `<` leva a biblioteca e permanece la.
- Observacao: a re-validacao final de login no servidor dev de longa duracao ficou intermitente (SQLite/OneDrive sob carga: register retorna 201 mas a sessao as vezes nao firma). E flakiness de ambiente, nao da mudanca; o comportamento foi confirmado por codigo + guarda de auth da rota `/notas`. Servidor temporario encerrado (porta 3000 livre).

Nota: o screenshot `03-editor-sidebar-collapsed.png` ficou obsoleto (a feature de colapso foi removida nesta rodada).

## Next step

Revisar o diff local.
