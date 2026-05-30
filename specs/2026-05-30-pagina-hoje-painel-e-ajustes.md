# Página Hoje — painel lateral, calendário funcional e ajustes

## Metadata

- Status: review
- Mode: build
- Complexity: high
- Created: 2026-05-30
- Updated: 2026-05-30

## Objective

Reorganizar a página Hoje (`/today`) conforme os IDs 039, 040, 041, 048, 049,
050, 053: painel esquerdo enxuto (Inbox/Hoje/Próximos + tags), calendário lateral
funcional (clicar num dia filtra a lista), remover toggles/textos redundantes,
botão "Reagendar para hoje", ícone de recorrência e fundo coerente com o app.

## Context

`/today` usa `today/page.tsx` + `today.css` (layout v3 "single board"). O painel
atual tem mini-calendário não-clicável e linhas decorativas (Hoje/Abertos/Agenda/
Tarefas/Atrasados) + "Contextos" estáticos. O toggle "Todos/Agenda/Tarefas" e o
`mobile-filters` não filtram nada (estado `mobileFilter` setado e nunca usado).
Eventos exibem badge "Agenda" e texto "finalizado". Fundo do board é branco quase
opaco (`--paper: rgba(255,255,255,.95)`), destoando do wallpaper do app.

Vários itens são interdependentes e moram no mesmo arquivo, então são tratados
como uma feature coesa.

## Scope (este lote)

- [ ] ID 053 — Painel esquerdo: Inbox, Hoje, Próximos + tags da lista atual;
      remover Abertos/Agenda/Tarefas/Atrasados e Contextos.
- [ ] ID 040 — Mini-calendário funcional: clicar num dia filtra a lista para
      tarefas/eventos daquele dia; "Hoje" volta para o dia atual.
- [ ] ID 041 — Remover toggle "Todos/Agenda/Tarefas" (e mobile-filters quebrado);
      remover textos "Agenda" e "finalizado" dos itens (ícone + esmaecimento bastam).
- [ ] ID 048 — Botão "Reagendar para hoje" visível só quando há atrasadas.
- [ ] ID 049 — Ícone de recorrência em tarefas recorrentes (Hoje + outras listas).
- [ ] ID 050 — Fundo da página Hoje translúcido/esbranquiçado como o calendário.
- [ ] ID 039 — Manter a casca do layout v3 coerente com o painel do 053.

## Out of scope (avaliados; recomendados para lote separado)

- ID 009 — Long press x seleção de texto: **já implementado em grande parte**
  (`globals.css` bloqueia `user-select` em `.today-v3-layout`/`.doit-folder-browser`
  long-press targets e preserva inputs/notas; hook limpa seleção). Falta apenas
  verificar se as linhas de `/notas` (ContentRow/Card) usam long-press e se o menu
  rotula o item. Tratar em lote próprio.
- ID 022 — Calendário desktop fullscreen: layout dos eventos. Arquivo distinto
  (`calendar-grid.tsx`/`calendar-board.tsx`).
- ID 025 — Menu de ações de Notas/Pastas: **já consolidado** num kebab "Ações da
  pasta" + FolderMenu (favoritar, ocultar/limpar concluídos, reordenar, renomear,
  mover, AGENTS.md, excluir). Validar visualmente em lote próprio.
- ID 051 — Trecho do resultado na busca (snippet do conteúdo da nota).
- ID 052 — Persistir expansão/retração de blocos na edição de nota.
- ID 054 — Modais desktop conforme `modais-standalone.html`.

## Grill Gate

Decision: not_needed

Reason:
039 (genérico "seguir referência do painel") e 053 (específico: Inbox/Hoje/
Próximos + tags) aparentavam conflito, mas 053 é mais específico e recente →
prevalece sobre o conteúdo do painel; mantém-se a casca v3 do 039. Demais itens
têm critérios objetivos. Escopo grande foi reduzido a uma feature coesa
(página Hoje) para entrega com qualidade; os itens independentes ficam para lotes
próprios (registrado acima), evitando reescrita ampla.

## Acceptance criteria

- [ ] Painel esquerdo mostra Inbox, Hoje, Próximos e as tags da lista atual.
- [ ] Clicar numa tag filtra a lista; clicar de novo limpa.
- [ ] Clicar num dia do calendário mostra tarefas/eventos daquele dia; "Hoje" volta.
- [ ] Toggle "Todos/Agenda/Tarefas" removido; itens de agenda sem texto "Agenda";
      finalizados sem texto "finalizado" (ícone + esmaecimento mantidos).
- [ ] Botão "Reagendar para hoje" aparece só com atrasadas e move todas p/ hoje.
- [ ] Tarefas recorrentes exibem ícone de recorrência (Hoje e outras listas).
- [ ] Fundo da página Hoje coerente com o app (não branco total); mobile intacto.

## Implementation plan

- [ ] Reescrever `today/page.tsx`: estado de dia/tag, filtros, painel, header.
- [ ] Ajustar `today.css`: fundo translúcido, tags, ícone recorrência, botão.
- [ ] Ícone de recorrência em `item-row.tsx` (outras listas).
- [ ] type-check + lint + validação visual (desktop/mobile) + screenshots.

## Progress

- 2026-05-30 — Contexto lido (today page/css, long-press, globals, notas menu).
  Decidido escopo: cluster Hoje + ícone recorrência; demais documentados.

## Decisions

- Decision: 053 prevalece sobre 039 no conteúdo do painel; mantém casca v3.
  Reason: 053 é específico e mais recente. ADR needed: no.
- Decision: entregar só o cluster da página Hoje neste lote; itens independentes
  (009/022/025/051/052/054) em lotes próprios.
  Reason: evitar reescrita ampla mal validada; 009 e 025 já majoritariamente
  prontos. ADR needed: no.

## Files changed

- `apps/web/src/app/(app)/today/page.tsx` — painel Inbox/Hoje/Próximos + tags,
  mini-calendário clicável (filtro por dia), remoção de toggle/mobile-filters,
  remoção de "Agenda"/"finalizado", botão "Reagendar para hoje", ícone de recorrência.
- `apps/web/src/app/(app)/today/today.css` — fundo translúcido (050), dias como
  botões, chips de tags, `.recur-icon`, `.reschedule-btn`, reset de `.side-row`.
- `apps/web/src/components/items/item-row.tsx` — ícone de recorrência ao lado do
  título nas demais listas (049).

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check` — passou (sem erros).
- [x] `pnpm --filter @doit/web lint` — passou (só warnings pré-existentes; o
  `due-date-picker.tsx 122:6` já existia).
- [x] e2e Playwright (chromium-desktop + chromium-mobile) — passou.

Results:

- Desktop: painel com Inbox/Hoje/Próximos + chips de tags (#casa/#foco); toggle
  removido (`.filter-pills` count 0); botão "Reagendar para hoje" visível com
  atrasada e some após reagendar; ícone de recorrência na tarefa recorrente;
  filtro por tag funciona. Fundo translúcido mostra o wallpaper (050).
- Mobile: lista correta, fundo coerente, sem mobile-filters, botão reagendar e
  ícone de recorrência presentes; sem regressão.
- Servidor Playwright (3100) iniciado/encerrado automaticamente; e2e temporário removido.

Frontend evidence:

- `specs/artifacts/2026-05-30-pagina-hoje-painel-e-ajustes/01-hoje-painel-desktop.png`
- `.../02-hoje-filtro-tag.png`, `.../03-hoje-sem-atrasadas.png`, `.../04-hoje-mobile.png`
- Cópia global: `G:\Meu Drive\.agentes\doitmd-hoje-painel-2026-05-30.png` e
  `doitmd-hoje-mobile-2026-05-30.png`.

## Risks

- Risk: filtragem por dia/tag pode confundir com o comportamento "foco" do dia atual.
  Mitigation: dia atual mantém a lista de foco (hoje + atrasadas + doing).

## Next step

Commit/push na `dev`. Próximo lote (itens independentes não tocados aqui):
009 (verificar long-press nas linhas de /notas + rótulo do item no menu),
022 (eventos no fullscreen do calendário), 025 (validar visual do menu já
consolidado), 051 (trecho na busca), 052 (persistir expansão na nota),
054 (modais conforme `modais-standalone.html`).
