# Regra de evidências visuais (prints) para correções com validação visual

## Metadata

- Status: review
- Mode: build (documentação/processo)
- Complexity: low
- Created: 2026-05-29
- Updated: 2026-05-29

## Objective

Padronizar, em `AGENTS.md` e na skill `BuilderFlow`, que qualquer agente (Codex, Gemini, Antigravity,
Claude) que faça uma correção de código com impacto visual deve gerar um print comprovando o resultado,
salvá-lo no projeto (em `specs/artifacts/`) e copiá-lo também para a pasta global `G:\.agentes`.

## Context

- `AGENTS.md` já tem a seção "Execução Local e Testes de Usabilidade" exigindo screenshots em
  `specs/artifacts/<spec-slug>/`. Falta a cópia para a pasta global e o gatilho explícito.
- A skill BuilderFlow tem "Frontend-impact validation" exigindo screenshots em `specs/artifacts/`.
  Falta a cópia global e a regra de decisão.
- Fonte versionada da skill: `.agents/skills/builderflow/SKILL.md`. Cópia local p/ Claude Code:
  `.claude/skills/builderflow/SKILL.md` (sincronizada).
- A raiz `G:\` é o mount virtual do Google Drive (somente-leitura): `G:\.agentes` não pôde ser criada
  nesta sessão. Mantido o caminho literal pedido pelo usuário; alvo real pode ser `G:\Meu Drive\.agentes`
  (ponto de revisão manual).

## Grill Gate

Decision: not_needed

Reason: caminho global e locais informados; naming/dados-sensíveis com defaults sensatos. Sem decisão
arquitetural/dados/auth. Não é ADR (convenção de processo, não infra).

## Decisões técnicas

- Gatilho ("quando gerar print"): quando a correção afeta UI visível (layout, navegação, estados
  visuais, formulários, telas) e o resultado precisa ser comprovado. Mudanças sem impacto visual
  (lógica pura, infra, testes, build) não exigem print.
- Local no projeto: `specs/artifacts/<slug-da-tarefa>/` (padrão já usado).
- Cópia global: raiz de `G:\.agentes` (criar se não existir).
- Naming simples (sem rigidez): `<projeto>-<tela|area>-<AAAA-MM-DD>[-n].png`
  (ex.: `doitmd-today-2026-05-29.png`) — deve deixar claro projeto/tela/correção.
- Dados sensíveis: usar dados de teste/seed; evitar e-mails reais, tokens, segredos; ocultar se preciso.

## Implementation plan

- [x] Adicionar a regra em `AGENTS.md` (nova subseção na execução local).
- [x] Adicionar a regra na skill `BuilderFlow` (`.agents/skills/builderflow/SKILL.md`).
- [x] Sincronizar a cópia `.claude/skills/builderflow/SKILL.md`.
- [x] Tentar criar `G:\.agentes` (falhou: raiz do Drive read-only) → documentar e flag manual.

## Files changed

- `AGENTS.md` — subseção "Evidências visuais (prints) e cópia global".
- `.agents/skills/builderflow/SKILL.md` — regra na "Frontend-impact validation".
- `.claude/skills/builderflow/SKILL.md` — espelho da skill (local Claude Code).
- `specs/2026-05-29-regra-prints-validacao-visual.md` — esta spec.

## Validation

- Edições de documentação; sem checks de código necessários.
- Criação de `G:\.agentes`: **falhou** (mount do Drive read-only na raiz) — requer ação manual do usuário.

## Risks

- Risk: `G:\.agentes` pode não existir / não ser gravável em todas as máquinas/sessões.
  Mitigation: regra instrui a criar a pasta; se indisponível, registrar no spec e não bloquear a entrega.

## Next step

Usuário confirmar o caminho global correto (`G:\.agentes` vs `G:\Meu Drive\.agentes`) e criar a pasta.
