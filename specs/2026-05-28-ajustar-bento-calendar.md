# Ajustar Bento Calendar

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Ajustar o layout do Bento Calendar de acordo com o mockup, remover o fundo branco (box) ao redor das telas principais e adicionar funcionalidade para o calendário (clique no dia, clique no evento e botão de tela cheia).

## Context

O usuário relatou que o layout do calendário estava muito diferente do `Bento Calendar.html` aprovado. Havia uma caixa/fundo branco envolvendo as páginas, o que não estava nos protótipos. Além disso, as interações de clique não estavam funcionando, e o calendário precisava de um modo de maximizar (tela cheia).

## Scope

- [x] Remover caixas brancas do `app-chrome.tsx` e `topbar.tsx`.
- [x] Permitir o clique nos dias no `MonthCard` para selecionar a data e mostrar no `AgendaCard`.
- [x] Permitir o clique nos eventos do `MonthCard` e `AgendaCard` para abrir o `EventSheet`.
- [x] Adicionar botão de maximizar para abrir a visualização em tela cheia do calendário (`CalendarBoard` com fullscreen mode).

## Grill Gate

Decision: not_needed
Reason: Os requisitos estavam claros e diretamente baseados no protótipo HTML enviado como referência, além de alinharem com o comportamento esperado de modais (`EventSheet`) já existentes.

## Progress

- 2026-05-28 13:45 - Iniciou análise do `Bento Calendar.html` e `app-chrome.tsx`.
- 2026-05-28 13:46 - Fez ajustes em `app-chrome` e `topbar` para remover background/borders nas páginas e no nav.
- 2026-05-28 13:49 - Aplicou interatividade no calendário com `useState`, botões `onClick` e modal do `EventSheet`.

## Files changed

- `apps/web/src/components/layout/app-chrome.tsx` - Removidos estilos do wrapper (bg, border, shadow) para adequar ao design de "shell" livre do dashboard.
- `apps/web/src/components/layout/topbar.tsx` - Removido estilos excessivos do container `<header>` no desktop, mantendo-o apenas como um grid invisível (as pills mantêm as bordas, como no mockup).
- `apps/web/src/app/(app)/calendar/page.tsx` - Layout atualizado para suportar controle de `selectedDate`, `fullscreen`, `openEvent`, além de repassar as propriedades atualizadas ao `MonthCard` e `AgendaCard`.

- `pnpm --filter @doit/web build` - passed (Lint warnings corrigidos)
- frontend manual check - skipped (Servidor local redireciona para `/login` ao rodar script de teste, impossibilitando navegação anônima pelo Playwright)
- screenshots - skipped

## Risks

- N/A

## Next step

- Aguardar feedback do usuário.
