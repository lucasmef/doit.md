# PRD - Programa completo de usabilidade mobile

**Status:** Em implementacao
**Data:** 2026-05-12
**Escopo principal:** `apps/web`
**Plataformas alvo:** iOS Safari, Android Chrome, desktop responsivo
**Documento relacionado:** `docs/plans/mobile-usability-prd.md`
**Politica de teste local:** `docs/local-testing.md`

## 1. Resumo

O doit.md precisa ser confortavel para uso recorrente no celular. Hoje o app tem boas bases de PWA, mas varias interacoes ainda nasceram com suposicoes de desktop: drag horizontal, headers com muitos botoes, modais centralizados, popovers absolutos, topbar larga e regras globais de touch. O resultado e uma experiencia que funciona, mas exige precisao demais e cria conflitos entre tap, scroll, long press, teclado virtual e bottom nav.

Este PRD define um programa completo para resolver esses problemas por fases, preservando a experiencia desktop e evitando mudancas de modelo de dados.

## 2. Problema

### Problemas confirmados

- Reordenacao por HTML5 drag/drop falhava em celular mesmo com modo "Reordenar" ativo.
- Kanban mobile dependia de scroll horizontal + drag, uma combinacao fragil.
- Header de pasta podia cortar acoes como `Apagar` e quebrar titulos de forma ruim.
- Acoes importantes disputam espaco na topbar mobile.
- Bottom nav pode cobrir conteudo ou disputar espaco com toasts e modais.
- Editor de nota e Quick Capture ainda usam padroes de modal/popover mais adequados a desktop.
- CSS global desabilita selecao de texto no `body` em touch, prejudicando copiar texto.

### Problemas parcialmente resolvidos

- `ReorderableItemList` ja foi migrada para interacao touch/pointer propria com fallback subir/descer.
- Header mobile de pasta ja foi reorganizado para evitar overflow horizontal.
- Kanban mobile ja ganhou fluxo explicito `Mover`, sem depender de drag para mover cards entre colunas.

Este PRD cobre o trabalho restante e formaliza a solucao completa.

## 3. Objetivos

1. Tornar tarefas centrais no celular previsiveis: capturar, revisar, reorganizar, mover, editar.
2. Reduzir dependencia de drag em superficies onde scroll e teclado competem com o gesto.
3. Garantir que nenhuma tela principal tenha overflow horizontal acidental em `390x844`.
4. Fazer modais e popovers funcionarem bem com teclado virtual.
5. Preservar ou melhorar acessibilidade: alvos tocaveis, labels, foco e alternativa sem drag.
6. Manter desktop estavel, sem remover funcionalidades existentes.

## 4. Fora de escopo

- Redesign visual completo.
- Alteracoes no schema ou no modelo de dados.
- Mudancas no sync/audit ou fluxo `.doitmd`.
- Troca do editor Markdown/Tiptap por outra biblioteca.
- Criacao de app nativo.
- Reestruturacao completa da navegacao desktop.

## 5. Personas

### Usuario mobile diario

Abre o app varias vezes ao dia para capturar itens, revisar hoje, marcar tarefas e reorganizar prioridades.

Necessidades:

- Entrada rapida.
- Pouca precisao motora.
- Fluxos que funcionam com uma mao.
- Baixo atrito com teclado virtual.

### Usuario mobile de manutencao

Usa o celular para limpar inbox, mover tarefas para pastas, ajustar datas e consultar notas.

Necessidades:

- Mover itens sem drag fragil.
- Editar propriedades sem popovers saindo da tela.
- Copiar trechos de notas.

### Usuario desktop principal

Usa o desktop para escrita longa, organizacao pesada e Kanban amplo.

Necessidades:

- Nao perder densidade e velocidade no desktop.
- Manter drag onde ele funciona bem.

## 6. Principios de design mobile

1. **Fluxos explicitos vencem gestos ambiguos.** Em celular, preferir botoes, menus e seletores quando drag compete com scroll.
2. **Drag precisa de fallback.** Toda acao por arrastar deve ter alternativa por toque.
3. **Alvo tocavel minimo.** Controles interativos devem mirar em pelo menos `40x40px` em mobile.
4. **Uma superficie rolavel dominante.** Evitar scroll aninhado sem necessidade.
5. **Teclado virtual e parte do layout.** Modais com input devem virar sheet ou ter corpo rolavel e footer fixo.
6. **Desktop nao deve pagar pelo mobile.** Mudancas mobile devem usar breakpoints e preservar padroes desktop.

## 7. Requisitos funcionais

### RF1 - Topbar mobile compacta

Problema: a topbar mostra busca larga, `+ Novo` e `Sair`, consumindo espaco horizontal e vertical.

Requisitos:

- Em mobile, a busca deve iniciar compacta como botao/icon button.
- Ao tocar, a busca expande para uma camada ou estado focado.
- `Sair` deve sair da topbar mobile e ir para Config ou menu de conta.
- `+ Novo` deve ser revisado para nao duplicar de forma confusa o botao central do bottom nav.

CritÃ©rios de aceite:

- Em `390x844`, topbar nao corta texto nem botoes.
- Busca continua acessivel em ate 1 toque.
- Criar novo item continua acessivel em ate 1 toque pelo bottom nav.
- Logout continua acessivel em Config ou menu.

Arquivos provaveis:

- `apps/web/src/components/layout/topbar.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/app/(app)/settings/page.tsx`

### RF2 - Bottom nav e safe area

Problema: bottom nav e botao central podem cobrir conteudo, toasts e acoes de modais.

Requisitos:

- Padronizar padding inferior das telas principais.
- Garantir `env(safe-area-inset-bottom)` em overlays e sheets.
- Reposicionar toasts para nao cobrir botoes primarios em mobile.
- Evitar que o botao central cubra a primeira acao de um modal/sheet.

CritÃ©rios de aceite:

- Ultimo item de listas longas e legivel acima do bottom nav.
- Toast nao cobre `OK`, `Salvar`, `Mover` ou acoes de reordenacao.
- Em iPhone com safe area, nav nao cola em borda fisica.

Arquivos provaveis:

- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/components/ui/toast.tsx`
- telas em `apps/web/src/app/(app)/*`

### RF3 - Quick Capture como bottom sheet mobile

Problema: Quick Capture e modal central com `pt-[8vh]`, popovers absolutos e editor que pode ser comprimido pelo teclado.

Requisitos:

- Em mobile, Quick Capture deve abrir como bottom sheet ou tela parcial ancorada embaixo.
- Conteudo principal deve rolar internamente.
- Acoes primarias devem ficar em footer fixo.
- Popovers de data, prioridade, tags e pasta devem virar menus/sheets responsivos.
- Campo principal deve manter fonte `16px` para evitar zoom no iOS.

CritÃ©rios de aceite:

- Criar tarefa com titulo, descricao e data funciona com teclado aberto.
- Criar nota curta funciona sem o editor ficar coberto.
- Popover/sheet de data nao sai da viewport.
- Fechar por gesto/botao nao perde conteudo sem confirmacao quando houver texto.

Arquivos provaveis:

- `apps/web/src/components/items/quick-capture.tsx`
- `apps/web/src/components/items/due-date-picker.tsx`
- `apps/web/src/components/ui/dialog.tsx`

### RF4 - Kanban mobile coluna unica

Problema: mesmo com acao `Mover`, o board horizontal ainda exige scroll lateral para consultar colunas.

Requisitos:

- Em mobile, Kanban deve exibir uma coluna por vez.
- Deve haver seletor de coluna no topo com nome e contagem.
- Colunas devem poder ser navegadas por segmented control, dropdown ou tabs horizontais.
- A acao `Mover` deve continuar disponivel nos cards.
- Drag entre colunas deve permanecer desktop-only.

CritÃ©rios de aceite:

- Em `390x844`, uma coluna ocupa a largura util sem coluna parcial aparecendo.
- Usuario consegue alternar para outra coluna em ate 1 toque.
- Usuario consegue mover card para outra coluna via `Mover`.
- Desktop continua com board multi-coluna e drag.

Arquivos provaveis:

- `apps/web/src/app/(app)/notas/[id]/page.tsx`

### RF5 - Cards Kanban compactos em mobile

Problema: botao `Mover` em todos os cards aumenta muito a altura da lista.

Requisitos:

- Compactar cards mobile.
- Opcoes aceitaveis:
  - mostrar `Mover` so quando card estiver selecionado;
  - mover para menu `...`;
  - usar botao iconico com label acessivel.
- Manter legibilidade de titulo, tags e checkbox.

CritÃ©rios de aceite:

- Pelo menos 5 cards cabem em `390x844` no Kanban sem parecerem espremidos.
- Acao `Mover` permanece descoberta e acessivel.
- Alvos de toque continuam com minimo pratico.

Arquivos provaveis:

- `apps/web/src/app/(app)/notas/[id]/page.tsx`
- `apps/web/src/components/items/item-row.tsx`

### RF6 - Header mobile de pasta

Status: parcialmente implementado.

Requisitos restantes:

- Avaliar se `Apagar` deve ir para menu de overflow.
- Manter `Lista/Kanban` visivel.
- Garantir titulos longos com quebra controlada.

CritÃ©rios de aceite:

- Sem overflow horizontal em `390x844`.
- `Apagar` nao fica proeminente demais para acao destrutiva acidental.
- Titulo longo nao empurra controles para fora da tela.

Arquivo provavel:

- `apps/web/src/app/(app)/notas/[id]/page.tsx`

### RF7 - Editor de nota mobile

Problema: editor precisa de validacao dedicada com notas longas, teclado e handles de bloco.

Requisitos:

- Abrir nota longa deve sair do skeleton e mostrar editor.
- Toolbar deve ser compacta e rolar horizontalmente ou agrupar acoes.
- Reordenacao de blocos deve ficar atras de modo explicito "Organizar blocos" no mobile, ou ter handle muito claro.
- `touch-action: none` deve ficar restrito ao handle ativo, nao ao fluxo normal de scroll.
- Campo editavel deve respeitar safe area e bottom nav.

CritÃ©rios de aceite:

- Nota longa abre e fica editavel em mobile.
- Scroll vertical do editor funciona com teclado fechado.
- Digitar com teclado aberto nao esconde a linha ativa atras de bottom nav.
- Usuario consegue copiar texto da nota.
- Reordenar bloco nao dispara ao tentar selecionar/rolar texto.

Arquivos provaveis:

- `apps/web/src/components/items/item-detail.tsx`
- `apps/web/src/components/items/markdown-editor.tsx`
- `apps/web/src/components/items/block-reorder-extension.ts`
- `apps/web/src/app/globals.css`

### RF8 - Regras globais de touch e selecao

Problema: `body { user-select: none }` em touch e muito amplo.

Requisitos:

- Remover bloqueio global de selecao em `body`, ou restringir para regioes de lista/drag.
- Manter bloqueio de selecao durante drag ativo.
- Garantir que campos editaveis, ProseMirror e conteudo longo permitam selecao.

CritÃ©rios de aceite:

- Selecionar texto em nota funciona no celular.
- Long press em item ainda abre menu contextual.
- Drag/reordenacao nao seleciona texto acidentalmente.

Arquivo provavel:

- `apps/web/src/app/globals.css`

### RF9 - Long press com tolerancia

Problema: long press de `ItemRow` cancela em qualquer `pointermove`, incluindo micro-movimentos naturais.

Requisitos:

- Adicionar tolerancia de movimento antes de cancelar long press.
- Usar coordenadas iniciais e distancia minima, similar a drag.
- Cancelar long press apenas quando movimento indicar scroll.

CritÃ©rios de aceite:

- Segurar item parado abre menu.
- Pequeno tremor do dedo nao cancela.
- Scroll vertical da lista nao abre menu por engano.

Arquivo provavel:

- `apps/web/src/components/items/item-row.tsx`

### RF10 - Alvos de toque consistentes

Problema: varios controles usam `h-7` ou `h-8`, aceitaveis no desktop mas pequenos no celular.

Requisitos:

- Criar convencao: controles mobile primarios e icon buttons devem mirar `h-10 w-10`.
- Aplicar a toolbar, headers, reordenacao, cards e popovers.
- Evitar aumento de densidade no desktop se nao necessario.

CritÃ©rios de aceite:

- Principais botoes mobile tem area tocavel confortavel.
- Nenhum botao critico tem area menor que `32x32`, e a maioria chega a `40x40`.

Arquivos provaveis:

- Componentes em `apps/web/src/components/items`
- Componentes em `apps/web/src/components/layout`
- Componentes em `apps/web/src/components/ui`

### RF11 - Endpoint/acao atomica para reordenacao

Problema: reordenacao atual atualiza varios itens com varios PATCHs. Isso funciona, mas e mais lento e sujeito a corrida.

Requisitos:

- Criar endpoint ou acao client que envie lista de `{ id, order }`.
- Validar `userId` com `auth()`.
- Chamar `ensureDB()`.
- Atualizar apenas itens do usuario.
- Retornar itens atualizados ou `{ ok: true }`.

CritÃ©rios de aceite:

- Reordenar 10 itens gera 1 chamada de rede.
- Ordem persiste apos reload.
- Erro parcial nao deixa lista em estado misto sem feedback.

Arquivos provaveis:

- `apps/web/src/app/api/items/reorder/route.ts` ou extensao de `/api/items/bulk`
- `apps/web/src/hooks/use-items.ts`
- `apps/web/src/components/items/reorderable-list.tsx`

### RF12 - Estados de salvamento e erro

Problema: acoes mobile podem parecer sem resposta em redes lentas.

Requisitos:

- Mostrar estado `salvando` para reordenacao, mover card, Quick Capture e edicoes de nota.
- Desabilitar acoes duplicadas durante salvamento.
- Mostrar erro com toast e manter estado recuperavel.

CritÃ©rios de aceite:

- Duplo toque rapido nao dispara duas mudancas conflitantes.
- Falha de rede mostra erro claro.
- Usuario nao perde texto digitado.

## 8. Requisitos nao funcionais

- Nao editar schemas em `packages/db/src/schemas/`.
- Nao importar `@doit/db` em client components.
- API routes protegidas devem usar `auth()`/`requireUserId()` e `ensureDB()`.
- Nao adicionar dependencias novas sem justificativa clara.
- Respeitar `prefers-reduced-motion` onde animacoes atrapalham.
- Preservar `NEXTAUTH_URL` e restricoes de servidor local em validacoes.

## 9. Plano de implementacao

### Fase 0 - Base de validacao

Status: parcialmente feito.

Entregas:

- Usuario fake local.
- Dados de teste para listas, Kanban, nota longa, Quick Capture.
- Scripts temporarios ou documentados para validacao mobile.
- Pasta de evidencias local nao commitada, se contiver apenas artefatos.

### Fase 1 - Reordenacao e Kanban MVP

Status: parcialmente implementado.

Entregas:

- Reordenacao mobile confiavel.
- Fallback subir/descer.
- Header mobile sem overflow.
- Fluxo `Mover` no Kanban mobile.

### Fase 2 - Navegacao e densidade mobile

Entregas:

- Topbar compacta.
- Bottom nav/safe area padronizados.
- Kanban coluna unica.
- Cards Kanban compactos.

### Fase 3 - Captura e edicao mobile

Entregas:

- Quick Capture como bottom sheet.
- Popovers responsivos.
- Editor de nota validado com teclado.
- Toolbar mobile compacta.

### Fase 4 - Touch, selecao e performance

Entregas:

- Revisao de `user-select`.
- Long press com tolerancia.
- Alvos de toque auditados.
- Endpoint atomico de reordenacao.
- Estados de salvamento consistentes.

## 10. Plano de validacao

### Viewports obrigatorios

- Mobile pequeno: `360x740`
- Mobile padrao: `390x844`
- Mobile grande: `430x932`
- Tablet estreito: `768x1024`
- Desktop: `1366x768`

### Cenarios obrigatorios

1. Login com usuario fake.
2. `/today`
   - scroll lista;
   - long press;
   - reordenar por drag;
   - reordenar por botoes.
3. `/inbox`
   - captura rapida;
   - reordenacao;
   - abrir item.
4. `/notas/fld_mobile_list`
   - header sem overflow;
   - lista e reordenacao;
   - abrir nota longa.
5. `/notas/fld_mobile_board`
   - alternar colunas;
   - mover card;
   - coluna longa com scroll.
6. Quick Capture
   - tarefa simples;
   - tarefa com data;
   - nota curta;
   - teclado aberto.
7. Editor de nota
   - abrir;
   - editar;
   - copiar texto;
   - scroll com teclado.

### Checks tecnicos

```bash
pnpm --filter @doit/web exec tsc --noEmit
pnpm --filter @doit/web build
```

Servidor local so deve rodar durante validacao visual e ser encerrado ao final.

## 11. Metricas de sucesso

- Zero overflow horizontal acidental nas telas principais em `390x844`.
- Fluxos centrais mobile executaveis com toque, sem exigir drag preciso.
- Reordenacao e mover card persistem apos reload.
- Quick Capture mobile funciona com teclado aberto.
- Usuario consegue copiar texto de nota.
- Nenhum erro TypeScript.
- Nenhuma regressao visivel no desktop.

## 12. Riscos

- Ajustes de CSS global podem gerar regressao em drag, editor ou menus.
- Bottom sheets podem introduzir scroll aninhado se nao forem bem delimitados.
- Kanban coluna unica pode reduzir velocidade para usuarios que gostam do board horizontal.
- Endpoint atomico de reordenacao exige cuidado para nao burlar regras de auth.
- Validacao visual automatizada em touch pode divergir de Safari real; teste manual ainda e importante.

## 13. Decisoes de produto pendentes

1. Topbar mobile deve manter `+ Novo` ou depender apenas do bottom nav?
2. `Sair` deve ir para Config ou menu de perfil?
3. Kanban mobile deve usar dropdown de coluna ou tabs horizontais?
4. A acao `Mover` no card deve ser sempre visivel, apenas quando selecionado, ou em menu `...`?
5. Reordenacao de blocos em nota deve existir no mobile ou ficar desktop-only ate haver modo dedicado?
6. Artefatos de QA em `apps/web/.mobile-qa/` devem ser ignorados no git?

## 14. Definition of Done

Uma fase esta pronta quando:

- Requisitos da fase foram implementados.
- Type-check passou.
- Cenarios mobile relevantes foram validados visualmente.
- Desktop principal foi verificado em pelo menos uma viewport.
- Servidor local foi encerrado.
- Evidencias foram registradas sem expor dados reais.
- Decisoes pendentes da fase foram resolvidas ou explicitamente adiadas.

## 15. Status do processo

**Atualizado em:** 2026-05-12
**Responsavel:** Codex
**Validacao executada:** `pnpm --filter @doit/web exec tsc --noEmit` passou; validacao local com Next temporario e Chrome headless mobile executada em 2026-05-12.

### Implementado nesta rodada

- RF1: topbar mobile compacta com busca por botao, `+ Novo` oculto no mobile e logout movido para Configuracoes > Perfil.
- RF2: padding inferior e safe area padronizados para conteudo principal, bottom nav e toasts mobile.
- RF3: Quick Capture passa a abrir como bottom sheet no mobile, com corpo rolavel, footer fixo e controles com altura mobile mais confortavel.
- RF4: Kanban mobile passa a renderizar uma coluna por vez com seletor de coluna; desktop mantem board multi-coluna.
- RF5: cards Kanban mobile mantem acao Mover em area compacta, com estados de salvamento nos controles de mover.
- RF8: removido bloqueio global de selecao de texto no `body`; bloqueio fica restrito a handles/regioes interativas.
- RF9: long press em `ItemRow` agora tem tolerancia de movimento antes de cancelar.
- RF10: principais controles mobile tocaveis ajustados para `h-10`/`w-10` onde aplicavel.
- RF11: criado endpoint atomico `PATCH /api/items/reorder` e `ReorderableItemList` agora envia uma chamada unica para reordenacao.
- RF12: reordenacao e mover card exibem estado de salvamento e evitam disparos duplicados durante a operacao.

### Parcial ou pendente

- RF3: popovers principais do Quick Capture foram adaptados para viewport mobile; `RecurrencePopover` ainda merece revisao visual dedicada.
- RF7: editor de nota recebeu beneficio indireto da remocao de `user-select` global, mas toolbar, teclado virtual e reordenacao de blocos ainda precisam validacao/ajuste especificos.
- Validacao visual mobile nos viewports obrigatorios ainda nao foi executada porque a restricao local do repositorio impede manter servidor dev persistente nesta rodada.

### Validacao local de 2026-05-12

- Seed fake idempotente criado em `apps/web/.data/doit-dev.sqlite`.
- Usuario fake usado: `mobile-test@example.invalid`.
- Dados fake principais: `fld_mobile_list`, `fld_mobile_board`, `fld_mobile_col_todo`, `fld_mobile_col_doing`, `fld_mobile_col_done` e 17 itens mobile.
- Next iniciado temporariamente em `http://localhost:3000` e encerrado ao final.
- Chrome headless em viewport `390x844` confirmou:
  - login redireciona para `/today`;
  - `/notas/fld_mobile_board` renderiza Kanban mobile com seletor de coluna;
  - `/notas/fld_mobile_list` renderiza lista com botao de reordenacao;
  - sem overflow horizontal em board e lista;
  - Quick Capture abre como sheet alinhado ao rodape.
- APIs protegidas validadas:
  - `GET /api/folders/fld_mobile_board`;
  - `GET /api/folders/fld_mobile_list`;
  - `PATCH /api/items/reorder`;
  - `PATCH /api/items/bulk`;
  - `POST /api/items`.
- Observacao: havia dados fake antigos com mesmo ID e `userId` diferente; o seed foi corrigido para reassociar os IDs mobile ao usuario fake atual.

### Politica documentada apos a validacao

- Criado `docs/local-testing.md` para permitir explicitamente testes locais temporarios com servidor iniciado e encerrado no mesmo turno.
- A politica cobre fixtures fake em SQLite, dominios reservados, seeds idempotentes, validacao por HTTP/browser e obrigacao de encerrar portas/processos.
