# Corrigir IDs 100-123 - Editor, Calendario e Mobile

## Metadata

- Status: done
- Mode: bugfix
- Complexity: high
- Created: 2026-06-06
- Updated: 2026-06-06

## Objective

Corrigir os itens pendentes 100, 101 e 109-123 com mudancas locais e verificaveis, preservando o comportamento atual em desktop e mobile. Os IDs 073 e 074 ja foram confirmados como OK e entram somente na validacao de regressao. Os IDs 102-108 ficam explicitamente ignorados.

## Context

- BuilderFlow foi usado antes da implementacao. Foram lidos `AGENTS.md`, `docs/CONTEXT.md`, `docs/ADR.md`, specs relacionadas e os caminhos de codigo envolvidos.
- IDs 073/074 constam como `done` nas specs de 2026-05-30 e 2026-05-31, com validacao Playwright. Nao serao reabertos.
- O editor novo usa TipTap em `markdown-editor.tsx` e o shell imersivo em `notas/[id]/page.tsx`.
- Arquivar e versionamento ja possuem API/componentes reutilizaveis (`updateItem`/`ItemVersions`).
- Preferencias visuais do calendario ja persistem em `localStorage` via `usePreferences`.
- Menus de contexto de item e pasta usam paineis proprios com submenus rolaveis; o fechamento deve continuar limitado ao backdrop.
- Nao ha mudanca arquitetural, de schema, auth, sync ou campos protegidos.

## Scope

- [x] ID 073 - preservar e validar feedback temporario de tarefa concluida em pasta.
- [x] ID 074 - preservar e validar proxima semana como proxima segunda-feira.
- [x] ID 100 - atalhos `Ctrl+1/2/3` para H1/H2/H3.
- [x] ID 101 - atalho `Shift+#` para arquivar nota aberta ou selecionada.
- [x] ID 109 - impedir overflow horizontal de texto longo no Inbox mobile.
- [x] ID 110 - compactar metadados e ampliar area util do editor mobile.
- [x] ID 111 - anexos mobile por icone unico e galeria compacta abaixo.
- [x] ID 112 - acao mobile para arquivar nota.
- [x] ID 113 - permitir interacao de colar em linhas vazias no editor mobile.
- [x] ID 114 - limpar e compactar o cabecalho mobile.
- [x] ID 115 - manter topo/menu compacto ao ampliar o texto no modo foco.
- [x] ID 116 - imprimir somente o conteudo da nota.
- [x] ID 117 - conter seletor mobile de calendarios na viewport.
- [x] ID 118 - eventos de dia todo em Hoje usam `Dia todo` e nao ficam esmaecidos.
- [x] ID 119 - filtros persistidos para ocultar notas e tarefas no calendario.
- [x] ID 120 - atalhos sequenciais `g i` e `g h`, bloqueados em campos editaveis.
- [x] ID 121 - reintegrar historico de versoes no editor novo.
- [x] ID 122 - manter seletor de pasta do menu de contexto aberto e rolavel.
- [x] ID 123 - `W` em pasta cria nota dentro da pasta atual.

## Out of scope

- IDs 102-108.
- Refatoracao ampla de editor, atalhos, preferencias ou calendario.
- Alteracao de schema, sync Markdown, auth, deploy ou campos protegidos.
- Reabrir itens anteriores ja confirmados como OK.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos e as implementacoes existentes oferecem caminhos locais. Persistencia de filtros segue `usePreferences`; versionamento e arquivamento reutilizam APIs existentes; os ajustes de mobile e menus nao exigem decisao arquitetural.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] Cada ID do escopo possui comportamento observavel validado.
- [x] Desktop e mobile preservam o padrao visual atual.
- [x] Atalhos nao disparam em input, textarea, select, ProseMirror ou contenteditable, exceto os atalhos internos do editor.
- [x] Impressao nao inclui navegacao, toolbar, botoes ou paineis laterais.
- [x] Preferencias de exibicao do calendario sobrevivem a recarga.
- [x] Type-check e lint passam; build e testes focados tem resultado registrado.
- [x] Validacao visual usa servidor temporario e screenshots no projeto; copia global foi tentada e registrada como indisponivel.

## Implementation plan

- [x] ID 100: registrar atalhos internos TipTap para alternar heading 1/2/3.
- [x] IDs 101/120/123: ampliar atalhos globais com contexto de selecao/pasta e sequencia `g`.
- [x] IDs 110-116/121: compactar shell mobile, anexos, arquivo, versoes, foco, paste target e print CSS.
- [x] ID 109: corrigir limites flex/grid e quebra de titulo no Inbox.
- [x] IDs 117/119: conter seletor de calendarios e adicionar filtros persistidos de notas/tarefas.
- [x] ID 118: tratar `allDay` na pagina Hoje.
- [x] ID 122: impedir fechamento do submenu durante scroll e limitar painel a viewport.
- [x] Rodar checks, testes focados e regressao 073/074.
- [x] Validar visualmente desktop/mobile, salvar/copiar screenshots e encerrar servidor.
- [x] Atualizar spec e preparar commit, push e PR `dev -> main`.

## Progress

- 2026-06-06 - BuilderFlow carregado; contexto, ADRs, specs e codigo relacionados revisados.
- 2026-06-06 - IDs 073/074 identificados como ja concluidos; mantidos somente como regressao.
- 2026-06-06 - Branch local `dev` criada a partir de `main`.
- 2026-06-06 - Living spec criada antes das alteracoes de producao.
- 2026-06-06 - Atalhos, editor mobile, impressao, Inbox, calendario, menu de pasta e Hoje corrigidos.
- 2026-06-06 - Type-check, lint e roteiro Playwright focado concluidos com sucesso.
- 2026-06-06 - Validacao visual realizada em viewport mobile `390x844`, sem erros de console.
- 2026-06-06 - Servidor temporario na porta 3400 encerrado; porta confirmada como livre.

## Decisions

- Decision: usar uma living spec para o lote, com plano e validacao separados por ID.
  Reason: os ajustes compartilham as mesmas superficies de editor/calendario e foram solicitados como uma entrega unica.
  ADR needed: no
- Decision: nao alterar codigo dos IDs 073/074 sem regressao reproduzida.
  Reason: o usuario proibiu reabrir itens confirmados como OK.
  ADR needed: no
- Decision: persistir filtros do calendario no objeto existente de preferencias locais.
  Reason: corresponde ao padrao atual de filtros de calendarios e evita nova API/schema.
  ADR needed: no
- Decision: resolver a pasta atual de `W` pela URL do navegador no momento do atalho.
  Reason: evita introduzir `useSearchParams` no provider global e a exigencia de `Suspense` durante prerender.
  ADR needed: no
- Decision: manter o menu de contexto aberto durante scroll e limitar o proprio painel a viewport.
  Reason: o listener global de scroll fechava o submenu antes da escolha de pasta.
  ADR needed: no

## Files changed

- `apps/web/src/app/(app)/calendar/page.tsx` - seletor mobile contido e filtros persistidos.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - shell mobile compacto, anexos, arquivo, versoes e print.
- `apps/web/src/app/(app)/today/page.tsx` - apresentacao correta de eventos de dia todo.
- `apps/web/src/app/globals.css` - alvos vazios mobile e estilos exclusivos de impressao.
- `apps/web/src/components/items/bulk-actions.tsx` - submenu de pasta rolavel sem fechamento indevido.
- `apps/web/src/components/items/item-row.tsx` - quebra segura de texto longo no Inbox mobile.
- `apps/web/src/components/items/markdown-editor.tsx` - headings por teclado e compactacao de toolbar/anexos.
- `apps/web/src/hooks/use-preferences.ts` - preferencias persistidas de notas e tarefas no calendario.
- `apps/web/src/store/ui-provider.tsx` - arquivo, navegacao sequencial e criacao na pasta atual.
- `specs/validate-100-123.mjs` - roteiro Playwright de regressao e evidencias.
- `specs/artifacts/2026-06-06-corrigir-100-123-editor-calendario-mobile/` - screenshots e resultados.
- `specs/2026-06-06-corrigir-100-123-editor-calendario-mobile.md` - living spec BuilderFlow.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `node specs/validate-100-123.mjs`

Results:

- Type-check passou.
- Lint passou com warnings preexistentes de `img`, dependencias de hooks e API depreciada.
- Build compilou, validou tipos, gerou 21/21 paginas e coletou traces. A etapa final de standalone falhou por `EPERM` ao criar symlink no Windows, limitacao ambiental ja registrada em specs anteriores.
- Playwright validou IDs 100, 101, 109-123 e regressoes 073/074.
- `Shift+#` foi validado como a combinacao fisica `Shift+3`; `g i`/`g h` foram bloqueados em input.
- Impressao exibiu somente a nota; filtros do calendario permaneceram `false` apos recarga.
- O servidor foi iniciado com `pnpm --filter @doit/web exec next dev -p 3400 -H 127.0.0.1`; arvore raiz PID 10708, listener PID 18508.
- PIDs 2348, 10708, 17900, 18508 e 19372 foram encerrados; porta 3400 ficou livre.

Frontend evidence:

- `01-doitmd-editor-mobile-2026-06-06.png`
- `02-doitmd-inbox-texto-longo-2026-06-06.png`
- `03-doitmd-calendario-filtros-mobile-2026-06-06.png`
- `04-doitmd-hoje-evento-dia-todo-2026-06-06.png`
- `resultados.json`
- A copia para `G:\Meu Drive\.agentes` foi tentada para cada screenshot, mas a unidade `G:` nao esta montada nesta sessao (`ENOENT`). As evidencias permanecem salvas no projeto.

## Risks

- Risk: atalhos globais conflitarem com digitacao.
  Mitigation: reutilizar `isTypingTarget` e manter atalhos do editor no escopo TipTap.
- Risk: compactacao mobile esconder acoes importantes.
  Mitigation: manter acoes por icones com `aria-label` e validar viewport real.
- Risk: filtros locais do calendario divergirem entre dispositivos.
  Mitigation: seguir a persistencia ja adotada para selecao de calendarios; sincronizacao entre dispositivos fica fora do escopo atual.

## Next step

Revisar a PR `dev -> main`.
