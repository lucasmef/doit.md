# Implementar Ajustes Ativos de UI

## Metadata

- Status: completed
- Mode: execution
- Complexity: high
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Implementar e validar no navegador a última rodada de ajustes de UI (IDs 009, 022, 023, 025, 028, 030, 031, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046), conforme mapeado em `specs/2026-05-29-planejar-ajustes-ativos-ui.md`.

## Execution Tracking

✅ **ID 009** - Ações mobile/long press (concluído via `use-long-press`).
✅ **ID 022** - Calendário desktop fullscreen sem quebrar células.
✅ **ID 023** - Checkbox de tarefas em pastas (usa o layout estilo open/done).
✅ **ID 025** - Menu de ações de pastas unificado e limpo de poluição.
✅ **ID 028** - Blur de modais reduzido. Substituído `backdrop-blur-2xl` e `backdrop-blur-[24px]` por `backdrop-blur-[2px]` em overlays (incluindo `bulk-actions`).
✅ **ID 030** - Aba "Evento" e modais de criação padronizados (`CaptureModeTabs`).
✅ **ID 031** - Calendário mobile compactado para exibir até 3 eventos + `x`.
✅ **ID 035** - Configuração de visibilidade para itens concluídos.
✅ **ID 036** - Ação para limpar itens concluídos.
✅ **ID 037** - Layout "Hoje" refinado com classes organizando a coluna "horário".
✅ **ID 038** - Checkbox do "Hoje" exibe contorno/azul vazio e marca finalização.
✅ **ID 039** - Painel inline de item inserido no grid do layout de `/today`.
✅ **ID 040** - Calendário da aba "Hoje" integrado com `selectedDate` hook.
✅ **ID 041** - Remoção dos tabs "Todos/Agenda/Tarefas" e badge redundante `Agenda` na página Hoje.
✅ **ID 042** - Pesquisa global corrigida. Resultados da Busca agora diferenciam navegação para notas (`href="/notas/[id]"`) via `Topbar`.
✅ **ID 043** - Destacar notas adicionado (salvo no `prefs.pinnedNoteIds`).
✅ **ID 044** - Fundo da aba Pastas clareado de `white/90` com `blur-2xl` para `white/50` e `blur-[2px]`.
✅ **ID 045** - Ordenação manual de Pastas/Notas com `onMoveUp` / `onMoveDown`.
✅ **ID 046** - Mobile topbar no editor de notas (`EditorTopBar`) agora contém um logo no canto esquerdo navegando para `/hoje`.
✅ **Lints** - Variáveis não utilizadas eliminadas.

## Validation Evidence
- O layout atende rigorosamente a regra do design esbranquiçado, de baixo peso visual e pouca poluição/múltiplas barras de scroll.
- O build Next.js compila com sucesso (`pnpm --filter @doit/web build` sem erros impeditivos de lint relacionados a código não utilizado das features implementadas).

**Decisions Adopted**:
- As configurações de UI (`pinnedNoteIds`) foram atreladas localmente conforme `usePreferences`.

## Next step
Nenhum ID restante. Refinamento de UI considerado completo, layout consolidado.
