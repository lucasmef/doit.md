# Instalar skill devdeploy

## Metadata

- Status: done
- Mode: build
- Complexity: low
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Instalar uma skill local chamada `devdeploy` no repositorio `doit.md`, seguindo o padrao de `.agents/skills/`, para orientar investigacoes e correcoes de CI/CD, gates em `dev`, deploy em `main` e runtime na VPS.

## Context

O repositorio ja usa skills locais em `.agents/skills/`, incluindo `builderflow`. O contexto duravel define o fluxo `dev local -> dev git -> main git -> main vps`, sem ambiente `dev` persistente na VPS. O deploy de producao usa `main`, systemd/Nginx no VPS e healthcheck local em `http://127.0.0.1:8110/api/health`.

## Scope

- [x] Criar `.agents/skills/devdeploy/SKILL.md`.
- [x] Adaptar a skill ao fluxo de deploy documentado em `docs/CONTEXT.md`, `docs/ADR.md` e `docs/CICD.md`.
- [x] Liberar a skill no `.gitignore` para que ela possa ser versionada.
- [x] Registrar a instalacao em uma spec viva.

## Out of scope

- Alterar workflows de CI/CD.
- Alterar `AGENTS.md`.
- Instalar ou modificar dependencias.
- Validar frontend no navegador, pois a mudanca nao afeta interface.

## Grill Gate

Decision: not_needed

Reason:
O pedido foi objetivo e a intencao inferivel pelo padrao local do repositorio. Nao havia decisao de arquitetura ou multiplos caminhos com impacto operacional.

Questions, if any:
1. N/A

Answers:
1. N/A

## Acceptance criteria

- [x] A skill local existe em `.agents/skills/devdeploy/SKILL.md`.
- [x] O frontmatter declara `name: devdeploy`.
- [x] A skill menciona o fluxo `dev local -> dev git -> main git -> main vps`.
- [x] A skill inclui regras de seguranca para segredos, VPS e deploy.
- [x] `.agents/skills/devdeploy/SKILL.md` aparece no `git status`.

## Implementation plan

- [x] Revisar contexto do projeto e deploy.
- [x] Criar skill local `devdeploy`.
- [x] Ajustar `.gitignore` para permitir versionamento da skill local.
- [x] Atualizar spec com validacao.

## Progress

- 2026-05-28 09:21 - Revisado `docs/CONTEXT.md`, `docs/ADR.md`, `docs/CICD.md` e skill global relacionada `fix-dev-deploy`.
- 2026-05-28 09:21 - Criada a skill local `devdeploy` com comandos, fluxo e criterios de conclusao especificos do projeto.
- 2026-05-28 09:21 - Verificado que `.agents/skills/*` estava ignorado e adicionada excecao para `devdeploy`.

## Decisions

- Decision: instalar como skill local do projeto em `.agents/skills/devdeploy`.
  Reason: o usuario pediu instalacao "no projeto", e o repositorio ja usa `.agents/skills/` para skills versionadas.
  ADR needed: no

## Files changed

- `.agents/skills/devdeploy/SKILL.md` - nova skill local para investigacao e reparo de deploy/CI.
- `.gitignore` - excecao para versionar a skill local `devdeploy`.
- `specs/2026-05-28-instalar-skill-devdeploy.md` - spec viva da instalacao.

## Validation

Commands run:

- [x] `git status --short --branch`
- [x] `git check-ignore -v .agents\skills\devdeploy\SKILL.md`
- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm build`

Results:

- `git status --short --branch` confirmou branch `dev`.
- `git check-ignore` identificou que `.agents/skills/*` ignorava a skill antes do ajuste.
- Lint/typecheck/build nao foram executados porque a mudanca adiciona apenas documentacao/skill Markdown e nao altera codigo executavel.

Frontend evidence:

- Nao aplicavel; a mudanca nao altera UI, layout, navegacao ou estado visual.

## Risks

- Risk: Codex pode exigir reinicio/recarga para reconhecer uma nova skill local.
  Mitigation: informar no resumo final.

## Next step

Reiniciar ou recarregar Codex para que a nova skill local seja descoberta em sessoes futuras.
