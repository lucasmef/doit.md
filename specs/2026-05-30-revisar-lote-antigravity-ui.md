# Revisão do lote de ajustes enviados ao Antigravity CLI (UI/Pastas/Calendário)

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Validar o estado atual de 10 ajustes (IDs 028, 030, 031, 035, 036, 043, 044, 045,
046, 047) enviados ao Antigravity CLI. Não reimplementar o que já está correto;
corrigir apenas o que estiver parcial/incorreto. Preservar desktop e mobile e o
padrão visual (fundo esbranquiçado, cards suaves, overlay leve).

## Context

Auditoria do código-fonte atual (HEAD `396e0d9`). Todos os fluxos de modais,
calendário e pastas/notas já passaram por commits anteriores de UI
("reajustes v3", "ID 005 a 027", consolidação de /pastas). A revisão confirma o
estado de cada item antes de qualquer alteração.

## Scope

- [x] Validar cada um dos 10 itens contra seus critérios.
- [x] Corrigir somente itens parciais/incorretos.
- [x] Rodar checks disponíveis.
- [x] Registrar evidência visual dos itens visuais.

## Out of scope

- Refatoração ampla fora do escopo dos 10 itens.
- Mudança de schema/data model.
- Reabrir itens já confirmados OK pelo usuário.

## Grill Gate

Decision: not_needed

Reason:
A tarefa é de validação. Cada item tem critérios objetivos no próprio pedido e
foi verificável no código. O único ponto ambíguo (036, destino dos concluídos
ao "Limpar") foi resolvido pela regra do próprio usuário: "se atende os critérios
declarados, não alterar". A implementação atende os critérios literais, então não
é alterada — apenas registrada como ponto de revisão manual.

## Achados por item (validação)

- **ID 028 — Modais/blur/overlay:** OK. Todos os overlays usam o mesmo padrão
  `bg-navy-900/35 backdrop-blur-[2px]` (overlay leve e consistente): `dialog.tsx`,
  `quick-capture`, `calendar-event-capture`, `calendar-board` (3x), `item-detail`
  (2x), `agents-editor-modal`, `shortcut-help-modal`, `calendar/page`,
  `notas/page` (drawer mobile), `topbar` (menu mobile). O blur forte
  (`backdrop-blur-xl/2xl`) é só nos cards/superfícies (glassmorphism), não no
  fundo. Sem alteração.

- **ID 030 — Aba Evento no modal de criação:** OK. As três abas (Tarefa, Nota,
  Evento) vêm do componente único `CaptureModeTabs` (`capture-mode-tabs.tsx`),
  com estilos idênticos de ativo/inativo. Usado tanto no `quick-capture` quanto
  no `calendar-event-capture` (`mode="event"`). Evento não está transparente.
  Sem alteração.

- **ID 031 — Calendário mobile `+x`:** OK. `calendar-grid.tsx`: `visibleLimit=3`,
  mostra até 3 eventos; quando há mais, no mobile exibe `+{mobileHidden}` numa
  única linha compacta (`+3`, `+10`…), sem a palavra "mais". O "mais {x}" é
  `hidden lg:inline` (só desktop), preservando o desktop. Sem alteração.

- **ID 035 — Ocultar concluídos por pasta + padrão ocultar:** OK. Coluna
  `hideCompleted` na API (`/api/folders` cria com `?? true`; PATCH em
  `/api/folders/[id]` aceita o campo). UI lê `hideCompleted !== false` (default =
  ocultar). Toggle por pasta no menu (mobile e header desktop). Persiste por
  pasta no banco. Sem alteração.

- **ID 036 — Limpar concluídos:** CORRIGIDO. A versão do Antigravity movia os
  concluídos para fora da pasta (`folderId: ''` → iam para o Inbox). O usuário
  esclareceu que devem **permanecer concluídos dentro da pasta, apenas ocultos**.
  Implementado um campo por item `clearedAt` (timestamp): "Limpar concluídos"
  agora marca `clearedAt` nos concluídos visíveis (mantendo `folderId` e
  `status: done`); o filtro da pasta oculta concluídos com `clearedAt`. Reabrir
  o item (status ≠ done) desfaz o `clearedAt`. Persiste no banco e sincroniza.

- **ID 043 — Destacar notas:** OK. `pinnedNoteIds` em preferences; toggle na nota
  (`notas/[id]/page.tsx`), exibição na seção "Destacadas" de `/notas`
  (`ContentCard`) e na sidebar. Clicar abre a nota. Remover o destaque a tira da
  seção. Sem alteração.

- **ID 044 — Fundo da página Pastas:** OK. `/notas` (navegador de pastas) usa o
  `doit-wallpaper bg-[#f4f1ff]` do `AppChrome` (fundo esbranquiçado padrão). O
  gradiente colorido só se aplica ao editor imersivo de UMA nota
  (`/notas/<id>`), não à página Pastas. Painéis em `bg-white/74` sobre o fundo
  claro. Sem alteração.

- **ID 045 — Reorganizar pastas destacadas:** OK. Menu da pasta (quando favorita)
  oferece "Mover para cima/baixo" (▲/▼), que reordena `pinnedFolderIds` e
  persiste via preferences. Disponível no menu mobile e no header desktop. Sem
  alteração.

- **ID 046 — Logo na edição de nota → Hoje:** OK. `notas/[id]/page.tsx:202`:
  `<Link href="/today">` envolve o logo + wordmark "doit.md". Clicar leva para
  `/today`. Botões de voltar/fechar continuam apontando para `/notas`. Sem
  alteração.

- **ID 047 — Lista da pasta não mostra itens de subpastas:** OK. Em modo lista,
  `allFolderItems = sortItems(directItems)` e `directItems` filtra
  `it.folderId === selectedId` (somente itens diretos). Subpastas aparecem como
  cards navegáveis (não seus itens). Sem alteração.

## Implementation plan

- [x] Auditar os 10 itens no código.
- [x] Confirmar que atendem os critérios.
- [x] Rodar checks (type-check, lint).
- [x] Capturar evidência visual dos itens visuais.
- [x] 9/10 já atendiam os critérios; só o ID 036 exigiu código (após esclarecimento).

## Decisions

- Decision: Não alterar código de nenhum dos 10 itens.
  Reason: Todos atendem os critérios declarados no pedido; a regra do usuário é
  "se está correto, não alterar". Evita risco/regressão.
  ADR needed: no.

- Decision: 036 corrigido após esclarecimento do usuário — concluídos devem
  permanecer na pasta como concluídos, apenas ocultos. Adicionado campo por item
  `clearedAt` em vez de mover os itens (`folderId: ''`).
  Reason: É a única forma de ocultar preservando pasta + status `done`. Campo
  novo nullable, baixo risco e reversível, seguindo o padrão de migração já usado
  (ensureColumn). Não é arquitetural.
  ADR needed: no.

## Files changed

- `packages/types/src/item.ts` — campo `clearedAt` em `Item` e `UpdateItemInput`.
- `packages/db/src/connection.ts` — coluna `clearedAt` (CREATE TABLE + ensureColumn
  + postgresIdentifiers).
- `apps/web/src/lib/api/item-guards.ts` — `clearedAt` permitido/validado no patch.
- `apps/web/src/app/(app)/notas/page.tsx` — filtros ocultam concluídos com
  `clearedAt`; "Limpar concluídos" marca `clearedAt` (2 handlers).
- `apps/web/src/app/api/items/[id]/route.ts` — reabrir item limpa `clearedAt`.
- `apps/web/src/app/api/items/bulk/route.ts` — reabrir em massa limpa `clearedAt`.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — passou (apenas warnings pré-existentes de `<img>`).
- [x] Playwright (chromium-mobile + chromium-desktop) para evidência visual — passou.

Results:

- Sem erros de tipo/lint. Nenhuma regressão introduzida (nenhum código alterado).
- Servidor Playwright (porta 3100) iniciado e encerrado automaticamente; porta
  confirmada livre.

Frontend evidence:

- `specs/artifacts/2026-05-30-revisar-lote-antigravity-ui/01-modal-abas-tarefa-nota-evento.png`
  — modal de criação (bottom sheet) com abas Tarefa/Nota/Evento idênticas (Evento
  não transparente) e overlay de fundo levemente desfocado (ID 028 + ID 030).
- `.../02-modal-evento-ativo.png` — aba Evento selecionada.
- `.../03-pastas-fundo-desktop.png` e `.../03-pastas-fundo-mobile.png` — página
  Pastas com fundo esbranquiçado padrão, cards brancos (ID 044), desktop e mobile.
- Cópia global: `G:\Meu Drive\.agentes\doitmd-modal-abas-2026-05-30.png` e
  `doitmd-pastas-fundo-2026-05-30.png`.
- Itens 031 (calendário `+x`), 035, 043, 045, 046, 047 validados por leitura
  de código (lógica determinística); não exigiram captura adicional.
- ID 036 (corrigido): e2e Playwright (chromium-desktop) — concluídos visíveis na
  pasta, "Limpar concluídos" oculta da visualização, e o servidor confirma que
  os itens continuam na pasta (`folderId`), `status: done`, `clearedAt` setado e
  `deletedAt` nulo (não apagados). PASS.
  - `.../04-036-concluidos-visiveis.png` e `.../05-036-apos-limpar.png`.
  - Cópia global: `G:\Meu Drive\.agentes\doitmd-limpar-concluidos-2026-05-30.png`.
- type-check + lint reexecutados após a correção do 036: OK.

## Risks

- Risk: 036 move concluídos para fora da pasta (efeito colateral em organização).
  Mitigation: sinalizado para revisão; itens não são apagados.

## Next step

Commit/push na branch `dev`. Revisão manual recomendada:
- ID 031: confirmar visualmente num dia real com >3 eventos (lógica já validada).
- ID 036: confirmar o comportamento desejado ao reabrir um item já "limpo"
  (atualmente reabrir desfaz o `clearedAt`, então ao reconcluir ele volta a
  aparecer enquanto a pasta mantém concluídos visíveis).
