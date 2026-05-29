# Menu de contexto de pastas (botão direito desktop / toque longo mobile)

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Adicionar um menu de ações para pastas, aberto por **clique direito (desktop)** e **toque longo
(mobile)**, conforme `docs/doitmd-layout-codex-package/desktop/menu-pasta.html`. Vale para os cards
de pasta (grade raiz + seção Subpastas) e para a árvore do navegador (sidebar desktop + drawer mobile).

## Context

`/notas` (`app/(app)/notas/page.tsx`) lista pastas como `RootFolderCard` (grade) e `TreeRow`
(árvore). Já existem `createFolder`, `updateFolder({name|parentId|viewMode})`, `deleteFolder`
(cascateia subpastas e desvincula itens → `folderId:null`) em `hooks/use-folders.ts`, e favoritos via
`usePreferences().prefs.pinnedFolderIds`. O padrão de menu de item (`components/items/bulk-actions.tsx`
`ItemContextMenu`) usa overlay fixo no desktop e action sheet no mobile, com guarda anti-fechamento
por toque longo — vou espelhar esse padrão para pastas. `useLongPress` (toque longo + clique direito)
e `useEscapeClose` já existem.

## Scope

- [ ] Componente `FolderMenu` (desktop: posicionado no cursor; mobile: action sheet) seguindo o mockup.
- [ ] Ações: Abrir, Favoritar, Subpasta (quick); Visualização (Lista/Kanban), Renomear, Mover, Editar AGENTS.md, Copiar link; Excluir pasta (danger, com confirmação).
- [ ] Abertura por `onContextMenu` (desktop) e toque longo (mobile) em `RootFolderCard` e `TreeRow`.
- [ ] Esc fecha o menu; toque simples continua abrindo a pasta; scroll não conflita.

## Out of scope

- Reordenar pastas por drag; exportar/duplicar estrutura (o mockup tira do menu principal).
- Menu de contexto em colunas do kanban (fora de "pastas").
- API/schema (operações já existem).

## Grill Gate

Decision: not_needed

Reason: mockup explícito e todas as operações já existem. "Excluir" é destrutiva (cascata) → uso de
confirmação com aviso. "Mover" usa submenu com as pastas + "Raiz". Inferível.

## Decisões técnicas

- Estado local em `NotasBrowser`: `folderMenu: { folderId, x, y } | null`; submenu interno `'move' | 'view' | null`.
- `FolderMenu` em escopo de módulo (props), espelhando layout/posicionamento de `ItemContextMenu`.
- Unificar abertura de AGENTS.md em `agentsForId: string | null` (header + menu usam o mesmo modal).
- `useLongPress` dentro de `RootFolderCard`/`TreeRow`; `consumeClick()` evita abrir a pasta após toque longo.
- Excluir: `confirm()` avisando que subpastas são removidas e itens ficam sem pasta.

## Acceptance criteria

- [ ] Clique direito numa pasta (card ou árvore) abre o menu no cursor (desktop).
- [ ] Toque longo numa pasta abre o action sheet (mobile); toque simples abre a pasta.
- [ ] Ações funcionam: abrir, favoritar/desfavoritar, nova subpasta, alternar Lista/Kanban, renomear, mover (inclui Raiz), editar AGENTS.md, copiar link, excluir (com confirmação).
- [ ] Esc fecha o menu; sem regressão no painel/árvore desktop.

## Implementation plan

- [ ] `FolderMenu` (módulo) + ícones do mockup.
- [ ] Estado + handlers parametrizados por `folderId` em `NotasBrowser`.
- [ ] `onMenu` em `RootFolderCard` e `TreeRow` (contextmenu + long press).
- [ ] Unificar `agentsForId`.
- [ ] Validação: type-check, lint, build, Playwright + screenshots; commit/push em `dev`.

## Progress

- 2026-05-29 — Mockup e operações de pasta analisados; spec criada.

## Files changed

- `app/(app)/notas/page.tsx` — componente `FolderMenu` (+ `FolderMenuRow`); estado `folderMenu`/`agentsForId`; handlers parametrizados (`togglePinnedFor`, `newSubfolderFor`, `renameFolder`, `moveFolder`, `copyFolderLink`, `deleteFolderWithConfirm`); `onMenu` em `TreeRow` e `RootFolderCard` (contextmenu desktop + long press mobile); AGENTS.md unificado em `agentsForId`.

## Validation

- [x] `tsc --noEmit` — passou.
- [x] `lint` — só warnings pré-existentes.
- [x] `build` — `✓ Compiled` + SSG 21/21 (falha só no copy `output: standalone`, EPERM Windows/OneDrive, não relacionado).
- Playwright `specs/validate-menu-pastas.mjs` — **9/9 OK** (desktop 1440×900 + mobile 390×844):
  clique direito abre menu; todas as ações do mockup presentes; submenu "Mover" com "Raiz"; Esc fecha;
  Favoritar cria seção "Destacadas"; Renomear abre prompt e aplica; toque longo abre action sheet; toque simples abre a pasta.
- Screenshots em `specs/artifacts/2026-05-29-menu-contexto-pastas/`: `01-desktop-menu-pasta.png`, `02-desktop-mover-submenu.png`, `03-mobile-sheet-pasta.png`.
- Servidor de dev encerrado (porta 3000 liberada).

## Risks

- Risk: toque longo conflitar com scroll/abrir pasta.
  Mitigation: `useLongPress` cancela em movimento >10px e `consumeClick` suprime o clique-fantasma.
- Risk: excluir é destrutivo (cascata).
  Mitigation: confirmação explícita com aviso.

## Next step

Implementar e validar; integrar na `dev`.
