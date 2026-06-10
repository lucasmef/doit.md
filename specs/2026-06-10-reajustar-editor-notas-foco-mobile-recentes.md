# Reajustar editor de notas, foco, progresso mobile e recentes

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-06-10
- Updated: 2026-06-10

## Objective

Corrigir exclusivamente os IDs 115, 137, 139, 140 e 141 no fluxo de notas.
Preservar o editor normal e os comportamentos desktop/mobile já validados, sem alterar
o ID 138 nem ampliar o escopo para refatorações estruturais.

## Context

- O editor de notas usa TipTap em `MarkdownEditor`, com topbar e toolbar próprias na
  página `notas/[id]`.
- O modo foco já compensa zoom nativo pela razão de `devicePixelRatio`, mas ainda
  conserva cabeçalho alto, ações demais e margens laterais largas.
- A primeira heading recebe margem superior normal mesmo sendo o primeiro bloco,
  somada ao `padding-top` do contêiner do editor.
- A vista lista calcula corretamente o progresso, porém a coluna inteira fica oculta
  abaixo de `sm`; o tempo de modificação do ID 138 deve continuar oculto no mobile.
- `recentNoteIds` já existe nas preferências locais, mas a página registra a nota ao
  abrir/carregar. O requisito atual é registrar somente quando a nota for fechada.
- A spec e as evidências de QA de 2026-06-09 são contexto existente e não serão
  sobrescritas.

## Scope

- [x] ID 115 - ajustar zoom nativo no modo foco; gesto real permanece em revisão manual.
- [x] ID 137 - exibir progresso parcial e concluído na lista mobile.
- [x] ID 139 - reduzir o espaço antes do primeiro H1/H2/H3/parágrafo.
- [x] ID 140 - ordenar `Últimos itens` somente no fechamento/troca da nota.
- [x] ID 141 - compactar topo, ações e margens do modo foco.
- [x] Validar desktop, mobile, autosave, troca/saída de nota e ações secundárias.
- [x] Gerar evidências em `specs/artifacts/2026-06-10-reajustar-editor-notas-foco-mobile-recentes/`.

## Out of scope

- ID 138, incluindo o tempo de última alteração no mobile.
- Mudanças de schema, API, formato Markdown ou favoritos reais.
- Refatoração ampla do editor, sidebar, listas, pastas ou preferências.
- Reabrir IDs previamente confirmados como corretos.

## Grill Gate

Decision: not_needed

Reason:
Os critérios definem comportamento e limites claros. A implementação pode reutilizar
o progresso derivado do Markdown, as preferências locais e os componentes existentes.
Não há decisão arquitetural, alteração de dados críticos ou ambiguidade de negócio.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [ ] ID 115: zoom real aumenta o conteúdo sem tornar topo, toolbar e botões excessivos.
  A compensação foi validada; falta repetir com o atalho nativo em Chrome desbloqueado.
- [x] ID 115: foco e editor normal continuam utilizáveis, sem sobreposição.
- [x] ID 137: progresso parcial aparece de forma compacta no mobile.
- [x] ID 137: progresso 100% mantém barra concluída e título riscado.
- [x] ID 137: desktop permanece correto e o ID 138 continua oculto no mobile.
- [x] ID 139: primeiro H1/H2/H3/parágrafo começa mais perto da toolbar com respiro.
- [x] ID 139: scroll, seleção, drag handle e outline permanecem funcionais.
- [x] ID 140: autosave não reordena `Últimos itens`.
- [x] ID 140: Esc, saída e troca de nota registram a nota fechada no topo.
- [x] ID 140: somente notas válidas aparecem em `Últimos itens`.
- [x] ID 141: foco usa topo mais baixo, margens menores e conteúdo mais próximo.
- [x] ID 141: ações principais e `Sair do foco` ficam visíveis.
- [x] ID 141: imprimir, baixar, destaque, histórico e ações secundárias permanecem acessíveis.
- [x] Checks automatizados e validação visual ficam registrados.
- [x] ID 138 não recebe alteração funcional ou visual.

## Implementation plan

### ID 115

- [x] Reavaliar a compensação relativa de zoom e limitar controles no modo foco.
- [ ] Testar zoom real do Chrome com conteúdo, topo, toolbar e botões.

### ID 137

- [x] Renderizar `NoteProgressBar` dentro da célula principal somente no mobile.
- [x] Manter a coluna desktop e a coluna de última alteração inalteradas.

### ID 139

- [x] Reduzir o padding superior do contêiner do editor.
- [x] Remover margem superior apenas do primeiro bloco H1/H2/H3/parágrafo.

### ID 140

- [x] Remover registro de recência no carregamento/autosave.
- [x] Registrar a nota anterior ao trocar de ID e a atual ao sair/fechar.
- [x] Evitar registro espúrio pelo ciclo de efeitos do React em desenvolvimento.

### ID 141

- [x] Compactar topbar e toolbar somente em foco.
- [x] Levar ações secundárias ao menu `...` em foco, mantendo acesso.
- [x] Reduzir largura vazia e espaçamento superior do conteúdo em foco.

### Validation and delivery

- [x] Rodar type-check, lint, build e `git diff --check`.
- [ ] Rodar validação no navegador desktop/mobile e zoom nativo.
  Desktop/mobile passaram; zoom nativo ficou bloqueado pela extensão do Chrome.
- [x] Salvar screenshots exigidos; cópia global indisponível por ausência da unidade `G:`.
- [x] Atualizar esta spec com resultados, riscos e revisão manual.
- [ ] Commitar no `dev`, enviar ao GitHub e abrir/atualizar PR para `main`.

## Progress

- 2026-06-10 - BuilderFlow, `AGENTS.md`, contexto, ADRs, specs anteriores e código
  relacionado revisados.
- 2026-06-10 - Confirmadas as causas: progresso mobile dentro de coluna `sm`, margem
  normal no primeiro heading, recência registrada na abertura e foco com ações/margens
  ainda amplas.
- 2026-06-10 - Grill Gate concluído sem necessidade de perguntas.
- 2026-06-10 - Implementados os ajustes dos IDs 115, 137, 139, 140 e 141 sem
  alterar a coluna/tempo mobile do ID 138.
- 2026-06-10 - Roteiro dedicado passou em todas as asserções de progresso mobile,
  espaçamento H1/H2/H3/texto, recência por fechamento e foco compacto.
- 2026-06-10 - Foco medido com topbar de 37 px, toolbar de 39 px, margem lateral
  efetiva de 15 px e distância de 16 px até o primeiro bloco.
- 2026-06-10 - A compensação de zoom passou de escala `1` para `0.4` no cenário
  automatizado de DPR alto.
- 2026-06-10 - O Chrome real foi detectado, mas bloqueou automação porque outra UI
  de extensão estava aberta. O controle nativo do Windows também estava indisponível.
- 2026-06-10 - Servidor temporário executado em `127.0.0.1:3420`, processo listener
  `18632`, encerrado; porta 3420 confirmada livre.

## Decisions

- Decision: manter `recentNoteIds` e mudar apenas o momento de registro.
  Reason: atende o novo significado de “últimos itens” sem migração ou estado novo.
  ADR needed: no
- Decision: duplicar somente a apresentação compacta do progresso no bloco mobile.
  Reason: preserva a tabela desktop e mantém o ID 138 intocado.
  ADR needed: no
- Decision: aplicar compactação com classes condicionais de `focusMode`.
  Reason: evita regressão visual no editor normal.
  ADR needed: no
- Decision: zerar margem superior apenas no primeiro filho editável.
  Reason: reduz o vazio inicial sem mudar o ritmo vertical entre blocos seguintes.
  ADR needed: no

## Files changed

- `specs/2026-06-10-reajustar-editor-notas-foco-mobile-recentes.md` - living spec.
- `apps/web/src/app/(app)/notas/page.tsx` - progresso compacto na linha mobile.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - recência por fechamento e foco compacto.
- `apps/web/src/app/globals.css` - primeiro bloco sem margem superior e limite dos controles.
- `apps/web/src/components/items/markdown-editor.tsx` - toolbar compacta em foco.
- `apps/web/src/components/items/item-versions.tsx` - histórico acessível no menu de foco.
- `specs/validate-115-137-139-141.mjs` - roteiro funcional do lote.
- `specs/artifacts/2026-06-10-reajustar-editor-notas-foco-mobile-recentes/` - evidências.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `BASE_URL=http://127.0.0.1:3420 node specs/validate-115-137-139-141.mjs`
- [x] `git diff --check`

Results:

- Type-check passou.
- Lint passou sem erros, com avisos preexistentes de hooks e `<img>`.
- Build compilou, validou tipos e gerou 21/21 páginas; falhou somente na cópia final
  do standalone por `EPERM` ao criar symlinks no Windows.
- Roteiro dedicado passou em todas as asserções.
- ID 137: 33% e 100% visíveis no mobile; 100% riscado; relógio do ID 138 oculto.
- ID 139: H1, H2, H3 e parágrafo mediram 16 px entre toolbar e primeiro bloco.
- ID 140: abrir/autosave não registraram; troca e Esc registraram na ordem correta.
- ID 141: ações secundárias permaneceram no menu `...`; `Sair do foco` ficou visível.
- Zoom nativo real não foi concluído por bloqueio da extensão Chrome e indisponibilidade
  do controle Windows. A compensação automatizada e o layout visual passaram.

Frontend evidence:

- `doitmd-notas-progresso-mobile-2026-06-10.png`
- `doitmd-editor-espacamento-h1-2026-06-10.png`
- `doitmd-sidebar-ultimos-itens-fechados-2026-06-10.png`
- `doitmd-editor-foco-compacto-menu-2026-06-10.png`
- `resultados-validacao.json`
- A unidade `G:` não estava montada; as cópias globais não puderam ser geradas.

## Risks

- Risk: registrar fechamento durante transições do App Router pode duplicar eventos.
  Mitigation: `recordRecentNote` já deduplica IDs e o fluxo distinguirá troca de nota
  de autosave/render.
- Risk: compensação de zoom variar por Chrome/Windows/DPR.
  Mitigation: validar com zoom nativo e manter limites conservadores.
- Risk: compactação esconder ações.
  Mitigation: manter ações secundárias no menu e validar cada uma no navegador.

## Next step

Revisar manualmente o zoom nativo no Chrome com `Ctrl + +`, `Ctrl + -` ou
`Ctrl + scroll`; depois aprovar o PR se o comportamento físico confirmar as medições.
