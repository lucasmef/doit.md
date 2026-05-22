# Calendario: adicao de eventos integrada

## Metadata

- Status: done
- Mode: build
- Complexity: high
- Created: 2026-05-22
- Updated: 2026-05-22

## Objective

Integrar a criacao de eventos do Google Calendar ao fluxo principal de adicao do doit.md, mantendo tarefa/nota separadas de evento. Corrigir o carregamento visual das cores dos eventos, melhorar o modal de novo evento, adicionar configuracoes de calendario padrao e duracao padrao, e expor atalhos/navegacao para uso no desktop e mobile.

## Context

O app usa `QuickCapture` para criar tarefas/notas e `CalendarBoard` para listar/criar eventos. Eventos sao criados em `/api/calendar/events` e renderizados por `CalendarGrid`. As cores dos calendarios chegam por `/api/calendar/calendars`, o que fazia os eventos aparecerem primeiro com a cor padrao antes da cor real. Preferencias locais ficam em `use-preferences`.

## Scope

- [x] Corrigir primeira renderizacao das cores dos eventos usando cache local de calendarios.
- [x] Adicionar abertura global de novo evento de calendario pelo quick add e pelo atalho `c`.
- [x] Melhorar o modal de novo evento com atalhos de data/hora no titulo, calendario padrao e duracao padrao.
- [x] Adicionar configuracoes de calendario padrao e duracao padrao.
- [x] Adicionar botao para voltar ao mes atual no calendario fullscreen ao lado do menu.

## Out of scope

- Converter notas/lembretes existentes em eventos.
- Alterar schema de banco de dados.
- Alterar arquitetura de sync ou Google OAuth.

## Grill Gate

Decision: not_needed

Reason:
As regras pedidas podem ser inferidas pelos fluxos existentes: preferencias em localStorage, evento como entidade separada de item, API ja existente para criar evento, e modal atual de evento como base. Nao ha alteracao de schema nem decisao arquitetural.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Eventos usam a cor real do calendario na primeira renderizacao quando a cor ja foi carregada antes.
- [x] O quick add tem entrada visual para criar evento de calendario sem transformar nota/tarefa.
- [x] Pressionar `c` sem foco em input/modal abre o novo modal de evento.
- [x] O modal aceita atalhos de data/hora no titulo e define fim automaticamente pela duracao padrao.
- [x] Preferencias permitem escolher calendario padrao e duracao padrao.
- [x] Calendario fullscreen tem botao de voltar ao mes atual ao lado do menu.
- [x] Type-check web passa ou falhas sao documentadas.
- [x] Validacao visual com servidor local e screenshots e registrada.

## Implementation plan

- [x] Adicionar preferencias locais para calendario padrao e duracao padrao.
- [x] Criar componente global de captura de evento reutilizavel.
- [x] Conectar UI global, quick capture, atalho `c` e CalendarBoard ao novo componente.
- [x] Ajustar cache de calendarios e cores renderizadas.
- [x] Atualizar configuracoes e modal de atalhos.
- [x] Validar type-check e UI local.

## Progress

- 2026-05-22 15:05 - Contexto BuilderFlow, regras doit.md e arquivos de calendario/quick add revisados.
- 2026-05-22 15:10 - Identificado que `CalendarBoard` mantem `NewEventSheet` local e `QuickCapture` ainda so alterna tarefa/nota.
- 2026-05-22 17:20 - Implementado estado global para captura de evento, componente `CalendarEventCapture`, preferencias e atalho `c`.
- 2026-05-22 17:24 - `pnpm --filter @doit/web type-check` falhou por expressao ambigua com `??`/`||`; corrigido.
- 2026-05-22 17:25 - Type-check passou.
- 2026-05-22 17:40 - Servidor local temporario iniciado para validacao visual. Primeira tentativa com `pnpm --filter @doit/web dev -- --port 3000` falhou porque o argumento foi repassado como diretorio do Next.
- 2026-05-22 17:41 - Servidor iniciado com `pnpm --filter @doit/web exec next dev -p 3000`; processo escutando em `3000` com PID `18620`.
- 2026-05-22 17:45 - Browser integrado `iab` indisponivel; validacao visual feita com Chrome local headless e DevTools remoto.
- 2026-05-22 17:55 - Screenshots capturados e servidor/Chrome encerrados. Porta `3000` confirmada livre.

## Decisions

- Decision: evento de calendario sera um fluxo separado, aberto pelo quick add e por estado global.
  Reason: o usuario indicou que nota e lembrete nao precisam virar calendario; separar reduz risco e evita alterar modelo de Item.
  ADR needed: no

- Decision: preferencias de calendario padrao e duracao padrao ficam em `localStorage`.
  Reason: ja existe `use-preferences` para preferencias de UI/calendario, sem exigir schema novo.
  ADR needed: no

## Files changed

- `apps/web/src/components/calendar/calendar-event-capture.tsx` - novo modal global de criacao de evento.
- `apps/web/src/store/ui.ts` - estado global para abrir captura de evento.
- `apps/web/src/store/ui-provider.tsx` - atalho `c` e handlers globais de evento.
- `apps/web/src/app/(app)/layout.tsx` - renderiza captura global de evento.
- `apps/web/src/components/items/quick-capture.tsx` - adiciona botao de calendario no quick add.
- `apps/web/src/components/calendar/calendar-board.tsx` - abre captura global e adiciona botao de mes atual ao header fullscreen.
- `apps/web/src/hooks/use-preferences.ts` - preferencias de calendario padrao e duracao padrao.
- `apps/web/src/hooks/use-calendar-events.ts` - cache local de calendarios para cores iniciais.
- `apps/web/src/app/(app)/settings/page.tsx` - configuracoes de calendario padrao/duracao e atalho.
- `apps/web/src/components/layout/shortcut-help-modal.tsx` - documenta atalho `c`.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/` - evidencias visuais.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`

Results:

- `pnpm --filter @doit/web type-check` - passed after correcting the `??`/`||` expression.
- Local server command for UI validation: `pnpm --filter @doit/web exec next dev -p 3000`.
- Server process: PID `18620` in first completed visual run; restarted once for retaking screenshot `02` with PID `1508`.
- Shutdown result: server and Chrome headless processes stopped; port `3000` confirmed free.
- Browser note: Codex in-app browser `iab` was unavailable, so validation used local Chrome headless with DevTools remote control.

Frontend evidence:

- `specs/artifacts/2026-05-22-calendario-adicao-eventos/01-calendar-desktop.png` - calendario desktop/fullscreen.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/02-new-event-shortcut-modal.png` - atalho `c`, modal de evento, parsing `hoje as 14h`, fim automatico `14:30`.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/03-quick-add-calendar-button.png` - quick add com botao de calendario ao lado de nota.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/04-quick-add-opens-event-modal.png` - botao de calendario abre o modal global.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/05-calendar-preferences.png` - preferencias de calendario padrao e duracao padrao.
- `specs/artifacts/2026-05-22-calendario-adicao-eventos/06-calendar-mobile-today-button.png` - calendario mobile com botao de mes atual ao lado do menu.

## Risks

- Risk: a criacao de evento depende de Google Calendar conectado.
  Mitigation: manter mensagens de erro existentes da API/hook no modal.

- Risk: cache local de calendarios pode ficar defasado.
  Mitigation: SWR atualiza o cache assim que a API responder.

## Next step

Revisar diff localmente e seguir para commit/push quando aprovado.
