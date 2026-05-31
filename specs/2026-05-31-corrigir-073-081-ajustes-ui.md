# Corrigir IDs 073-081 - Ajustes de Pastas, Editor e Menu

## Metadata

- Status: done
- Mode: bugfix
- Complexity: high
- Created: 2026-05-31
- Updated: 2026-05-31

## Objective

Corrigir somente os itens ainda pendentes do lote 073-081, preservando os comportamentos ja confirmados como OK. O foco e manter a experiencia atual em desktop e mobile, com ajustes pontuais em Pastas, QuickCapture, editor de notas e Ajustes.

## Context

- BuilderFlow foi usado como workflow principal; `doit-workflow` foi usado como regra de dominio para app, Items e persistencia.
- A spec `2026-05-30-corrigir-073-074-pastas-data.md` registra 073 e 074 como done, com validacao Playwright e PR ja aberto. Esses pontos serao verificados, nao reabertos.
- Pastas usa `apps/web/src/app/(app)/notas/page.tsx` com renderizadores proprios `ContentCard` e `ContentRow`; eles nao herdam todo o visual de prioridade/data de outras listas.
- A edicao de tarefa usa `QuickCapture` em modo edicao; o campo de titulo expandido ainda e `input`, entao nao suporta multiplas linhas.
- O estado de retracao de topicos de nota existe em `heading-collapse-extension.ts`, mas persiste apenas em `localStorage`, sem sincronizacao entre dispositivos.
- O editor TipTap em modo sheet tem margem em paragrafos e o handler de copia usa markdown serializado, que pode gerar linhas em branco extras.
- Ajustes grava a ordem de menu em `usePreferences`; o menu desktop lateral ainda usa uma lista hardcoded e nao respeita essa ordem.

## Scope

- [x] ID 073 - verificar e preservar atraso visual de concluido em Pastas.
- [x] ID 074 - verificar e preservar `proxima semana` como proxima segunda-feira.
- [x] ID 075 - mostrar data de eventos/itens com data no mobile dentro de Pastas.
- [x] ID 076 - permitir titulo longo de tarefa em multiplas linhas no editor.
- [x] ID 077 - aplicar cores de prioridade nas tarefas dentro de Pastas.
- [x] ID 078 - adicionar cancelamento claro no seletor de pasta da edicao de tarefa.
- [x] ID 079 - persistir/sincronizar retracao de topicos da nota.
- [x] ID 080 - remover espaco extra de paragrafos e evitar linha em branco extra no clipboard.
- [x] ID 081 - fazer o menu desktop respeitar reordenacao definida em Ajustes.

## Out of scope

- Refatoracao ampla dos parsers de data.
- Reescrever a arquitetura do editor TipTap.
- Alterar arquivos de schema em `packages/db/src/schemas/`.
- Mudar fluxo de recorrencia, pagina Hoje, sync Markdown ou regras de audit.
- Reabrir itens ja confirmados como OK fora dos criterios deste lote.

## Grill Gate

Decision: not_needed

Reason:
Os criterios de aceitacao sao objetivos e os caminhos de codigo existentes indicam uma solucao local para cada ID. A unica persistencia nova necessaria e para estado visual de nota; o repositorio ja usa migracoes leves em `connection.ts` via `ensureColumn`, sem editar os arquivos de schema protegidos.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] ID 073 permanece funcionando em mobile e desktop, inclusive com pasta que oculta ou mantem concluidos.
- [x] ID 074 permanece apontando `proxima semana` para a proxima segunda-feira.
- [x] ID 075 mostra data no mobile para itens/eventos datados em Pastas sem quebrar desktop.
- [x] ID 076 titulo longo de tarefa cresce em multiplas linhas no modal/editor.
- [x] ID 077 P1/P2/P3/neutro em Pastas seguem o mesmo padrao visual de prioridade do app.
- [x] ID 078 seletor de pasta pode ser fechado/cancelado sem alterar pasta atual.
- [x] ID 079 topicos retraidos persistem ao sair/voltar e sao sincronizados via Item.
- [x] ID 080 copiar texto do editor nao leva linha em branco extra e paragrafos nao tem espacamento diferenciado.
- [x] ID 081 reordenacao em Ajustes afeta menu desktop e continua preservando mobile.

## Implementation plan

- [x] Verificar 073/074 no codigo e manter sem alteracao caso estejam corretos.
- [x] Ajustar `ContentRow`/`ContentCard` de Pastas para data mobile e cores de prioridade.
- [x] Trocar o titulo expandido do QuickCapture para textarea auto-resizavel e adicionar cancelamento no popover de pasta.
- [x] Persistir indices de titulos recolhidos em `Item.collapsedHeadingIndices`, com coluna SQL leve e PATCH validado.
- [x] Ajustar o handler de copia do editor e margens de paragrafo do modo sheet.
- [x] Fazer menus desktop derivarem ordem/visibilidade de `prefs.mobileNav`, preservando Settings.
- [x] Rodar checks relevantes e validacao visual com servidor temporario, screenshots no projeto e copia global.

## Progress

- 2026-05-31 - Lidas instrucoes BuilderFlow/doit-workflow, `docs/CONTEXT.md`, `docs/ADR.md`, spec 073/074 e caminhos de codigo relacionados.
- 2026-05-31 - Criada esta spec com plano por ID antes da implementacao.
- 2026-05-31 - Implementados ajustes IDs 075-081 e preservados IDs 073-074.
- 2026-05-31 - Validacao Playwright local passou para todos os IDs; screenshots salvos no projeto e copiados para `G:\Meu Drive\.agentes`.
- 2026-05-31 - Type-check e lint passaram. Build compilou, mas falhou no passo final de standalone por `EPERM` de symlink no OneDrive/Windows.

## Decisions

- Decision: nao alterar 073/074 se a implementacao existente continuar atendendo os criterios.
  Reason: evitar reabrir itens ja confirmados como OK.
  ADR needed: no
- Decision: persistir retracao de topicos em campo JSON leve do Item (`collapsedHeadingIndices`) em vez de inserir metadado no Markdown.
  Reason: evita contaminar o conteudo da nota e sincroniza entre dispositivos pela API existente.
  ADR needed: no
- Decision: validar ID 074 por criacao real de tarefa e leitura de `dueDate` via API.
  Reason: em 2026-05-31 a proxima segunda-feira e exibida como "amanha" na UI, entao validar por texto visual da data gera falso negativo.
  ADR needed: no
- Decision: aplicar a ordem de Ajustes ao Topbar desktop e tambem ao Sidebar legado.
  Reason: o desktop atual usa Topbar como menu principal, mas manter Sidebar alinhado evita divergencia se ele voltar a ser usado.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/notas/page.tsx`
- `apps/web/src/app/(app)/notas/[id]/page.tsx`
- `apps/web/src/app/(app)/settings/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/items/markdown-editor.tsx`
- `apps/web/src/components/items/quick-capture.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/topbar.tsx`
- `apps/web/src/lib/api/item-guards.ts`
- `packages/db/src/connection.ts`
- `packages/db/src/index.ts`
- `packages/types/src/item.ts`
- `specs/validate-073-081.mjs`
- `specs/2026-05-31-corrigir-073-081-ajustes-ui.md`

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `node specs\validate-073-081.mjs` with server `pnpm --filter @doit/web exec next dev -p 3101 -H 127.0.0.1`
- [x] `pnpm --filter @doit/web build`

Results:

- Type-check: passed.
- Lint: passed with pre-existing warnings for `<img>`, hook dependency warnings and Next lint deprecation.
- Frontend validation: passed all IDs 073-081.
- Build: Next compilation, type/lint, page generation and trace collection progressed successfully; final standalone copy failed with `EPERM: operation not permitted, symlink ...` under OneDrive/Windows.
- Temporary server: started on `127.0.0.1:3101` for validation and stopped after screenshots; no listener remained on port 3101.

Frontend evidence:

- `specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui/doitmd-pastas-prioridade-2026-05-31-desktop.png`
- `specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui/doitmd-pastas-data-mobile-2026-05-31.png`
- `specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui/doitmd-edicao-tarefa-folder-cancel-2026-05-31.png`
- `specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui/doitmd-editor-notas-collapse-copy-2026-05-31.png`
- `specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui/doitmd-settings-menu-desktop-2026-05-31.png`
- Copies also attempted in `G:\Meu Drive\.agentes`; validation script reported no copy failure.

## Risks

- Risk: persistir estado de retracao como Item atualiza `updatedAt`.
  Mitigation: debounced client update e campo separado do conteudo.
- Risk: menu desktop passar a respeitar ordem configurada pode ocultar entradas se o usuario ocultou no ajuste.
  Mitigation: usar a mesma semantica de visibilidade ja existente para mobile e manter Settings no rodape.

## Next step

Manual review in the UI, then publish/merge through the normal dev-to-main PR flow.
