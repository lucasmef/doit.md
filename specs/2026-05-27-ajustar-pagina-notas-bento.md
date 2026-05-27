# Ajustar pagina notas bento

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-27
- Updated: 2026-05-27

## Objective

Reaproximar a rota `/notas` dos modelos `Bento Notes.html` e `Bento Notes Mobile.html`, transformando a tela raiz em uma biblioteca visual de notas com grid bento, cards recentes, fixadas, destaque de editor, grafo e controles de pastas.

## Context

O app ja usa o shell horizontal glass e primitives bento. A rota `/notas` atual ainda prioriza uma arvore operacional de pastas, enquanto o modelo esperado prioriza uma biblioteca de notas com stats, editor spotlight, cards de notas, grafo e experiencia mobile com chips horizontais e lista rica.

## Scope

- [x] Redesenhar `/notas` raiz como grid bento desktop inspirado no HTML de referencia.
- [x] Adicionar experiencia mobile equivalente com chips de pastas, fixadas horizontais e lista de notas.
- [x] Preservar criacao, fixacao, reordenacao, DnD e acoes existentes de pastas.
- [x] Conectar cards de notas a itens reais e abrir detalhes via `UIContext`.
- [x] Validar type-check e navegador com screenshots.

## Out of scope

- Alterar schema, APIs, sync ou audit.
- Redesenhar `/notas/[id]`.
- Editar arquivos Markdown de itens.

## Grill Gate

Decision: not_needed

Reason:
O usuario forneceu os HTMLs de referencia e a rota real ja tem dados suficientes via `useItems`/`useFolders`. A decisao e de composicao visual/funcional local, sem mudanca arquitetural ou de dados.

Questions, if any:

Answers:

## Acceptance criteria

- [x] `/notas` mostra stats, editor em destaque, fixadas, biblioteca de notas, grafo, leitura/jardim/escrita ou equivalentes.
- [x] No mobile, `/notas` usa header compacto, chips horizontais, cards fixados e lista de notas no estilo do modelo mobile.
- [x] Acoes de pasta existentes continuam acessiveis.
- [x] Notas reais abrem o detalhe do Item.
- [x] Screenshots ficam em `specs/artifacts/2026-05-27-ajustar-pagina-notas-bento/`.

## Implementation plan

- [x] Derivar dados reais de notas, tags, contagens e pastas.
- [x] Criar componentes locais para note cards, mobile rows, graph e editor spotlight.
- [x] Trocar a renderizacao principal por grid bento responsivo.
- [x] Rodar type-check.
- [x] Validar no navegador e salvar screenshots.

## Progress

- 2026-05-27 08:22 - Contexto BuilderFlow, docs, spec bento anterior e rota `/notas` revisados.
- 2026-05-27 08:22 - Identificado gap principal: `/notas` atual e uma arvore de pastas, nao a biblioteca bento do modelo.
- 2026-05-27 08:30 - `/notas` redesenhada com grid bento desktop, mobile stack, cards reais de notas e templates de inicio quando nao ha notas.
- 2026-05-27 08:35 - Type-check passou.
- 2026-05-27 08:42 - Servidor temporario iniciado em `127.0.0.1:3000`, PID listener 1056; validacao visual desktop/mobile concluida; servidor encerrado e porta 3000 liberada.

## Decisions

- Decision: manter as acoes existentes de pastas na mesma rota.
  Reason: o usuario pediu ficar igual ao modelo, mas o app real depende dessas funcoes para organizacao.
  ADR needed: no
- Decision: exibir templates de inicio quando nao houver notas reais.
  Reason: a rota deve continuar parecida com o mockup mesmo em base vazia, sem criar dados falsos ou persistir itens automaticamente.
  ADR needed: no

## Files changed

- `specs/2026-05-27-ajustar-pagina-notas-bento.md` - spec viva.
- `apps/web/src/app/(app)/notas/page.tsx` - biblioteca de notas bento desktop/mobile, cards reais, templates de inicio e pasta garden.
- `specs/artifacts/2026-05-27-ajustar-pagina-notas-bento/01-notes-bento-desktop.png` - evidencia visual desktop.
- `specs/artifacts/2026-05-27-ajustar-pagina-notas-bento/02-notes-bento-mobile.png` - evidencia visual mobile.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] Temporary server: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000`
- [x] Browser validation at `http://127.0.0.1:3000/notas`

Results:

- Type-check passou.
- Screenshots salvos em `specs/artifacts/2026-05-27-ajustar-pagina-notas-bento/`.
- Servidor temporario encerrado; porta 3000 sem listener ao final.
