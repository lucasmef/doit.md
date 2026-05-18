# PRD: Correções do UX Review

**Data:** 2026-05-18  
**Fonte:** `docs/ux-review.md`  
**Objetivo:** corrigir os problemas funcionais, visuais e de acessibilidade encontrados no teste visual e no review do Claude Code.

## Resumo

O review confirmou que a base funcional do app está boa, mas há problemas que afetam confiança, integridade de dados, consistência visual e acessibilidade. A execução deve priorizar primeiro bugs que corrompem dados, depois confiança/UX principal, e por fim polimento visual e acessibilidade.

## Escopo

- Validação runtime de updates de item.
- Respostas limpas em API de folders.
- Correções de navegação legada.
- Ajustes de busca desktop/mobile.
- Correção do indicador `Saved`.
- Dados reais do usuário na sidebar.
- Padronização PT-BR.
- Melhorias de acessibilidade em linhas de item.
- Undo/confirm para reagendamento em massa.
- Empty states e contraste.

## Fora de Escopo

- Redesign completo do app.
- Mudança estrutural no modelo de dados.
- Introdução obrigatória de nova biblioteca de testes.
- Validação E2E do Google Drive.
- Mudanças no fluxo de sync Markdown.

## Prioridade

### P0 — Integridade de Dados

| Item | Problema | Entrega Esperada | Status |
| --- | --- | --- | --- |
| UX-001 | `PATCH /api/items/[id]` aceita `status` inválido. | Rejeitar status fora de `inbox/todo/doing/waiting/done/archived` com 400. | Pendente |
| UX-002 | `PATCH /api/items/[id]` aceita título vazio para tarefa. | Rejeitar `title` vazio para `task/capture/project/document`; manter autotítulo para `note`. | Pendente |
| UX-003 | PATCH/bulk não valida todos os enums relevantes. | Validar `complexity`, `priority`, `recurrence`, datas e tipos básicos. | Pendente |
| UX-004 | `POST /api/folders` retorna `_id` interno. | Responder apenas shape público com `id`, sem `_id`. | Pendente |

### P1 — Confiança e UX Principal

| Item | Problema | Entrega Esperada | Status |
| --- | --- | --- | --- |
| UX-005 | `/areas -> /projects -> /notas` faz redirect duplo. | `/areas` redireciona direto para `/notas`. | Pendente |
| UX-006 | Indicador `Saved` é fixo e não reflete estado real. | Remover ou trocar por estado real: `Salvo`, `Salvando...`, `Offline`, `Erro`, `Pendente`. | Pendente |
| UX-007 | Sidebar mostra `Lucas / local workspace` fixo. | Exibir nome/inicial da sessão ou `/api/me`; remover texto enganoso. | Pendente |
| UX-008 | Idioma misturado PT/EN e rótulos sem acento. | Padronizar rótulos principais em PT-BR com acentos. | Pendente |
| UX-009 | Busca mostra falso “Nenhum item encontrado” durante debounce/fetch. | Adicionar estado `Buscando...` e só mostrar vazio após resposta atual. | Pendente |
| UX-010 | Busca mobile fica estreita e compete com botões do topbar. | Busca mobile ocupa largura total; esconde logo/botões enquanto aberta. | Pendente |
| UX-011 | Botão de fechar busca mobile é `x` textual. | Usar ícone consistente e alvo de toque adequado. | Pendente |
| UX-012 | Datas da busca aparecem em ISO. | Formatar como `Hoje`, `Amanhã`, `18 mai` etc. | Pendente |

### P2 — Acessibilidade e Polimento

| Item | Problema | Entrega Esperada | Status |
| --- | --- | --- | --- |
| UX-013 | `ItemRow` usa `role=button` com botões internos. | Separar semântica da linha e ações; evitar botão dentro de botão/role conflitante. | Pendente |
| UX-014 | Checkbox não tem aria adequado. | Adicionar `aria-label` e estado acessível. | Pendente |
| UX-015 | Checkbox tem alvo visual/toque pequeno. | Alvo efetivo mínimo de ~44x44px com padding invisível. | Pendente |
| UX-016 | Teclado no item só trata Enter. | Suportar Space para seleção/ação conforme padrão escolhido. | Pendente |
| UX-017 | `Reagendar atrasadas` não tem undo/confirm. | Adicionar undo no toast ou confirmação para múltiplos itens. | Pendente |
| UX-018 | Empty state de `/today` é inferior ao `/inbox`. | Criar empty state dedicado e consistente para Hoje. | Pendente |
| UX-019 | Textos pequenos em `text-navy-300` têm contraste fraco. | Revisar metadados críticos para contraste AA. | Pendente |
| UX-020 | Loading de `/today` mostra `Itens / 0`. | Não exibir contador zero enquanto carrega. | Pendente |

## Requisitos Funcionais

1. APIs devem rejeitar payloads inválidos com erro 400 claro e sem persistir dados.
2. A UI não deve exibir estados de persistência falsos.
3. A busca deve ter estados explícitos: vazio inicial, buscando, sem resultados e resultados.
4. Mobile search deve ser usável em 390px de largura sem truncar controles essenciais.
5. ItemRow deve ser navegável por teclado e compreensível por leitor de tela.
6. Ações em massa devem permitir recuperação quando forem reversíveis.

## Requisitos Não Funcionais

- Manter Next.js App Router e padrões atuais.
- Não rodar servidor persistente como parte da validação final.
- Não adicionar dependência nova salvo necessidade clara.
- Preservar comportamento mobile atual que já funciona.
- Type-check do web app deve passar.

## Plano de Execução

### Fase 1 — Integridade

- Implementar validação runtime em helper compartilhado para `CreateItemInput`/`UpdateItemInput`.
- Aplicar validação em `PATCH /api/items/[id]` e `PATCH /api/items/bulk`.
- Limpar response de `POST /api/folders`.
- Corrigir redirect `/areas`.

Critérios de aceite:

- `status: banana` retorna 400.
- `title: ""` em task retorna 400.
- `POST /api/folders` não retorna `_id`.
- `/areas` tem um único redirect para `/notas`.

### Fase 2 — Topbar, Busca e Sessão

- Remover/conectar `Saved`.
- Trocar textos principais para PT-BR.
- Buscar nome/inicial real do usuário na sidebar.
- Ajustar busca mobile full-width.
- Adicionar estado `Buscando...`.
- Formatar datas em resultados.

Critérios de aceite:

- Nenhum texto principal fica em inglês sem motivo.
- Busca mobile não fica espremida em 390px.
- Resultado vazio só aparece após fim da busca.
- Sidebar reflete usuário autenticado.

### Fase 3 — ItemRow e Acessibilidade

- Refatorar semântica do row/checkbox.
- Adicionar aria.
- Aumentar alvo de toque.
- Suportar Space.

Critérios de aceite:

- Não há controle interativo aninhado semanticamente.
- Checkbox é anunciado corretamente por leitor de tela.
- Alvo de toque é confortável no mobile.

### Fase 4 — Polimento de Fluxos

- Adicionar undo/confirm em `Reagendar atrasadas`.
- Criar empty state dedicado para `/today`.
- Revisar contraste de metadados.
- Corrigir contador/loading de `/today`.

Critérios de aceite:

- Reagendamento pode ser desfeito ou confirmado.
- `/today` vazio tem tratamento visual equivalente ao `/inbox`.
- Textos críticos têm contraste adequado.

## Validação

Comandos:

```bash
pnpm --filter @doit/web exec tsc --noEmit
```

Validação visual recomendada:

- Desktop 1440x950: `/today`, `/inbox`, busca aberta.
- Mobile 390x844: `/today`, busca aberta, bottom nav.
- API autenticada: PATCH inválido de item, POST folder, redirect `/areas`.

## Riscos

- Refatorar `ItemRow` pode afetar seleção múltipla, long press e context menu.
- Alterar topbar mobile pode afetar atalhos globais de busca.
- Validação mais rígida pode revelar clientes internos enviando payloads frouxos.

## Métrica de Conclusão

Este PRD pode ser considerado concluído quando:

- Todos os itens P0 e P1 estiverem feitos.
- P2 tiver pelo menos acessibilidade do `ItemRow`, undo de reagendamento e contraste resolvidos.
- Type-check passar.
- Novo teste visual confirmar que os problemas do `docs/ux-review.md` foram eliminados ou reclassificados.
