# Grafo de notas por pasta e tags

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Trocar o criterio visual de backlinks/links do novo layout de notas por relacoes derivadas de pasta e tags. O grafo deve continuar dentro do modelo atual de Item, sem criar links persistidos entre notas.

## Context

O layout atual exibe grafo e painel de backlinks, mas o grafo usa linhas/nos posicionais e o painel lateral da nota mistura `backlinks[]` com busca textual por titulo/arquivo. O usuario preferiu manter a organizacao dentro das pastas e usar tags como criterio de relacao.

## Scope

- [x] Criar regra client-side pura para notas relacionadas por mesma pasta e tags compartilhadas.
- [x] Atualizar o grafo da biblioteca de pastas para desenhar edges reais por tags.
- [x] Atualizar o painel lateral da nota para "relacionadas" em vez de backlinks textuais.
- [x] Validar type-check e visual no navegador.

## Out of scope

- Alterar schema, API, sync, audit ou frontmatter.
- Criar links wiki/Markdown entre notas.
- Persistir relacoes derivadas no banco.
- Criar ADR.

## Grill Gate

Decision: not_needed

Reason:
O usuario confirmou o criterio de pasta + tags. A implementacao pode ser derivada dos campos existentes `folderId`, `tags`, `complexity`, `status` e nao altera dados persistidos ou arquitetura.

Questions, if any:

Answers:

## Acceptance criteria

- [x] Notas so se relacionam quando estao na mesma pasta e compartilham pelo menos uma tag.
- [x] O grafo visual mostra conexoes por tags, nao labels de backlinks/linked.
- [x] O detalhe da nota mostra notas relacionadas por tags da mesma pasta.
- [x] Notas sem tags aparecem sem relacao falsa.
- [x] Type-check do web passa.
- [x] Screenshots ficam em `specs/artifacts/2026-05-28-grafo-notas-por-pasta-tags/`.

## Implementation plan

- [x] Criar helper de relacoes por tags.
- [x] Aplicar helper no grafo de `/notas/pastas`.
- [x] Aplicar helper no rail de `/notas/[id]`.
- [x] Rodar type-check.
- [x] Rodar servidor temporario, validar no navegador, salvar screenshots e encerrar servidor.

## Progress

- 2026-05-28 02:01 - Contexto BuilderFlow, ADR, spec anterior e rotas de notas revisados.
- 2026-05-28 02:08 - Helper de relacoes por tags criado e aplicado em `/notas`, `/notas/pastas` e `/notas/[id]`.
- 2026-05-28 02:09 - Type-check do web passou.
- 2026-05-28 02:13 - Validacao visual concluida com Playwright local; servidor temporario PID 23064 encerrado e porta 3000 liberada.

## Decisions

- Decision: manter relacoes como dado derivado no client.
  Reason: atende ao criterio de produto sem schema/API nova e sem risco para sync/audit.
  ADR needed: no

## Files changed

- `specs/2026-05-28-grafo-notas-por-pasta-tags.md` - spec viva.
- `apps/web/src/lib/note-relations.ts` - helper de relacoes por pasta e tags.
- `apps/web/src/app/(app)/notas/page.tsx` - grafo raiz usa tags/pasta em vez de linked/backlinks mockados.
- `apps/web/src/app/(app)/notas/pastas/page.tsx` - grafo de pastas usa edges reais por tags.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - rail mostra notas relacionadas por tags da mesma pasta.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`

Results:

- `pnpm --filter @doit/web type-check` passou.
- Browser in-app `iab` indisponivel nesta sessao; validacao visual feita com Playwright local.
- Servidor temporario: `pnpm --dir apps/web dev -H 127.0.0.1 -p 3000`, listener PID 23064.
- Servidor encerrado com `Stop-Process -Id 23064 -Force`; porta 3000 sem listener ao final.

Frontend evidence:

- `specs/artifacts/2026-05-28-grafo-notas-por-pasta-tags/01-notas-tags-graph-desktop.png` - `/notas` com mapa por tags.
- `specs/artifacts/2026-05-28-grafo-notas-por-pasta-tags/02-pastas-tags-graph-desktop.png` - `/notas/pastas` com grafo por tags.
- `specs/artifacts/2026-05-28-grafo-notas-por-pasta-tags/03-note-related-tags-rail.png` - `/notas/[id]` com rail de relacionadas.

## Risks

- Risk: pastas com poucas tags podem exibir grafo esparso.
  Mitigation: mostrar nos isolados e texto explicando que tags conectam notas.

## Next step

Revisar diff local.
