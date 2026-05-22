# Simplificar Workflow de Deploy

## Metadata

- Status: done
- Mode: architecture
- Complexity: architectural
- Created: 2026-05-22
- Updated: 2026-05-22

## Objective

Simplificar o fluxo de desenvolvimento e deploy para quatro estados claros:
`dev local`, `dev git`, `main git` e `main vps`.

O fluxo desejado e: mexe em dev local, homologa local, commita para dev git, roda gates, merge para main e deploy na VPS.

## Context

`docs/CONTEXT.md` e a policy do BuilderFlow ja indicavam que `dev` deve ser local/Git e `main` deve ser producao. `docs/CICD.md`, `.github/workflows/deploy-dev.yml` e `docs/dev-standby.md` ainda descreviam um ambiente dev na VPS, criando ambiguidade operacional.

## Scope

- [x] Registrar a decisao arquitetural em ADR.
- [x] Atualizar a documentacao de CI/CD para o fluxo simplificado.
- [x] Fazer o push em `dev` rodar gates sem deploy na VPS.
- [x] Fazer o deploy de producao partir de `main`.
- [x] Marcar a documentacao de dev na VPS como historica/legada.
- [x] Remover dependencias de setup/gates em env ou services de dev na VPS.

## Out of scope

- Remover scripts ou units legadas de dev da VPS.
- Alterar secrets ou configuracao real do servidor.
- Fazer deploy real.

## Grill Gate

Decision: completed

Reason:
A mudanca e arquitetural, mas o usuario deu o fluxo alvo explicitamente. A implementacao ficou restrita a documentacao e workflows versionados.

Questions, if any:
1. Nenhuma.

Answers:
1. N/A.

## Acceptance criteria

- [x] A documentacao nomeia apenas `dev local`, `dev git`, `main git` e `main vps` como fluxo ativo.
- [x] Push em `dev` nao faz deploy na VPS.
- [x] Merge/push em `main` aciona deploy de producao na VPS.
- [x] ADR registra que nao ha dev permanente na VPS.
- [x] Validacao YAML/documental concluida.

## Implementation plan

- [x] Revisar docs e workflows existentes.
- [x] Atualizar ADR e docs.
- [x] Atualizar GitHub Actions.
- [x] Validar sintaxe e revisar diff.

## Progress

- 2026-05-22 10:48 - Started context review and found conflicting dev VPS documentation.
- 2026-05-22 10:48 - Created living spec for the deploy workflow simplification.
- 2026-05-22 10:48 - Updated ADR, CI/CD docs, legacy dev standby docs, and GitHub Actions workflows.
- 2026-05-22 10:48 - Validated workflow YAML parsing and whitespace.
- 2026-05-22 10:48 - Removed active dev VPS setup references from setup docs/scripts and gates.
- 2026-05-22 10:48 - Validated shell syntax for changed infra scripts.

## Decisions

- Decision: `dev` is only local development plus Git validation; production is `main` plus VPS.
  Reason: Reduces operational states and matches the user-requested workflow.
  ADR needed: yes

## Files changed

- `docs/ADR.md` - architectural deploy workflow decision.
- `docs/CICD.md` - active CI/CD workflow.
- `docs/dev-standby.md` - legacy note for old dev VPS flow.
- `docs/VPS_SETUP.md` - VPS setup now documents prod-only runtime.
- `.github/workflows/deploy-dev.yml` - dev gates only, no VPS deploy.
- `.github/workflows/deploy-prod.yml` - deploy production from `main`.
- `.github/workflows/quality.yml` - build gate uses prod build env instead of dev VPS env.
- `infra/setup-vps.sh` - setup installs prod runtime only.
- `infra/scripts/install-doit-systemd-units-root.sh` - installs prod units/timers only.
- `infra/scripts/enable-doit-public-tls-root.sh` - TLS helper reads Nginx template from prod app checkout.
- `infra/env/web.env.example` - env copy target points to prod.
- `infra/sudoers/doit-actions` - deploy sudoers no longer include dev service commands.
- `specs/2026-05-22-simplificar-workflow-deploy.md` - living spec.

## Validation

Commands run:

- [x] `git diff --check`
- [x] `pnpm dlx js-yaml .github/workflows/deploy-dev.yml`
- [x] `pnpm dlx js-yaml .github/workflows/deploy-prod.yml`
- [x] `pnpm dlx js-yaml .github/workflows/quality.yml`
- [x] `pnpm dlx js-yaml .github/workflows/security.yml`
- [x] `bash -n infra/setup-vps.sh`
- [x] `bash -n infra/scripts/install-doit-systemd-units-root.sh`
- [x] `bash -n infra/scripts/enable-doit-public-tls-root.sh`

Results:

- `git diff --check` passed. It only reported LF/CRLF normalization warnings.
- YAML parsing passed for the workflow files listed above.
- Shell syntax validation passed for the changed infra scripts.

Frontend evidence:

- Not required; this task does not change user-facing frontend behavior.

## Risks

- Risk: Existing dev VPS scripts/units remain in the repo and can confuse future work.
  Mitigation: Marked dev VPS docs as legacy; did not remove scripts in this pass to keep the change reversible.

## Next step

Review the diff, then push `dev`; after gates pass, merge `dev` into `main` to deploy production.
