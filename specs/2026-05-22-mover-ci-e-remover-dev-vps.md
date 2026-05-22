# Mover CI e Remover Dev VPS

## Metadata

- Status: done
- Mode: architecture
- Complexity: architectural
- Created: 2026-05-22
- Updated: 2026-05-22

## Objective

Mover os gates de CI para GitHub-hosted runners e deixar a VPS apenas para deploy/runtime de producao.
Remover o ambiente remoto `dev` do Doit na VPS: services, timers, Nginx, pasta `/srv/doit/dev` e banco dev quando identificado com seguranca.

## Context

ADR-002 define que `dev` e apenas local/Git e que a VPS deve rastrear `main` para producao. Os workflows ainda usam `runs-on: self-hosted` para gates, o que roda build/audit no mesmo servidor de producao. O inventario inicial no VPS mostrou `doit-dev.service` ativo, `doit-dev-reminders.timer` ativo, site Nginx `doit-dev-tailscale` habilitado e `/srv/doit/dev` presente.

## Scope

- [x] Migrar gates de `deploy-dev.yml`, `quality.yml` e partes de qualidade/seguranca de `deploy-prod.yml` para `ubuntu-latest`.
- [x] Evitar que CI em GitHub-hosted runner leia env real de producao da VPS.
- [x] Manter deploy de producao na VPS/self-hosted somente para `main`.
- [x] Remover arquivos versionados de services/timers e Nginx de `doit-dev`.
- [x] Criar script root para remover services/timers, Nginx, `/srv/doit/dev`, banco e role dev no VPS.
- [x] Identificar o banco de dados dev sem expor secrets.
- [x] Atualizar docs/spec/ADR.

## Out of scope

- Remover producao.
- Alterar dados ou banco de producao.
- Mudar UI ou comportamento de produto.

## Grill Gate

Decision: completed

Reason:
A mudanca e arquitetural e destrutiva no ambiente dev remoto, mas o usuario confirmou explicitamente: CI deve sair da VPS e o servidor `dev` nao deve existir mais, incluindo pasta e banco.

Questions, if any:
1. Nenhuma.

Answers:
1. N/A.

## Acceptance criteria

- [x] Push/PR em `dev` roda gates em GitHub-hosted runner.
- [x] Gates nao dependem de `/srv/doit/prod/doit-config/web.env`.
- [x] Deploy em `main` continua restrito a VPS/producao.
- [x] `doit-dev.service` e timers dev ficam parados/desabilitados/removidos.
- [x] `/srv/doit/dev` e banco dev sao removidos ou ha bloqueio root documentado.
- [x] Workflow YAML e scripts passam validacao.

## Implementation plan

- [x] Revisar ADR, contexto, workflows e estado atual do servidor.
- [x] Criar modo de env seguro para CI.
- [x] Atualizar workflows para GitHub-hosted runners nos gates.
- [x] Validar localmente sintaxe/YAML.
- [x] Aplicar limpeza do dev remoto no VPS.
- [x] Commitar/pushar e acompanhar gates.
- [x] Atualizar spec com evidencias.

## Progress

- 2026-05-22 11:45 - Started context review and confirmed ADR-002 says no permanent dev VPS.
- 2026-05-22 11:45 - Found CI gates still using `self-hosted` in dev/prod/quality/security workflows.
- 2026-05-22 11:45 - Inventoried VPS: `doit-dev.service` active, `doit-dev-reminders.timer` active, `doit-dev-tailscale` Nginx site enabled, `/srv/doit/dev` present.
- 2026-05-22 11:45 - Confirmed SSH user does not have broad passwordless sudo (`sudo -n true` requires a password).
- 2026-05-22 12:00 - Added `ci` mode to `scripts/with-build-env.sh` with non-secret dummy build env values.
- 2026-05-22 12:00 - Moved dev gates, standalone quality workflow, security workflow, and prod pre-deploy gates to `ubuntu-latest`; prod deploy job remains `self-hosted`.
- 2026-05-22 12:00 - Removed versioned `doit-dev` systemd and Nginx templates.
- 2026-05-22 12:00 - Added `infra/scripts/remove-doit-dev-root.sh` for root-only live cleanup.
- 2026-05-22 12:00 - Identified dev database as `doitmd_dev` and dev role as `doit_dev` without printing credentials.
- 2026-05-22 12:00 - Attempted live service cleanup, but `sudo -n systemctl disable --now doit-dev.service doit-dev-reminders.timer` requires a password and root SSH is blocked by tailnet policy.
- 2026-05-22 12:05 - Pushed commit `1461028` to `dev`; GitHub run `26294700220` passed fully on GitHub-hosted runners.
- 2026-05-22 12:15 - Protected `main` on GitHub: PR required, required checks `Type Check, Lint & Build`, `Dependency Audit`, and `Secret Scan`, admin enforcement enabled, force pushes/deletions disabled, conversation resolution required.
- 2026-05-22 12:20 - Simplified `Deploy PROD` to deploy only; duplicated quality/security/secret scan jobs were removed because `main` is protected by required checks.
- 2026-05-22 14:05 - Pushed commit `f8e8fe5`; DEV gates run `26301308121` passed after production workflow simplification.
- 2026-05-22 14:25 - User ran the root cleanup script on the VPS. Verified `doit-dev` units are removed, Nginx dev site is gone, `/srv/doit/dev` is gone, `doitmd_dev` is gone, production health is OK, and stopped the remaining orphan process on port 8111.

## Decisions

- Decision: CI gates use GitHub-hosted `ubuntu-latest`; deploy job remains self-hosted on the VPS.
  Reason: Keeps untrusted build/audit work off the production host while preserving the existing deploy channel.
  ADR needed: yes

- Decision: CI uses dummy build-time env rather than production env.
  Reason: GitHub-hosted runners should not read or require VPS production secrets for typecheck/lint/build.
  ADR needed: yes

## Files changed

- `.github/workflows/deploy-dev.yml` - run all dev gates on GitHub-hosted Linux runners.
- `.github/workflows/deploy-prod.yml` - deploy only on the self-hosted VPS runner; CI gates are enforced by protected `main`.
- `.github/workflows/quality.yml` - run quality workflow on GitHub-hosted Linux runners.
- `.github/workflows/security.yml` - run security workflow on GitHub-hosted Linux runners.
- `scripts/with-build-env.sh` - add safe `ci` build environment and remove dev env mode.
- `scripts/deploy.sh` - remove dev deploy mode.
- `infra/systemd/doit-dev*.service|timer` - removed legacy dev units.
- `infra/nginx/sites-available/doit-dev-tailscale.conf` - removed legacy dev Nginx site.
- `infra/scripts/remove-doit-dev-root.sh` - root cleanup script for the live dev VPS runtime.
- `docs/ADR.md` - ADR-003 for CI off production VPS and dev VPS removal.
- `docs/CICD.md` - updated active CI/deploy model.
- `docs/dev-standby.md` - removed obsolete dev VPS standby guide.
- `specs/2026-05-22-mover-ci-e-remover-dev-vps.md` - living spec.

## Validation

Commands run:

- [x] `C:\Program Files\Git\bin\bash.exe -n scripts/with-build-env.sh`
- [x] `C:\Program Files\Git\bin\bash.exe -n scripts/deploy.sh`
- [x] `C:\Program Files\Git\bin\bash.exe -n infra/scripts/remove-doit-dev-root.sh`
- [x] `pnpm dlx js-yaml .github/workflows/deploy-dev.yml`
- [x] `pnpm dlx js-yaml .github/workflows/deploy-prod.yml`
- [x] `pnpm dlx js-yaml .github/workflows/quality.yml`
- [x] `pnpm dlx js-yaml .github/workflows/security.yml`
- [x] `git diff --check`
- [x] `bash scripts/with-build-env.sh ci corepack pnpm --filter @doit/web exec tsc --noEmit`
- [x] `ssh salomao-vps "sudo -n systemctl disable --now doit-dev.service doit-dev-reminders.timer ..."`
- [x] `gh run watch 26294700220 --exit-status`
- [x] `gh api --method PUT repos/lucasmef/doit.md/branches/main/protection --input -`
- [x] `pnpm dlx js-yaml .github/workflows/deploy-prod.yml`
- [x] `gh run watch 26301308121 --exit-status`
- [x] `systemctl is-active/is-enabled doit-dev.service doit-dev-reminders.timer doit-dev-calendar-sync.timer`
- [x] `ls -ld /srv/doit/dev /srv/doit/prod /srv/doit/prod/app`
- [x] `nginx -t`
- [x] `curl --fail --silent --show-error http://127.0.0.1:8110/api/health`
- [x] `ss -ltnp | grep -E ':8110|:8111'`
- [x] `select datname from pg_database where datname in ('doitmd_dev','doitmd_prod')`

Results:

- Shell syntax validation passed.
- Workflow YAML parsing passed.
- Diff whitespace check passed with only CRLF warnings from Git.
- CI-mode TypeScript check passed without reading VPS env.
- GitHub DEV gates passed on `ubuntu-latest`: Quality Gate, Security Gate, Secret Scan, and DEV gates complete.
- GitHub branch protection for `main` was applied successfully.
- Simplified production workflow YAML parsed successfully.
- DEV gates run `26301308121` passed after the simplification.
- Live cleanup completed after user ran the root script.
- `doit-dev*` systemd units are not found.
- `/srv/doit/dev` is absent.
- Nginx config test passed; only production Doit Nginx sites remain.
- Production service and reminders timer are active.
- Production healthcheck returned `{"ok":true,...}`.
- Port `8111` had one orphan `next-server` process with deleted cwd under `/srv/doit/dev`; it was stopped. Only port `8110` remains listening.
- Database query returned only `doitmd_prod`; `doitmd_dev` is gone.

Frontend evidence:

- Not required; this task does not change user-facing frontend behavior.

## Risks

- Risk: Removing dev server resources is destructive.
  Mitigation: Limit commands to `doit-dev`, `/srv/doit/dev`, Nginx `doit-dev-tailscale`, and the dev DB name parsed from dev env.
- Risk: Future deploy scripts may accidentally reintroduce a dev VPS runtime.
  Mitigation: Removed versioned dev units/Nginx template and removed dev mode from deploy scripts.

## Next step

Optionally remove redundant `push: [main]` triggers from standalone `Quality` and `Security` workflows if production pushes should only run `Deploy PROD`.
