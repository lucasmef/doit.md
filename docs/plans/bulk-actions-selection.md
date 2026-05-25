# Plano: Botao Direito, Selecao Multipla e Acoes em Lote

## Summary
Implementar interacao estilo Todoist nas listas de itens: clique direito abre menu contextual, `Ctrl/Cmd+clique` alterna selecao, `Shift+clique` seleciona intervalo, e no mobile um toque longo abre o menu e ativa selecao. As acoes em lote serao o pacote completo: concluir, arquivar/restaurar, status, prioridade, data, recorrencia, projeto, tags e transformar tarefa/nota.

## Key Changes
- Expandir `UIContext` com selecao multipla, ancora de intervalo, menu contextual e helpers de selecao.
- Atualizar `ItemList` e `ItemRow` para selecao estilo Todoist, botao direito e long press mobile.
- Criar `ItemContextMenu` e `BulkActionBar` como overlays globais.
- Criar `bulkUpdateItems(ids, action)` em `use-items.ts` e `PATCH /api/items/bulk`.
- Manter arquivamento como remocao segura; sem delete permanente.

## Public APIs / Types
- Adicionar `BulkItemActionInput` com `ids`, `patch` e `tagAction`.
- Adicionar `PATCH /api/items/bulk`, autenticado, com validacao por usuario.
- Nao alterar schema Mongo/Mongoose.

## Test Plan
- Rodar `pnpm --filter @doit/web exec tsc --noEmit`.
- Testar desktop: botao direito, `Ctrl/Cmd+clique`, `Shift+clique`, clique normal e `Esc`.
- Testar mobile/PWA: toque normal, long press e menu acima do bottom nav.
- Testar acoes: concluir, arquivar/restaurar, prioridade, datas, recorrencia, projeto, tags e transformar tarefa/nota.
- Testar offline: acoes enfileiradas como operacoes individuais quando possivel.

## Assumptions
- “Igual ao Todoist” significa selecao por modificadores no desktop e long press no mobile, nao drag-select.
- Acoes em lote operam apenas sobre itens visiveis/selecionaveis na lista atual.
- Endpoint unico e usado online; fallback offline usa atualizacoes individuais.
