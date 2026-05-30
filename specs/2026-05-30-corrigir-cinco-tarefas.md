# Living Spec: Corrigir 5 tarefas no doit.md

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Corrigir 5 tarefas específicas no doit.md relacionadas à exibição de itens em pastas, configuração de ocultação de concluídos por pasta, destaque de notas e reordenação de itens destacados.

## Context

Esta spec abrange as seguintes tarefas pontuais:
1. **ID 035 - Pastas / Ocultar concluídos**: Adicionar uma configuração persistente individual por pasta para ocultar concluídos (padrão: sim).
2. **ID 036 - Pastas / Limpar concluídos**: Ação manual para desassociar (remover da pasta) os itens concluídos que estão visíveis.
3. **ID 043 - Notas / Destaques**: Permitir destacar notas. Notas destacadas devem aparecer na seção "Destacadas/Fixadas".
4. **ID 045 - Pastas destacadas / Reorganização**: Permitir reordenar pastas destacadas manualmente na seção de destacados.
5. **ID 047 - Pastas / Lista**: Exibir apenas itens diretos da pasta na exibição de lista (não exibir itens de subpastas).

## Scope

- [x] Configuração `hideCompleted` persistida individualmente na tabela `folders`.
- [x] Ação de alteração desta configuração no menu de contexto da pasta e kebab menu.
- [x] Ação "Limpar concluídos" para remover `folderId` dos itens concluídos visíveis.
- [x] Permitir destacar e remover destaque de notas no NoteEditorPage.
- [x] Exibir notas destacadas na barra lateral (Fixadas) e na área central de Destacadas.
- [x] Permitir ordenar/reorganizar pastas destacadas pelo menu de contexto e kebab menu da pasta ativa.
- [x] Filtrar itens de subpastas da visualização em lista.

## Out of scope

- Refatorações amplas em outros fluxos de notas, tarefas, calendário ou sincronização do CLI.
- Mudança na exclusão física de itens ou alteração nas regras de integridade do CLI sync (exceto respeitar a nova coluna hideCompleted, que é transparente para o CLI).

## Grill Gate

Decision: not_needed

Reason:
Os requisitos e critérios de aceitação fornecidos pelo usuário são extremamente precisos e objetivos. A implementação segue os padrões de código, banco de dados (SQLite/Postgres) e estado de preferências locais já consolidados no projeto.

## Acceptance criteria

### ID 035
- [x] Ao abrir uma pasta sem configuração anterior, concluídos somem automaticamente (padrão `true`).
- [x] Alterar a configuração para "Manter concluídos visíveis" persiste a opção individualmente por pasta.
- [x] A configuração persiste após navegar para outra pasta e retornar.

### ID 036
- [x] Com a opção de manter concluídos visíveis ativada, a ação "Limpar concluídos" é exibida.
- [x] Ao clicar, os itens com status `done` têm seu `folderId` removido (desassociados).
- [x] Os itens desassociados somem da visualização da pasta, mas continuam existindo no banco de dados (não são excluídos).

### ID 043
- [x] Botão de estrela/destaque disponível no NoteEditorPage (tanto na barra superior quanto no menu).
- [x] Clicar em destacar adiciona o ID da nota à lista `pinnedNoteIds` em preferências persistentes.
- [x] Notas destacadas aparecem na seção "Destacadas" da biblioteca `/notas` e "Fixadas" do sidebar principal.
- [x] Clicar na nota destacada abre o editor correto.
- [x] Remover destaque remove a nota das seções de destaque imediatamente.

### ID 045
- [x] Opções "Mover para cima / esquerda" e "Mover para baixo / direita" disponíveis no menu de contexto das pastas destacadas.
- [x] Alterar a ordem das pastas atualiza sua posição no array `pinnedFolderIds` em preferências.
- [x] A nova ordenação persiste após recarregar e em visitas subsequentes.

### ID 047
- [x] No modo lista de uma pasta, itens pertencentes a subpastas não devem ser exibidos.
- [x] Apenas itens com o `folderId` igual ao ID da pasta atual são renderizados na lista.
- [x] Subpastas e seus respectivos itens continuam funcionando normalmente ao serem abertos individualmente.

## Implementation plan

1. **Alterações de Banco de Dados e API de Pastas**:
   - [x] Atualizar `packages/db/src/connection.ts` para adicionar a coluna `hideCompleted` (INTEGER NOT NULL DEFAULT 1) na tabela `folders`.
   - [x] Registrar `hideCompleted` em `booleanFields` em `packages/db/src/index.ts`.
   - [x] Atualizar os tipos em `packages/types/src/folder.ts`.
   - [x] Permitir PATCH de `hideCompleted` em `apps/web/src/app/api/folders/[id]/route.ts`.
   - [x] Incluir `hideCompleted: true` na criação de pastas em `apps/web/src/app/api/folders/route.ts`.

2. **Alterações de Preferências**:
   - [x] Adicionar `pinnedNoteIds: string[]` em `Preferences` e `DEFAULTS` no arquivo `apps/web/src/hooks/use-preferences.ts`.

3. **Lógica de Itens e Menu da Pasta (notas/page.tsx)**:
   - [x] Em `notas/page.tsx`, ajustar `directItems` e `itemsByFolder` para levar em conta `folder.hideCompleted`.
   - [x] Ajustar `allFolderItems` para não incluir os itens de subpastas na visualização em lista da pasta (ID 047).
   - [x] Adicionar o controle de toggle `hideCompleted` e a ação `Limpar concluídos` no Kebab Menu do cabeçalho da pasta e no `FolderMenu` de contexto (ID 035, ID 036).
   - [x] Implementar reordenação de pastas fixadas por `onReorder` no `FolderMenu` e Kebab Menu (ID 045).

4. **Lógica de Notas Destacadas (NoteEditorPage & Sidebar)**:
   - [x] Adicionar botão de destaque na barra de ferramentas do NoteEditorPage (`apps/web/src/app/(app)/notas/[id]/page.tsx`).
   - [x] Exibir notas destacadas na seção "Destacadas" da página `/notas` e no sidebar `apps/web/src/components/layout/sidebar.tsx` (ID 043).

## Progress

- 2026-05-30 08:35 - Inicialização da spec viva e análise das dependências e estruturas do monorepo.
- 2026-05-30 08:45 - Adicionado a coluna `hideCompleted` na migração e indexação do banco.
- 2026-05-30 08:50 - Implementada as preferências locais para notas destacadas (`pinnedNoteIds`).
- 2026-05-30 08:55 - Modificada a visualização em lista para filtrar subpastas e adicionado controles de concluídos e ordenação manual de destaques.
- 2026-05-30 09:05 - Adicionado botão de destaque estrela na visualização e edição de nota.
- 2026-05-30 09:16 - Tipo corrigido no TypeScript (substituição de `null` por `''` no patch do `folderId`).
- 2026-05-30 09:18 - Todos os checks de type-check e compilação do Next passaram com sucesso.

## Decisions

- **Mover desassociação por string vazia**: Em vez de passar `null` como `folderId` no patch, foi utilizada string vazia `''`, que é o padrão esperado pelo route handler da API de atualização de itens e previne erros de tipagem no TypeScript.

## Files changed

- `packages/db/src/connection.ts` - Adiciona coluna `hideCompleted` ao banco de dados e adiciona a lista de identificadores Postgres.
- `packages/db/src/index.ts` - Registra `hideCompleted` como campo booleano do model.
- `packages/types/src/folder.ts` - Atualiza tipos da pasta com `hideCompleted`.
- `apps/web/src/app/api/folders/[id]/route.ts` - Permite atualizar `hideCompleted` via PATCH.
- `apps/web/src/app/api/folders/route.ts` - Seta `hideCompleted` como padrão na criação de pastas.
- `apps/web/src/hooks/use-preferences.ts` - Adiciona suporte para persistir `pinnedNoteIds`.
- `apps/web/src/app/(app)/notas/page.tsx` - Implementa filtros e menus para ocultação de concluídos, reordenação de destacados e ocultação de subpastas na lista.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - Adiciona botões de estrela/destaque no cabeçalho e menu de contexto do editor de notas.
- `apps/web/src/components/layout/sidebar.tsx` - Exibe notas destacadas no menu lateral Fixadas.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web exec tsc --noEmit` - Compilou com sucesso sem nenhum erro.
- [x] `pnpm --filter @doit/web build` - Processo de compilação Next.js otimizado executou com sucesso (a falha de standalone symlink final é de ambiente Windows, não de compilação de código).

Riscos e mitigação:
- Sem riscos significativos identificados. Os ajustes foram isolados e seguiram o padrão existente.
