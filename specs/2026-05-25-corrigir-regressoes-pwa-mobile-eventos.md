# Corrigir Regressoes PWA Mobile Eventos

## Metadata

- Status: done
- Mode: bugfix
- Complexity: high
- Created: 2026-05-25
- Updated: 2026-05-25

## Objective

Corrigir regressões que atrapalham o uso diário do app: persistência da sessão PWA, menu mobile opaco, erros visuais do editor no modo noturno, eventos clicáveis em Hoje, modal mobile de edição de evento e reconhecimento de "amanhã" nos atalhos.

## Context

O app usa NextAuth Credentials com JWT em `apps/web/src/auth.ts`, UI mobile em `Topbar`, eventos do dia em `today/page.tsx`, edição de eventos em `calendar-board.tsx`, captura de eventos em `calendar-event-capture.tsx` e editor TipTap em `markdown-editor.tsx`/`globals.css`.

## Scope

- [x] Investigar sessão, menu mobile, editor dark, eventos em Hoje, modal de evento e atalhos de data.
- [x] Ajustar persistência de sessão para 15 dias de forma explícita.
- [x] Tornar menu mobile opaco e acima do conteúdo.
- [x] Corrigir estilos do editor no modo noturno.
- [x] Fazer eventos em Hoje abrirem o modal de edição.
- [x] Melhorar layout mobile do modal "Editar evento".
- [x] Corrigir reconhecimento de "amanhã" em captura de evento/tarefa.

## Out of scope

- Alterar modelo de autenticação.
- Alterar schema de banco.
- Refatorar calendário ou editor de forma ampla.

## Grill Gate

Decision: not_needed

Reason:
As correções são inferíveis pelo comportamento existente e pelos arquivos relacionados. Não há decisão arquitetural nova; a sessão permanece JWT Credentials com maxAge de 15 dias.

Questions, if any:
1. N/A

Answers:
1. N/A

## Acceptance criteria

- [x] Login Credentials grava cookie de sessão persistente de 15 dias e middleware reconhece o mesmo segredo/cookie.
- [x] Menu sanduíche mobile cobre o conteúdo com fundo opaco em claro e escuro.
- [x] Editor no modo noturno não mostra controles/fundos incompatíveis e mantém leitura/edição legível.
- [x] Eventos listados em `/today` são clicáveis e abrem o modal de edição do evento.
- [x] Modal "Editar evento" em celular organiza datas/horários sem layout quebrado.
- [x] Atalhos com `amanhã` e `amanha` funcionam ao criar evento e tarefa.
- [x] Type-check web passa.
- [x] Validação visual mobile/dark salva screenshots em `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/`.

## Implementation plan

- [x] Aplicar ajustes pequenos nos componentes e estilos.
- [x] Rodar type-check.
- [x] Subir servidor temporário, validar telas afetadas no navegador e capturar screenshots.
- [x] Atualizar esta spec com resultados e encerrar servidor.

## Progress

- 2026-05-25 00:00 - Started context review.
- 2026-05-25 00:00 - Found NextAuth maxAge already set, Today events rendered as non-clickable cards, mobile menu hosted inside `Topbar`, event capture date regex with corrupted accent tokens, and editor dark styles relying mostly on global color overrides.
- 2026-05-25 09:28 - Implemented fixes, ran type-check, validated mobile/dark screens with Playwright, and stopped the temporary server.

## Decisions

- Decision: Keep auth model unchanged and make cookie/JWT settings explicit.
  Reason: User asked to restore previous 15-day session, not redesign auth.
  ADR needed: no

## Files changed

- `apps/web/src/auth.ts` - explicit NextAuth secret.
- `apps/web/src/middleware.ts` - same-origin auth redirect for PWA and explicit JWT secret.
- `apps/web/src/components/layout/topbar.tsx` - opaque mobile menu overlay/panel.
- `apps/web/src/app/(app)/today/page.tsx` - clickable event cards opening event edit sheet.
- `apps/web/src/components/calendar/calendar-board.tsx` - exported and improved mobile event edit sheet.
- `apps/web/src/components/calendar/calendar-event-capture.tsx` - robust `amanhã` shortcut parsing.
- `apps/web/src/components/items/quick-capture.tsx` - robust `amanhã` shortcut parsing for task capture.
- `apps/web/src/components/items/item-detail.tsx` - same parsing fix for item edit shortcuts.
- `apps/web/src/components/items/markdown-editor.tsx` - dark prose support.
- `apps/web/src/app/globals.css` - dark editor code/pre styling.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`

Results:

- `pnpm --filter @doit/web type-check` passed.
- Regex extraction check confirmed `amanhã` matches in quick capture, calendar event capture, and item detail parsers.
- Temporary server command: `pnpm --dir apps/web exec next dev --hostname 127.0.0.1 --port 3000`.
- Server port/process: `127.0.0.1:3000`, final listener PID `18300`.
- Server shutdown: stopped listener on port 3000; no listener remained.

Frontend evidence:

- `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/01-today-mobile-events-dark.png` - Today mobile with fake event route.
- `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/02-edit-event-mobile-dark.png` - edit event modal on mobile/dark.
- `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/03-mobile-menu-dark.png` - opaque hamburger menu on mobile/dark.
- `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/04-quick-capture-amanha-dark.png` - quick capture with `amanhã` input.
- `specs/artifacts/2026-05-25-corrigir-regressoes-pwa-mobile-eventos/05-note-editor-dark.png` - note editor in dark mode.

## Risks

- Risk: Visual validation may require local auth/session data.
  Mitigation: Record any blocked flows and still validate reachable UI states/screenshots.
- Risk: Playwright test accounts created local-only data while validating auth-protected screens.
  Mitigation: Used `example.invalid` addresses and did not expose or depend on real personal data.

## Next step

Review diff locally and proceed with normal dev branch flow.
