# Validação Manual de Usabilidade

## Metadata

- Status: in_progress
- Mode: research
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Realizar testes manuais/automatizados via Playwright focando em mobile e desktop para encontrar erros de usabilidade, fluxos quebrados ou funcionalidades não implementadas no novo layout.

## Context

Foi solicitado um pente-fino nas telas migradas (`/dashboard`, `/today`, `/upcoming`, `/notas`, `/notas/[id]`) para detectar bugs ou fluxos incompletos.

## Scope

- [x] Testar carregamento de telas desktop.
- [x] Testar interações principais (criar item, concluir item).
- [x] Testar responsividade mobile.
- [x] Registrar bugs ou gaps funcionais.

## Grill Gate

Decision: not_needed

Reason: Escopo investigativo bem delimitado.

## Progress

- 2026-05-28 00:43 - Criado arquivo de especificação. Planejando execução via Playwright.
- 2026-05-28 00:44 - Testes automatizados escritos e executados cobrindo Desktop e Mobile.
- 2026-05-28 00:45 - Evidências visuais (screenshots) coletadas.

## Validation

- Playwright tests run via CLI.
- Nenhuma falha severa de hidratação ou erro 500 no carregamento do Dashboard, Today, Upcoming e Notas.
- **Bug/Gap detetado no script**: A criação de nota na página de notas não encontrou um link nativo `/notas/nova`. O fluxo atual utiliza `openCapture('note')` num botão sem âncora `href`, o que pode ser um pequeno anti-pattern de usabilidade (se o usuário quiser abrir numa nova tab, não consegue).

Frontend evidence:
- `specs/artifacts/2026-05-28-validacao-manual-ui/01-desktop-today.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/02-desktop-quick-capture.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/03-desktop-dashboard.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/04-desktop-upcoming.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/05-desktop-notas.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/07-mobile-today.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/08-mobile-dashboard.png`
- `specs/artifacts/2026-05-28-validacao-manual-ui/09-mobile-notas.png`

## Risks

- Acessibilidade: Fluxos baseados puramente no context API (`setSingleSelection`, `openCapture`) em detrimento de navegação via URL dificultam compartilhamento de links diretos para abertura de modais.

## Next step

Concluir e entregar relatório ao usuário, finalizando o fluxo de validação.
