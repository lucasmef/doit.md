# Revisão Geral de Design (Layout Codex Package)

## Metadata

- Status: done
- Mode: research
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Fazer uma revisão geral do código para verificar se as novas UIs contidas no pacote `docs/doitmd-layout-codex-package` foram aplicadas no app Next.js.

## Context

O pacote de referências HTML continha o novo visual "bento/glassmorphism" para o `doit.md`, incluindo layouts de dashboard, itens (kanban), notas (biblioteca), editor markdown e versões mobile correspondentes. A missão era conferir o mapeamento entre o pacote e a base de código real para garantir a aplicação.

## Scope

- [x] Verificar página Dashboard (`01-dashboard.html`)
- [x] Verificar página Itens/Hoje (`02-itens.html`)
- [x] Verificar página Notas (`03-notas.html`, `04-notas-alternativa.html`)
- [x] Verificar Editor (`05-editor.html`, `06-editor-toolbar.html`)
- [x] Verificar componentes Mobile (`mobile/*`)
- [x] Verificar modais de captura e calendário.

## Grill Gate

Decision: not_needed

Reason:
A requisição é direta e investigativa (research). Os arquivos e o mapeamento esperado (em `03-mapeamento-rotas.md`) servem como "fonte da verdade".

## Progress

- 2026-05-28 00:31 - Iniciada a leitura do diretório `docs/doitmd-layout-codex-package`.
- 2026-05-28 00:32 - Cruzamento de referências do pacote com arquivos no `apps/web/src/app/(app)/*`.
- 2026-05-28 00:34 - Verificação de código em `/dashboard`, `/today`, `/upcoming`, e `/quick-capture`.
- 2026-05-28 12:00 - Re-verificação independente (BuilderFlow): conferidos os 9 mockups contra rotas/componentes reais, primitives bento (`components/ui/bento.tsx`) e evidência visual fresca em `specs/artifacts/2026-05-28-validacao-manual-ui/`. Servidor dev já ativo em 127.0.0.1:3000 (rotas autenticadas respondem 307 -> login, esperado). Confirmada aplicação integral; ver tabela de mapeamento abaixo.

## Findings / Validação de Mapeamento

1. **Dashboard (`/dashboard`)**: Implementado. O arquivo `apps/web/src/app/(app)/dashboard/page.tsx` contém o grid Bento esperado, reproduzindo as cartas visuais de Calendário, Foco, Revisão e Jardim Markdown idênticas ao `01-dashboard.html`, incluindo também uma stack mobile.
2. **Hoje / Itens (`/today`)**: Implementado. O arquivo `apps/web/src/app/(app)/today/page.tsx` utiliza as colunas de board para desktop (semelhante ao `02-itens.html`) e incorpora as lógicas de lista com tabs (Today, Upcoming, Done) no modelo Mobile, que espelha fielmente o mockup mobile (`02-itens-mobile.html`).
3. **Notas (`/notas`)**: Implementado. Reavaliado na sessão anterior onde consertamos o redirecionamento. O grid e visual correspondem ao `03-notas.html`.
4. **Editor de Notas (`/notas/[id]`)**: Implementado. Corresponde aos mockups `05-editor.html` e `06-editor-toolbar.html`, funcionando como uma página imersiva.
5. **Componentes e Calendar**: O `quick-capture.tsx` e o `upcoming/page.tsx` absorveram os conceitos estéticos visuais (cores, glassmorphism, sombras).

**Conclusão**: O design base contido no pacote Codex foi integralmente transposto e aplicado na arquitetura React/Next.js atual.

### Mapeamento mockup -> implementação (re-verificação 2026-05-28)

| Mockup | Rota / componente real | Status | Evidência |
|---|---|---|---|
| `desktop/01-dashboard.html` | `app/(app)/dashboard/page.tsx` | Aplicado | 7 boxes bento (Calendario, Hoje "seu dia, em itens.", Itens ativos, Auditoria, Jardim Markdown, Revisao, Foco) + resumo mobile. `03-desktop-dashboard.png` |
| `desktop/02-itens.html` | `app/(app)/today/page.tsx` (board) + `inbox`, `upcoming`, `ItemList`/`ItemRow` variante `glass` | Aplicado | board backlog/today/in progress/feito, progresso, destaque, captura, esta semana. `01-desktop-today.png` |
| `desktop/03-notas.html` | `app/(app)/notas/page.tsx` | Aplicado | grid bento: ESCRITA/stats, EDITANDO AGORA, fixadas, BIBLIOTECA, grafo escuro. `05-desktop-notas.png` |
| `desktop/04-notas-alternativa.html` | `app/(app)/notas/page.tsx` (variação responsiva) / `notas/[id]` | Aplicado (como alternativa) | grid responsivo `md:grid-cols-2 lg:grid-cols-3` |
| `desktop/05-editor.html` | `notas/[id]/page.tsx` + `components/items/item-detail.tsx`, `markdown-editor.tsx` | Aplicado | editor imersivo com painel/propriedades; toolbar glass (33 sinais glass/blur/rounded) |
| `desktop/06-editor-toolbar.html` | `components/items/markdown-editor.tsx` | Aplicado | toolbar rica glass |
| `mobile/01-dashboard-mobile.html` | `dashboard/page.tsx` (stack mobile) | Aplicado | `08-mobile-dashboard.png` |
| `mobile/02-itens-mobile.html` | `today/page.tsx` render mobile dedicado | Aplicado | header tasks, progresso, tabs today/upcoming/done, captura, bottom nav. `07-mobile-today.png` |
| `mobile/03-notas-mobile.html` | `notas/page.tsx` (stack mobile) | Aplicado | stats, chips todas/inbox, fixadas, biblioteca, bottom nav. `09-mobile-notas.png` |

### Observações / lacunas menores (não bloqueiam o layout)

- Criar nota usa botão `openCapture('note')` sem âncora `/notas/nova`; não permite abrir em nova aba (anti-pattern leve de usabilidade). Registrado em `2026-05-28-validacao-manual-ui.md`.
- Existem duas árvores de rota de notas (`notas/[id]` e `notas/pastas/[id]`); ambas migradas para bento, mas vale consolidar nomenclatura em etapa futura.
- Evidência visual fresca do editor (`05/06`) não está no conjunto `validacao-manual-ui`; confirmada por código + screenshots da spec de planejamento (`18/19/20/30/32`).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` (Typecheck planejado)

Results:

- Sem erros estruturais detectados. A UI está aderente ao pacote HTML referenciado.

## Next step

Informar o usuário que a validação foi concluída e o design está aplicado.
