# Corrigir IDs 115 e 128-136 - Editor e listas de notas

## Metadata

- Status: review
- Mode: bugfix
- Complexity: high
- Created: 2026-06-09
- Updated: 2026-06-09

## Objective

Corrigir somente os itens pendentes 115 e 128-136 no editor novo de notas, modo foco,
progresso, outline, listas, sidebar, painel direito, navegacao por Esc e toolbar.
Preservar Markdown, retracao/expansao, versionamento, impressao e comportamento
desktop/mobile sem reabrir itens ja confirmados fora deste lote.

## Context

- BuilderFlow, `docs/CONTEXT.md`, `docs/ADR.md` e as specs recentes dos IDs 115,
  124-130 foram revisados antes da implementacao.
- Os IDs 128-130 ja possuem parser compartilhado e decoracoes TipTap; o trabalho deste
  lote deve consolidar e validar essa base, sem substituir o formato Markdown.
- A lista de pastas ainda nao exibe progresso de notas.
- `Files` filtra pela pasta quando existe `folderId`, mas notas sem pasta recebem hoje
  a lista global; o escopo correto deve ser sempre a pasta/contexto atual.
- `Favorites` na sidebar do editor ainda deriva prioridade, nao abertura recente.
- O retorno por Esc depende apenas do query param `folder`; aberturas pelo seletor
  global perdem o contexto de origem.
- A compensacao do modo foco usa uma escala minima que ainda permite crescimento
  exagerado dos controles em zoom alto.

## Scope

- [x] ID 115 - limitar topbar, toolbar, botoes e cabecalho no zoom real do modo foco.
- [x] ID 128 - consolidar progresso de checklist comum e headings H1-H3.
- [x] ID 129 - manter checkbox visual no outline sem marcador textual.
- [x] ID 130 - manter checkbox azul e heading concluido riscado/cinza.
- [x] ID 131 - mostrar progresso e conclusao visual de notas nas listas de pasta.
- [x] ID 132 - restringir `Files` a notas da pasta atual.
- [x] ID 133 - substituir `Favorites` por `Ultimos itens` com notas abertas recentemente.
- [x] ID 134 - mover Tags para uma secao inferior do painel direito.
- [x] ID 135 - fazer Esc voltar ao contexto seguro de origem sem perder autosave pendente.
- [x] ID 136 - usar icone de checklist mais claro com acessibilidade preservada.

## Out of scope

- Reabrir IDs confirmados fora de 115 e 128-136.
- Refatorar amplamente o editor, UIContext, banco, schema, sync ou APIs.
- Alterar favoritos/destaques reais em outras telas.
- Mudar o formato persistido de headings com checklist.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao observaveis e as escolhas podem seguir os padroes existentes. Recencia
pode usar preferencias locais ja persistidas, progresso pode continuar derivado do
Markdown, e o contexto de retorno pode ser transportado como URL interna validada.
Nao ha mudanca arquitetural, de dados criticos ou de autorizacao.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [ ] Zoom real no modo foco aumenta principalmente o conteudo, mantendo controles compactos.
  A compensacao foi validada de forma automatizada; falta somente confirmar o zoom nativo
  pela interface real do Chrome.
- [x] Progresso reage e persiste para checklist comum e headings H1-H3 sem duplicacao.
- [x] Outline e headings mantem checkbox visual azul e estado concluido riscado/cinza.
- [x] Cards e linhas de notas mostram progresso; 100% usa visual explicito de nota concluida.
- [x] `Files` lista somente notas da mesma pasta da nota aberta.
- [x] `Ultimos itens` lista somente notas abertas, em ordem recente e persistida.
- [x] Tags continuam editaveis em secao inferior do painel direito.
- [x] Esc retorna ao contexto de origem e salva alteracao ainda no debounce.
- [x] Toolbar desktop/mobile usa icone de checklist claro e acessivel.
- [x] Checks automatizados e validacao visual desktop/mobile ficam registrados.

## Implementation plan

- [x] ID 115 - reforcar a compensacao relativa de zoom e limitar dimensoes dos controles.
- [x] IDs 128-130 - revisar parser, atualizacao ao vivo, outline e decoracoes existentes.
- [x] ID 131 - reutilizar `calculateChecklistProgress` nos cards e linhas da pasta.
- [x] ID 132 - normalizar o escopo de `Files`, inclusive notas sem pasta.
- [x] ID 133 - persistir IDs recentes em preferencias e renderizar pela ordem de abertura.
- [x] ID 134 - separar Tags das propriedades principais e mover a secao para baixo.
- [x] ID 135 - propagar `from`, validar destino interno e drenar autosave antes de sair.
- [x] ID 136 - padronizar um glifo SVG de checklist em todas as toolbars.
- [x] Rodar type-check, lint, build e roteiro focado.
- [x] Validar no navegador, salvar/copiar screenshots, encerrar servidor e atualizar a spec.
- [x] Revisar diff e publicar `dev -> main` conforme BuilderFlow.

## Progress

- 2026-06-09 - BuilderFlow, contexto, ADRs, specs relacionadas e codigo atual revisados.
- 2026-06-09 - Causas localizadas para listas sem progresso, recencia falsa, retorno sem
  origem, Tags altas e escopo global de `Files` em notas sem pasta.
- 2026-06-09 - Definido reaproveitamento do parser Markdown e das preferencias locais.
- 2026-06-09 - Implementados os ajustes dos IDs 115 e 128-136 sem alteracao de schema
  ou do formato Markdown persistido.
- 2026-06-09 - Roteiro funcional dedicado passou em desktop e mobile para progresso,
  outline, headings, listas, Files, Ultimos itens, Tags, Esc/autosave e toolbar.
- 2026-06-09 - Servidor temporario iniciado em `127.0.0.1:3415` pelos processos
  `14684`/`25556` e encerrado; a porta 3415 foi confirmada livre.
- 2026-06-09 - A tentativa de zoom nativo via navegador e via controle do Windows nao
  ficou disponivel nesta sessao. A escala compensatoria passou no teste automatizado,
  mas o zoom real permanece como revisao manual.
- 2026-06-09 - Commit `5fd5470` publicado em `dev` e PR draft `#58` aberto para `main`.

## Decisions

- Decision: manter progresso como valor derivado de `contentMd`.
  Reason: evita schema novo, duplicacao com outline e divergencia de persistencia.
  ADR needed: no
- Decision: persistir `recentNoteIds` nas preferencias locais existentes.
  Reason: atende ordem de abertura recente sem alterar favoritos reais ou banco.
  ADR needed: no
- Decision: transportar a origem em `from` e aceitar apenas caminhos internos conhecidos.
  Reason: preserva pasta, busca e outros contextos sem permitir navegacao externa.
  ADR needed: no
- Decision: drenar o autosave pendente antes da navegacao por Esc.
  Reason: o cleanup atual cancela o debounce e pode perder a ultima edicao.
  ADR needed: no
- Decision: representar nota 100% concluida apenas na camada visual.
  Reason: evita transformar nota em tarefa concluida ou alterar seu `status`.
  ADR needed: no
- Decision: manter um piso de escala de `0.4` para controles no modo foco.
  Reason: compensa zoom alto sem deixar toolbar e cabecalho crescerem na mesma proporcao
  do texto; o conteudo do editor continua sujeito ao zoom normal.
  ADR needed: no

## Files changed

- `specs/2026-06-09-corrigir-115-128-136-editor-notas.md` - living spec do lote.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - sidebar por pasta, itens recentes,
  Tags inferiores, retorno seguro, autosave no Esc e compensacao de zoom.
- `apps/web/src/app/(app)/notas/page.tsx` - progresso e conclusao visual de notas nas listas.
- `apps/web/src/components/items/item-detail.tsx` - propagacao do contexto de origem.
- `apps/web/src/components/items/markdown-editor.tsx` - icone claro de checklist.
- `apps/web/src/hooks/use-preferences.ts` - persistencia local de notas recentes.
- `specs/validate-115-128-136.mjs` - roteiro funcional dedicado.
- `specs/artifacts/2026-06-09-corrigir-115-128-136-editor-notas/` - evidencias.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `BASE_URL=http://127.0.0.1:3415 node specs/validate-115-128-136.mjs`
- [x] `git diff --check`

Results:

- Type-check passou.
- Lint passou com avisos preexistentes, sem erro.
- Build compilou, validou tipos e gerou 21/21 paginas; falhou apenas na copia final do
  standalone por `EPERM` de symlink no Windows, limitacao ambiental conhecida.
- O roteiro dedicado passou em todas as assercoes automatizadas.
- O teste legado `validate-124-127.mjs` nao alcancou o editor porque seu cadastro usa
  um seletor antigo (`input[name="name"]`); nenhuma regressao funcional foi acusada.
- `git diff --check` passou, com avisos de conversao LF/CRLF do Git no Windows.

Frontend evidence:

- `doitmd-notas-progresso-lista-2026-06-09.png`
- `doitmd-editor-foco-sidebar-toolbar-2026-06-09.png`
- `doitmd-editor-checklist-mobile-2026-06-09.png`
- `resultados.json`
- A copia para `G:\Meu Drive\.agentes` falhou porque a unidade `G:` nao esta montada
  nesta sessao. As evidencias permaneceram salvas no projeto.

## Risks

- Risk: progresso calculado durante render pode custar mais em listas muito grandes.
  Mitigation: parser linear pequeno e calculo somente para itens do tipo nota renderizados.
- Risk: contexto de origem malformado causar retorno incorreto.
  Mitigation: aceitar somente rotas internas iniciadas por `/` e rejeitar `//`.
- Risk: zoom varia entre navegadores e monitores.
  Mitigation: usar proporcao relativa ao entrar no modo foco, limites conservadores e
  validacao manual em navegador real.

## Manual review

- Aplicar zoom nativo no Chrome com a nota em modo foco e confirmar fisicamente que
  texto cresce enquanto topbar, toolbar, botoes e cabecalho permanecem compactos.
- Fazer uma passada visual curta nos temas/monitores usados em producao para conferir
  o piso de escala de `0.4`.

## Next step

Revisar manualmente o zoom nativo e concluir a revisao do PR
`https://github.com/lucasmef/doit.md/pull/58`.
