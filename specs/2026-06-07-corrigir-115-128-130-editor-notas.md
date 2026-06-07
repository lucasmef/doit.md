# Corrigir IDs 115, 128, 129 e 130 - Editor de notas

## Metadata

- Status: review
- Mode: bugfix
- Complexity: medium
- Created: 2026-06-07
- Updated: 2026-06-07

## Objective

Corrigir regressões pontuais do editor novo de notas envolvendo modo foco com zoom
real do navegador, calculo de progresso, outline e checklist visual em headings H1-H3.
Preservar Markdown salvo, outline, retracao/expansao, versionamento, impressao e
comportamento desktop/mobile.

## Context

- BuilderFlow foi carregado antes da implementacao.
- A implementacao dos IDs 124-127 ja criou `note-headings.ts`, `HeadingCheckbox` e
  outline derivado do Markdown; esta tarefa deve preservar esse comportamento.
- O progresso atual em `notas/[id]/page.tsx` conta somente linhas `- [ ]` e ignora
  headings `# [ ]`, `## [ ]` e `### [ ]`.
- O checkbox de heading usa decoracao TipTap e marcador Markdown oculto, mas o estado
  concluido ainda nao aplica visual de texto riscado/cinza ao node do heading.
- O outline ja renderiza checkbox visual para headings com checklist; sera validado e
  ajustado somente se necessario, sem reabrir os IDs 124-127 confirmados como OK.
- O modo foco remove rails laterais, mas toolbar/topbar usam tamanhos em CSS px que
  aumentam junto com zoom real do navegador.

## Scope

- [x] ID 115 - limitar crescimento visual de topbar/toolbar/botoes/cabecalho no modo foco com zoom real.
- [x] ID 128 - recalcular progresso com checklists comuns e headings com checklist.
- [x] ID 129 - garantir checkbox visual no outline, sem `[x]` ou `[ ]` como texto.
- [x] ID 130 - padronizar checkbox azul e aplicar riscado/cinza em H1/H2/H3 concluidos.

## Out of scope

- Checklist em H4-H6.
- Refatoracao ampla do editor TipTap ou do layout de notas.
- Mudancas de schema, banco, API protegida, sync ou campos de Item protegidos.
- Reabrir itens ja confirmados como OK fora dos IDs solicitados.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e a base tecnica ja existe no editor. As correcoes podem ser
feitas de forma local no parser/progresso, na decoracao visual dos headings e no layout
do modo foco sem decisao arquitetural.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] O conteudo da nota aumenta com zoom real no navegador em modo foco.
- [x] Topbar, toolbar, botoes e cabecalho do modo foco mantem tamanho controlado.
- [x] O editor normal continua sem compensacao de zoom especifica do modo foco.
- [x] Progresso recalcula ao marcar/desmarcar checklist comum.
- [x] Progresso recalcula ao marcar/desmarcar checklist em H1, H2 e H3.
- [x] Progresso persiste ao sair e voltar para a nota.
- [x] Outline mostra checkbox visual para headings com checklist e nao mostra `[x]`/`[ ]`.
- [x] Headings sem checklist nao exibem checkbox no outline.
- [x] Checkbox em H1/H2/H3 usa o padrao azul da interface.
- [x] Heading marcado fica riscado e cinza; desmarcado volta ao visual normal.
- [x] Retracao/expansao, versionamento, impressao, Markdown salvo e mobile/desktop nao sofrem regressao.

## Implementation plan

- [x] ID 128: mover/ajustar calculo de progresso para contar linhas de checklist comuns e headings H1-H3 fora de blocos de codigo.
- [x] ID 130: adicionar estado visual no node heading decorado quando `[x]` estiver marcado.
- [x] ID 129: revisar outline para manter texto limpo e checkbox visual sincronizado.
- [x] ID 115: aplicar escala inversa limitada apenas nos controles do modo foco usando variavel CSS derivada do zoom real da janela.
- [x] Adicionar roteiro Playwright focado para progresso, outline, visual dos headings e modo foco.
- [x] Rodar type-check/lint/build disponiveis.
- [x] Validar frontend com servidor temporario, screenshots no projeto e tentativa de copia global.

## Progress

- 2026-06-07 - BuilderFlow, AGENTS, CONTEXT, ADR e specs 124-127 revisados.
- 2026-06-07 - Causa inicial localizada: progresso conta somente `- [ ]`; heading concluido nao decora node com estado visual.
- 2026-06-07 - Progresso movido para helper compartilhado que conta tarefas comuns e headings H1-H3, ignorando fences.
- 2026-06-07 - Heading concluido agora recebe checkbox azul, texto cinza e riscado via decoracao inline.
- 2026-06-07 - Modo foco recebeu compensacao limitada de UI baseada em `devicePixelRatio`.
- 2026-06-07 - Roteiro `validate-115-128-130.mjs` passou com 12 PASS / 0 FAIL.
- 2026-06-07 - Browser headed validou aumento de DPR 1.0 -> 1.5 com escala de controles 1 -> 0.74.
- 2026-06-07 - Servidor temporario 3412 encerrado e porta confirmada sem listener.

## Decisions

- Decision: manter checklist de heading como Markdown textual `[ ]`/`[x]`.
  Reason: preserva compatibilidade com editor novo, Markdown salvo, outline e retracao.
  ADR needed: no
- Decision: aplicar compensacao de zoom somente em modo foco.
  Reason: o usuario pediu ajuste para modo foco e isso evita impacto no editor normal.
  ADR needed: no
- Decision: contar progresso por linhas Markdown fora de fences, nao pelo DOM do outline.
  Reason: evita duplicar checklist de heading entre conteudo e outline e preserva persistencia.
  ADR needed: no
- Decision: usar `#2F6BFF` para checkbox marcado em heading e outline.
  Reason: alinha com o padrao azul pedido e mantem contraste claro.
  ADR needed: no

## Files changed

- `apps/web/src/lib/note-headings.ts` - helper de progresso e regexes de checklist.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - usa progresso compartilhado e escala de UI do modo foco.
- `apps/web/src/components/items/heading-checkbox-extension.ts` - decoracao visual de heading concluido.
- `apps/web/src/components/items/markdown-editor.tsx` - marca toolbar como UI compensavel no modo foco.
- `apps/web/src/app/globals.css` - estilos de zoom controlado, checkbox azul e texto riscado/cinza.
- `specs/validate-115-128-130.mjs` - roteiro de validacao automatizada.
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/` - evidencias e logs.
- `specs/2026-06-07-corrigir-115-128-130-editor-notas.md` - living spec.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `node specs/validate-115-128-130.mjs`
- [x] Browser headed DPR validation

Results:

- `pnpm --filter @doit/web type-check` passou antes e depois da limpeza final.
- `pnpm --filter @doit/web lint` passou com warnings preexistentes de `img`, hooks e `next lint` deprecated.
- `pnpm --filter @doit/web build` compilou, validou tipos e gerou 21/21 paginas; falhou apenas na copia standalone por `EPERM` ao criar symlinks no Windows, comportamento ja observado no projeto.
- `node specs/validate-115-128-130.mjs` passou com 12 PASS / 0 FAIL.
- Browser headed com aumento de DPR validou `devicePixelRatio` 1.0 -> 1.5, `--note-focus-ui-scale` 1 -> 0.74, topbar 56 -> 41.44 e toolbar 46.8 -> 34.83.
- Tentativas de acionar zoom nativo `Ctrl+=` via Browser interno, Playwright headed e `SendKeys` nao alteraram `devicePixelRatio` no Chromium automatizado; por isso a revisao manual deve confirmar o atalho real no navegador do usuario.
- Servidor: `pnpm --filter @doit/web exec next dev -p 3412 -H 127.0.0.1`.
- Processos iniciados: pnpm PID 4516, cmd PID 16344, next PID 21692 e listener PID 21340; todos encerrados.
- Porta 3412 ficou sem listener, restando apenas `TimeWait`.

Frontend evidence:

- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/doitmd-editor-progress-outline-2026-06-07.png`
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/doitmd-focus-mode-controls-2026-06-07.png`
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/doitmd-heading-checklist-mobile-2026-06-07.png`
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/doitmd-focus-headed-dpr-zoom-2026-06-07.png`
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/resultados.json`
- `specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas/headed-dpr-zoom-result.json`
- Copia global para `G:\Meu Drive\.agentes`: tentada, mas a unidade `G:` nao estava montada (`ENOENT`).

## Risks

- Risk: compensar zoom via `devicePixelRatio` pode variar por monitor/escala do SO.
  Mitigation: limitar a escala minima e aplicar somente quando o usuario muda zoom durante o modo foco.
- Risk: contar checklists por regex pode incluir blocos de codigo.
  Mitigation: ignorar linhas dentro de fences ``` e ~~~.
- Risk: automacao nao conseguiu disparar zoom nativo `Ctrl+=` no Chromium.
  Mitigation: validar a mesma mudanca de DPR em browser headed e pedir revisao manual do atalho real.

## Next step

Revisar manualmente o ID 115 com `Ctrl+plus`/menu de zoom no navegador do usuario e, se aprovado, publicar o lote.
