# Relatório de UX e Teste Visual — doit.md

**Data:** 2026-05-18  
**Base:** revisão do relatório anterior do Claude Code + nova validação visual com Playwright  
**Ambiente:** servidor Next temporário em `localhost:3100`, SQLite temporário fora do repo, conta de teste descartável

## Método

- Li o relatório anterior e conferi as afirmações contra o código atual.
- Rodei o app localmente em ambiente isolado e temporário, encerrando o servidor ao final.
- Criei usuário, pasta, tarefas, nota e itens vencidos para verificar desktop e mobile.
- Capturei telas de `/today`, busca, `/inbox` e mobile.
- Fiz checagem funcional via API autenticada para validar bugs citados.

## Veredito Sobre o Relatório do Claude

As observações do Claude fazem sentido em quase todos os pontos. Confirmei como reais:

- `PATCH /api/items/[id]` aceita `status` inválido e `title` vazio.
- `/areas` redireciona para `/projects`, que redireciona para `/notas`.
- `POST /api/folders` retorna `_id` e `id`.
- Topbar mostra `Saved` fixo, sem estado real.
- Há mistura PT/EN e falta de acentos em rótulos centrais.
- Sidebar mostra `Lucas / local workspace` mesmo logado como outro usuário.
- `ItemRow` tem problemas de acessibilidade e alvo de toque pequeno.
- `/today` e `/inbox` têm tratamento de empty state desigual.
- `Reagendar atrasadas` não tem confirmação nem undo.
- Busca mostra datas em ISO.
- Botão mobile de fechar busca é um `x` literal.
- Muitos metadados usam texto muito claro e pequeno.

O único ponto que eu trataria com nuance: o alerta visual no canto inferior esquerdo dos screenshots (`1 Issue` / círculo preto no mobile) parece ser overlay do Next dev, não bug de produto. Não deve entrar como problema de UX em produção.

## Bugs Funcionais Confirmados

### 1. PATCH de item aceita estado inválido e título vazio

**Severidade:** alta para integridade de dados.

Teste executado:

- `PATCH /api/items/:id` com `{ "status": "banana" }` retornou `200` e persistiu o status inválido.
- `PATCH /api/items/:id` com `{ "title": "" }` retornou `200` e persistiu título vazio.

Impacto:

- Item com status inválido pode sumir de filtros e views.
- A função `validateItemState()` ainda é stub.

Recomendação:

- Validar `status`, `complexity`, `priority`, `recurrence`, datas e título em runtime.
- Para `task/capture/project/document`, título não deve ser vazio.
- Para `note`, título pode continuar derivado do conteúdo.

### 2. Redirect em cadeia `/areas -> /projects -> /notas`

**Severidade:** baixa.

Confirmado:

- `/areas` retorna `307` para `/projects`.
- `/projects` retorna `307` para `/notas`.

Recomendação:

- Redirecionar `/areas` diretamente para `/notas`.

### 3. `POST /api/folders` expõe `_id` interno

**Severidade:** baixa.

Confirmado: resposta contém `id` e `_id`.

Recomendação:

- Mapear folder antes de responder, como já é feito em rotas de item.

## Problemas Visuais e de UX Confirmados

### 1. Estado de carregamento em `/today` é confuso

No primeiro screenshot desktop, a tela mostrou skeletons, mas o cabeçalho indicava `Itens / 0`. Isso mistura “carregando” com “vazio”.

Recomendação:

- Durante loading, evitar contador `0`.
- Usar `Itens / ...` ou esconder contador até os dados chegarem.

### 2. Busca desktop/mobile tem inconsistência visual

No desktop, após digitar `visual`, a busca inicialmente mostrou “Nenhum item encontrado” mesmo com itens existentes na lista. No mobile, a mesma busca encontrou resultados depois.

Pode ser race/SWR/debounce, mas a experiência observada é ruim.

Recomendação:

- Mostrar estado “Buscando...” durante debounce/fetch.
- Evitar “Nenhum item encontrado” até a request atual terminar.
- Garantir invalidação de cache após criação de itens.

### 3. Busca mobile fica apertada e cobre o topo

No mobile, ao abrir busca, o input apareceu estreito no lado direito, espremido entre logo e botão `+`. O dropdown também ficou estreito e truncou os resultados.

Recomendação:

- Quando busca mobile abrir, ocupar a largura inteira do topbar.
- Esconder temporariamente logo, botão buscar e botão `+`.
- Usar ícone de fechar, não `x` textual.

### 4. `Saved` fixo passa confiança falsa

O indicador verde `Saved` aparece sempre, mesmo sem ligação visível com persistência, sync, pending changes ou offline queue.

Recomendação:

- Remover, ou conectar a estado real: `Salvo`, `Salvando...`, `Offline`, `Erro`, `Pendente`.

### 5. Usuário fixo na sidebar

Mesmo logado como usuário de teste, a sidebar mostrou `Lucas / local workspace`.

Recomendação:

- Usar `/api/me` ou sessão NextAuth para nome/inicial.
- Remover “local workspace” se o contexto real é conta web multiusuário.

### 6. Idioma inconsistente

Exemplos confirmados:

- `Capture or jump...`
- `Search or jump...`
- `Saved`
- `Proximos`, `Calendario`, `Configuracoes`

Recomendação:

- Padronizar PT-BR: `Capturar ou ir para...`, `Buscar ou ir para...`, `Salvo`, `Próximos`, `Calendário`, `Configurações`.

### 7. Acessibilidade do `ItemRow`

O container usa `role="button"` e contém botões internos. O checkbox visual tem `18x18px`, sem `aria-label`/`aria-checked`, e teclado trata apenas Enter no container.

Recomendação:

- Transformar a linha em container semântico não interativo ou separar área clicável de ações.
- Checkbox deve ter `aria-label`, `aria-pressed` ou `aria-checked` conforme o padrão escolhido.
- Suportar Space além de Enter.
- Aumentar alvo de toque para pelo menos `44x44px` com padding invisível.

### 8. `Reagendar atrasadas` é ação em massa sem undo

O botão faz `Promise.all` direto e só mostra toast.

Recomendação:

- Adicionar confirmação quando houver muitos itens, ou toast com “Desfazer”.
- Guardar snapshot local dos `dueDate` anteriores para rollback.

### 9. Empty states desalinhados

`/inbox` tem componente visual dedicado quando vazio. `/today` usa mensagem simples via lista.

Recomendação:

- Criar empty state consistente para Hoje, com tom mais útil: “Nada para hoje” + ação rápida.

### 10. Contraste baixo em textos pequenos

Muitos metadados usam `text-navy-300` em 10-11px. Visualmente fica leve demais, principalmente em datas, contadores e labels do calendário.

Recomendação:

- Revisar contraste WCAG AA.
- Subir metadados críticos para `text-navy-500` ou aumentar tamanho/peso.

## Pontos Positivos Observados

- Layout geral é limpo e rápido de entender.
- Desktop tem boa densidade e hierarquia.
- Mobile não apresentou overlap grave de conteúdo com a bottom nav no fluxo testado.
- A tela Hoje comunica bem atrasadas vs hoje.
- O botão `Reagendar atrasadas` é visível e contextual.
- A navegação por bottom nav é clara, apesar dos rótulos sem acento.

## Priorização Recomendada

### P0 — Integridade

1. Validar runtime de `PATCH /api/items/[id]` e bulk.
2. Corrigir retorno de folders para não expor `_id`.

### P1 — Confiança e UX Principal

1. Remover/conectar `Saved`.
2. Corrigir busca mobile para ocupar largura total.
3. Adicionar estado “Buscando...” e evitar falso “nenhum resultado”.
4. Corrigir usuário fixo na sidebar.
5. Padronizar PT-BR e acentos.

### P2 — Acessibilidade e Polimento

1. Refatorar `ItemRow` para semântica acessível.
2. Aumentar alvo de toque do checkbox.
3. Adicionar undo/confirm em `Reagendar atrasadas`.
4. Unificar empty states.
5. Revisar contraste.

## Evidência de Teste

Screenshots foram gerados em ambiente temporário:

- `desktop-today.png`
- `desktop-search.png`
- `desktop-inbox.png`
- `mobile-today.png`
- `mobile-search.png`

Os arquivos ficaram em `%TEMP%/doit-ux-shots` durante a execução local.
