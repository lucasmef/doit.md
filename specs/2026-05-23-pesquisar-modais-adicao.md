# Pesquisa: modais de adicao

## Metadata

- Status: done
- Mode: research
- Complexity: low
- Created: 2026-05-23
- Updated: 2026-05-23

## Objective

Verificar se ja existe documentacao viva sobre ajustar o modal de adicao no mobile e no desktop, especialmente a conversa sobre hoje haver mais de um modal/overlay de adicao.

## Context

Existe uma spec relacionada a calendario e quick add em `specs/2026-05-22-calendario-adicao-eventos.md`. Ela documenta a criacao do modal global `CalendarEventCapture`, o botao de calendario dentro do `QuickCapture`, atalhos e validacao visual desktop/mobile.

Nao foi encontrada uma spec dedicada a unificar ou redesenhar os modais de adicao no mobile e no PC. A implementacao atual renderiza `QuickCapture` e `CalendarEventCapture` globalmente no layout da area logada, e tambem usa `DialogProvider` para confirmacoes/prompts genericos.

## Scope

- [x] Procurar specs e docs existentes sobre modal, quick add, criacao e mobile/desktop.
- [x] Conferir componentes relevantes de UI.
- [x] Responder se ha documentacao dedicada para a mudanca conversada.

## Out of scope

- Alterar codigo dos modais.
- Propor redesign completo.
- Rodar validacao visual, pois nao houve alteracao frontend.

## Grill Gate

Decision: not_needed

Reason:
A pergunta e investigativa e pode ser respondida pela documentacao e pelo codigo existente, sem decisao de produto ou arquitetura.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Identificar se existe spec dedicada.
- [x] Identificar docs relacionadas.
- [x] Registrar achados em uma living spec.

## Implementation plan

- [x] Ler contexto BuilderFlow.
- [x] Buscar referencias em `specs/`, `docs/` e componentes relevantes.
- [x] Criar esta spec curta de pesquisa.

## Progress

- 2026-05-23 - Revisados `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md` e specs existentes.
- 2026-05-23 - Encontrada spec relacionada: `specs/2026-05-22-calendario-adicao-eventos.md`.
- 2026-05-23 - Nao encontrada spec dedicada a unificacao/ajuste dos tres modais de adicao.
- 2026-05-23 - Conferidos `QuickCapture`, `CalendarEventCapture`, layout global e buscas por overlays/dialogs.

## Decisions

- Decision: tratar este pedido como pesquisa, sem alterar codigo.
  Reason: o usuario perguntou se havia documentacao, nao pediu implementacao.
  ADR needed: no

## Files changed

- `specs/2026-05-23-pesquisar-modais-adicao.md` - registra a resposta investigativa no formato BuilderFlow.

## Validation

Commands run:

- [x] `rg -n -i "modal|adicionar|quick add|mobile|desktop" specs docs apps packages .agents -g "*.md" -g "*.tsx" -g "*.ts"`
- [x] `rg -n -i "3 modais|tres modais|unific|quick add|calendar-event-capture|modal.*evento" specs docs apps/web/src/components apps/web/src/app -g "*.md" -g "*.tsx" -g "*.ts"`

Results:

- Buscas localizaram specs relacionadas a calendario/quick add e smoke visual, mas nenhuma spec dedicada a unificar os modais de adicao.
- Nenhum teste automatizado foi necessario, pois nao houve alteracao de codigo.

Frontend evidence:

- Skipped: pesquisa/documentacao sem mudanca visual.

## Risks

- Risk: a conversa anterior pode estar fora do repositorio e nao aparecer em `specs/` ou `docs/`.
  Mitigation: resposta distingue documentacao existente no repo de memoria/conversa externa.

## Next step

Se a tarefa for seguir com o ajuste, criar ou atualizar uma spec dedicada para consolidar o fluxo de adicao em mobile e desktop antes de implementar.
