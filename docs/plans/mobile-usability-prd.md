# PRD - Ajustes de usabilidade mobile e arrastar

**Status:** Proposto
**Data:** 2026-05-12
**Escopo:** `apps/web`
**Contexto:** levantamento estatico + teste visual com usuario fake em SQLite local

## 1. Problema

O app funciona em desktop, mas fluxos importantes ficam inconsistentes ou difÃ­ceis no celular. O principal problema confirmado Ã© a reordenaÃ§Ã£o por toque: mesmo apÃ³s ativar o modo "Reordenar", arrastar itens em listas nÃ£o muda a ordem. O Kanban tambÃ©m Ã© difÃ­cil de operar em tela pequena porque combina scroll horizontal, colunas largas e drag por toque.

Esses problemas afetam tarefas centrais do produto: revisar o dia, organizar listas, mover itens entre pastas/colunas e editar notas no celular.

## 2. Evidencias

Teste visual executado em viewport mobile `390x844`, com touch habilitado, usando usuÃ¡rio fake:

- `mobile-test@example.invalid`
- SQLite local em `apps/web/.data/doit-dev.sqlite`
- EvidÃªncias em `apps/web/.mobile-qa/`

Resultados principais:

- Long press em item abriu menu contextual.
- Modo "Reordenar" foi ativado antes do teste.
- Drag por toque em `ReorderableItemList` nÃ£o alterou a ordem.
- Kanban em mobile mostrou apenas uma coluna principal e parte da prÃ³xima, com controles superiores apertados/cortados.
- A tela de pasta quebrou tÃ­tulo e aÃ§Ãµes em layout pouco confortÃ¡vel.
- Editor de nota ainda precisa de validaÃ§Ã£o focada; primeira tentativa capturou estado de loading.

## 3. Objetivos

1. Tornar reordenaÃ§Ã£o de listas confiÃ¡vel em celular.
2. Reduzir conflitos entre scroll, long press e drag.
3. Melhorar o layout mobile de pastas e Kanban.
4. Preservar a experiÃªncia desktop atual sempre que possÃ­vel.
5. Criar critÃ©rios de aceite claros para validaÃ§Ã£o visual e funcional.

## 4. Fora de escopo

- Redesign completo do app.
- MudanÃ§as no modelo de dados.
- Sync Markdown, audit log ou regras de aprovaÃ§Ã£o.
- Reescrever editor Markdown inteiro.
- Suporte offline novo.

## 5. Personas e cenarios

### Usuario mobile recorrente

Usa o celular para revisar o dia, capturar tarefas e reorganizar prioridades rapidamente.

Cenarios:

- Abrir "Hoje", ativar reordenaÃ§Ã£o e mover uma tarefa para cima/baixo.
- Entrar em uma pasta, ordenar itens da lista.
- Mover um card de uma coluna para outra no Kanban, ou usar alternativa mobile simples.
- Abrir uma nota e editar conteÃºdo sem perder scroll ou ficar preso em overlays.

## 6. Requisitos funcionais

### RF1 - ReordenaÃ§Ã£o de listas por toque

Substituir a implementaÃ§Ã£o HTML5 `draggable` da `ReorderableItemList` por uma soluÃ§Ã£o confiÃ¡vel em touch.

DireÃ§Ã£o recomendada:

- Usar `@dnd-kit/core`, jÃ¡ presente no app.
- Usar `TouchSensor` com delay/tolerance adequados.
- Iniciar drag apenas pelo handle.
- Aumentar o handle para alvo mÃ­nimo confortÃ¡vel.
- Manter o modo "Reordenar" como proteÃ§Ã£o contra drag acidental.

CritÃ©rios de aceite:

- Em viewport `390x844`, apÃ³s clicar em "Reordenar", arrastar o primeiro item para abaixo do quinto altera a ordem.
- A ordem persiste apÃ³s reload.
- Scroll vertical da lista continua funcionando quando o usuÃ¡rio nÃ£o inicia pelo handle.
- Tocar no texto do item nÃ£o inicia drag.
- Desktop continua permitindo reordenar.

### RF2 - Fallback mobile para subir/descer

Adicionar alternativa explÃ­cita no modo reordenar para casos em que drag Ã© desconfortÃ¡vel.

DireÃ§Ã£o recomendada:

- Em mobile, exibir botÃµes pequenos de subir/descer por item, ou uma aÃ§Ã£o contextual acessÃ­vel no modo reordenar.
- Usar a mesma lÃ³gica de atualizaÃ§Ã£o de `order`.

CritÃ©rios de aceite:

- UsuÃ¡rio consegue mover um item uma posiÃ§Ã£o para cima ou para baixo sem arrastar.
- Primeiro item nÃ£o mostra aÃ§Ã£o invÃ¡lida de subir; Ãºltimo item nÃ£o mostra aÃ§Ã£o invÃ¡lida de descer.
- A aÃ§Ã£o tem feedback visual ou toast em caso de erro.

### RF3 - Kanban mobile

Revisar o comportamento mobile do Kanban para evitar a competiÃ§Ã£o entre scroll horizontal e drag.

DireÃ§Ãµes aceitÃ¡veis:

- OpÃ§Ã£o A: em mobile, mostrar uma coluna por vez com seletor de coluna.
- OpÃ§Ã£o B: manter scroll horizontal, mas desabilitar drag entre colunas e oferecer aÃ§Ã£o "Mover para..." por menu.
- OpÃ§Ã£o C: manter drag somente com handle grande e modo explÃ­cito, se ficar confiÃ¡vel em teste real.

RecomendaÃ§Ã£o inicial: OpÃ§Ã£o B como MVP, por ser mais simples e robusta.

CritÃ©rios de aceite:

- Em celular, o usuÃ¡rio consegue mover um item de uma coluna para outra.
- A aÃ§Ã£o nÃ£o depende de acertar uma faixa estreita enquanto a tela rola horizontalmente.
- O botÃ£o `Apagar` e demais aÃ§Ãµes do header nÃ£o ficam cortados fora da viewport.
- Colunas continuam utilizÃ¡veis em desktop como hoje.

### RF4 - Header de pasta em mobile

Melhorar o layout do header em telas pequenas.

Problemas observados:

- TÃ­tulo de pasta quebra em muitas linhas.
- AÃ§Ãµes `Lista`, `Kanban`, `+ Subpasta`, `Apagar` competem na mesma linha.
- Em Kanban, `Apagar` pode sair cortado para a direita.

DireÃ§Ã£o recomendada:

- Separar tÃ­tulo e aÃ§Ãµes em linhas diferentes no mobile.
- Transformar aÃ§Ãµes secundÃ¡rias em menu de overflow.
- Manter alternÃ¢ncia `Lista/Kanban` visÃ­vel.

CritÃ©rios de aceite:

- Em `390x844`, nenhuma aÃ§Ã£o fica cortada horizontalmente.
- TÃ­tulo longo ocupa no mÃ¡ximo espaÃ§o previsÃ­vel e nÃ£o empurra aÃ§Ãµes para fora.
- NÃ£o hÃ¡ scroll horizontal no header.

### RF5 - Editor de nota mobile

Validar e ajustar o editor de nota no celular, especialmente handles de bloco e overlays.

Pontos a verificar:

- Skeleton/loading nÃ£o deve ficar preso ao abrir uma nota.
- Handles de reordenaÃ§Ã£o de bloco devem ter alvo tocÃ¡vel suficiente.
- `touch-action: none` nÃ£o deve bloquear scroll normal do editor.
- Popovers do toolbar/propriedades nÃ£o devem sair da viewport.

CritÃ©rios de aceite:

- Abrir uma nota longa em mobile mostra editor carregado em tempo aceitÃ¡vel.
- Scroll do editor funciona com teclado aberto e fechado.
- Tocar/segurar no handle de bloco nÃ£o impede scroll fora do handle.
- A barra inferior nÃ£o cobre conteÃºdo editÃ¡vel essencial.

### RF6 - Regras globais de touch/select

Revisar CSS global que desabilita seleÃ§Ã£o no `body` em dispositivos touch.

DireÃ§Ã£o recomendada:

- Reduzir `user-select: none` global.
- Aplicar bloqueio de seleÃ§Ã£o apenas durante drag ativo ou em handles especÃ­ficos.
- Preservar seleÃ§Ã£o de texto em conteÃºdo, notas e campos editÃ¡veis.

CritÃ©rios de aceite:

- UsuÃ¡rio consegue selecionar/copiar texto em notas e conteÃºdo longo.
- Durante drag ativo, seleÃ§Ã£o acidental continua bloqueada.
- Long press de menu contextual em item continua funcionando.

## 7. Requisitos nao funcionais

- NÃ£o alterar schemas em `packages/db/src/schemas/`.
- NÃ£o importar `@doit/db` em componentes client.
- NÃ£o criar dependÃªncia nova se `@dnd-kit/core` for suficiente.
- Manter acessibilidade bÃ¡sica: botÃµes com `aria-label`, foco visÃ­vel e alvos tocÃ¡veis.
- Evitar regressÃµes desktop.

## 8. Plano de implementacao sugerido

### Fase 1 - Lista reordenavel

Arquivos provÃ¡veis:

- `apps/web/src/components/items/reorderable-list.tsx`
- possivelmente novo helper/componente local para item reordenÃ¡vel

Entregas:

- Trocar HTML5 drag/drop por `@dnd-kit`.
- Aumentar handle.
- Adicionar fallback subir/descer no mobile.
- Validar em `/today`, `/inbox` e `/notas/[id]`.

### Fase 2 - Header mobile de pasta

Arquivo provÃ¡vel:

- `apps/web/src/app/(app)/notas/[id]/page.tsx`

Entregas:

- Reorganizar header mobile.
- Evitar botÃµes cortados.
- Preservar layout desktop.

### Fase 3 - Kanban mobile

Arquivo provÃ¡vel:

- `apps/web/src/app/(app)/notas/[id]/page.tsx`

Entregas:

- Definir e implementar comportamento mobile.
- MVP recomendado: aÃ§Ã£o "Mover para..." em mobile, mantendo drag desktop.
- Validar colunas longas e scroll.

### Fase 4 - Editor e CSS touch

Arquivos provÃ¡veis:

- `apps/web/src/components/items/block-reorder-extension.ts`
- `apps/web/src/components/items/markdown-editor.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/items/item-detail.tsx`

Entregas:

- Validar abertura de nota longa.
- Ajustar handles e `touch-action`.
- Reduzir `user-select: none` global se possÃ­vel.

## 9. Plano de validacao

### Validacao automatizada/assistida

Usar usuÃ¡rio fake no SQLite local:

- Email: `mobile-test@example.invalid`
- Senha: `mobile-test-123`

Cenarios mÃ­nimos:

1. `/today`
   - Entrar.
   - Ativar reordenaÃ§Ã£o.
   - Mover item 1 para depois do item 5.
   - Recarregar e confirmar ordem.

2. `/notas/fld_mobile_list`
   - Ativar reordenaÃ§Ã£o.
   - Testar drag por handle.
   - Testar fallback subir/descer.

3. `/notas/fld_mobile_board`
   - Verificar header.
   - Mover card entre colunas por fluxo mobile.
   - Confirmar que scroll horizontal/vertical nÃ£o bloqueia a aÃ§Ã£o.

4. Nota longa
   - Abrir nota.
   - Confirmar editor carregado.
   - Scrollar com teclado fechado.
   - Editar texto.

### Validacao tecnica

Comandos permitidos:

```bash
pnpm --filter @doit/web exec tsc --noEmit
pnpm --filter @doit/web build
```

Servidor local sÃ³ deve ser iniciado para validaÃ§Ã£o visual e encerrado ao final.

## 10. Metricas de sucesso

- ReordenaÃ§Ã£o por touch passa no teste visual em lista.
- Zero overflow horizontal no header mobile de pasta.
- Fluxo mobile para mover card entre colunas funciona sem drag frÃ¡gil.
- Long press de item continua abrindo menu contextual.
- Nenhum erro TypeScript.

## 11. Riscos

- `@dnd-kit` pode conflitar com `ItemRow` e long press se sensores nÃ£o forem bem configurados.
- AÃ§Ãµes de reordenaÃ§Ã£o em lote podem disparar muitas chamadas se a lÃ³gica atual for reaproveitada sem cuidado.
- MudanÃ§as globais em CSS touch podem afetar editor, menus e seleÃ§Ã£o.
- Kanban mobile pode exigir decisÃ£o de produto: manter drag ou trocar por fluxo explÃ­cito de mover.

## 12. Decisoes pendentes

1. Kanban mobile deve manter drag ou usar fluxo "Mover para..."?
2. Fallback subir/descer deve aparecer sempre no modo reordenar ou sÃ³ em mobile?
3. Header mobile deve esconder `Apagar` em menu de overflow?
4. ReordenaÃ§Ã£o de blocos no editor Ã© prioridade desta rodada ou fica para fase posterior?
