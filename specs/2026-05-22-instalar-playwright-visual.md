# Instalar Playwright para testes visuais

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-22
- Updated: 2026-05-22

## Objective

Adicionar Playwright ao `apps/web` para tornar validacoes visuais e fluxos mobile/desktop mais simples, repetiveis e menos dependentes de scripts ad hoc com Chrome DevTools. Incluir um teste smoke pequeno que cria usuario fake, abre calendario, quick add e modal de evento, salvando screenshots em `specs/artifacts/`.

## Context

O monorepo usa pnpm 9 e `apps/web` com Next.js 15. Atualmente nao ha Playwright/e2e configurado. A validacao visual anterior foi feita com Chrome headless manual porque o navegador integrado nao estava disponivel. `docs/local-testing.md` permite servidor temporario, dados fake em `example.invalid`, screenshots e encerramento do processo.

## Scope

- [x] Instalar `@playwright/test` no app web.
- [x] Instalar navegador Chromium do Playwright.
- [x] Criar config Playwright com servidor local temporario.
- [x] Criar teste visual smoke de captura/calendario.
- [x] Adicionar scripts no `apps/web/package.json`.
- [x] Validar type-check e teste Playwright.

## Out of scope

- Cobertura completa de todos os fluxos do app.
- Rodar Playwright em CI.
- Testes com Google Calendar real ou dados pessoais.

## Grill Gate

Decision: not_needed

Reason:
O usuario pediu explicitamente para fazer a instalacao. A configuracao pode ser pequena e local ao app web, usando dados fake e sem mudar fluxo de deploy/CI.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `@playwright/test` aparece como dev dependency do `apps/web`.
- [x] Chromium do Playwright esta instalado localmente.
- [x] `pnpm --filter @doit/web test:visual` executa um smoke visual e salva screenshots.
- [x] O servidor usado pelo teste e iniciado/encerrado pelo Playwright.
- [x] `pnpm --filter @doit/web type-check` passa.

## Implementation plan

- [x] Instalar dependencia e navegador.
- [x] Adicionar scripts e `playwright.config.ts`.
- [x] Criar teste `e2e/visual-capture.spec.ts`.
- [x] Rodar validacoes e atualizar esta spec.

## Progress

- 2026-05-22 18:36 - Contexto carregado; nao havia Playwright/e2e no repo.
- 2026-05-22 20:01 - Playwright instalado, smoke visual criado e validado em Chromium desktop/mobile.

## Decisions

- Decision: instalar Playwright apenas no `apps/web`.
  Reason: os testes visuais cobrem a UI web e mantem a dependencia fora dos pacotes compartilhados.
  ADR needed: no

- Decision: usar Chromium apenas.
  Reason: reduz tamanho/tempo de instalacao e cobre o principal ganho para validacao automatizada local.
  ADR needed: no

## Files changed

- `package.json`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/playwright.config.ts`
- `apps/web/e2e/visual-capture.spec.ts`
- `specs/artifacts/2026-05-22-playwright-smoke/`

## Validation

Commands run:

- `pnpm --filter @doit/web add -D @playwright/test`
- `pnpm --filter @doit/web exec playwright install chromium`
- `pnpm --filter @doit/web type-check`
- `pnpm --filter @doit/web test:visual`
- `pnpm --filter @doit/web type-check`
- `Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue`

Results:

- Type-check passou.
- Playwright smoke passou em `chromium-desktop` e `chromium-mobile`.
- Nenhum processo ficou ouvindo na porta 3100 apos o teste.

Frontend evidence:

- `specs/artifacts/2026-05-22-playwright-smoke/chromium-desktop-01-calendar.png`
- `specs/artifacts/2026-05-22-playwright-smoke/chromium-desktop-02-event-modal.png`
- `specs/artifacts/2026-05-22-playwright-smoke/chromium-desktop-03-quick-capture.png`
- `specs/artifacts/2026-05-22-playwright-smoke/chromium-mobile-01-calendar.png`
- `specs/artifacts/2026-05-22-playwright-smoke/chromium-mobile-02-event-modal.png`
- `specs/artifacts/2026-05-22-playwright-smoke/chromium-mobile-03-quick-capture.png`

## Risks

- Risk: Playwright baixa binarios grandes localmente.
  Mitigation: instalar somente Chromium.

- Risk: smoke test cria usuarios fake no banco local.
  Mitigation: usar dominio reservado `example.invalid` e dados artificiais.

## Next step

Opcional: adicionar este smoke ao CI quando o tempo de execucao e o banco de teste estiverem aceitaveis para pipeline.
