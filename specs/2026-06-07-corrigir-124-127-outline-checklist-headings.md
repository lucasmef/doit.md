# Corrigir IDs 124-127 - Outline e checklist em headings

## Metadata

- Status: done
- Mode: bugfix
- Complexity: high
- Created: 2026-06-07
- Updated: 2026-06-07

## Objective

Corrigir a leitura, exibicao e navegacao dos headings H1-H3 no outline de notas e
permitir checklist persistente nesses headings, preservando Markdown, retracao,
versionamento, exportacao, impressao e comportamento desktop/mobile.

## Context

- BuilderFlow foi carregado antes da implementacao.
- O editor usa TipTap 3 com Markdown e persiste `editor.getMarkdown()` em `contentMd`.
- O outline atual usa regex local em `notas/[id]/page.tsx`, mostra o prefixo visual `#`
  e cria hashes que nao correspondem a elementos reais no DOM do editor.
- A retracao usa decoracoes TipTap e indices ordinais de headings; manter headings como
  nodes `heading` preserva esse contrato.
- Checklist TipTap convencional usa `taskList/taskItem`, que e um bloco e nao pode ser
  aninhado diretamente em um node heading sem alterar o schema e o Markdown existente.
- Nao ha mudanca de banco, API, auth, sync, campos protegidos ou arquitetura.

## Scope

- [x] ID 124 - limpar o texto exibido no outline sem alterar a nota.
- [x] ID 125 - aceitar e alternar checklist em H1, H2 e H3 com persistencia Markdown.
- [x] ID 126 - navegar do outline ao heading correto com hash valido e IDs unicos.
- [x] ID 127 - refletir e permitir alternar o checklist pelo outline.
- [x] Validar regressao de retracao, exportacao/Markdown e desktop/mobile.

## Out of scope

- Checklist em H4-H6.
- Alterar schema de documento, banco ou formato dos Items.
- Refatoracao ampla do editor ou do sistema de sync/versionamento.
- Reabrir IDs anteriores confirmados como OK.

## Grill Gate

Decision: not_needed

Reason:
Os criterios sao objetivos. O formato `# [ ] Titulo` e Markdown textual reversivel,
mantem o node como heading e evita uma alteracao arriscada no schema TipTap. O checkbox
do outline pode ser interativo porque a mesma fonte Markdown controla editor e rail.

Questions, if any:
None.

Answers:
None.

## Acceptance criteria

- [x] Outline mostra somente texto limpo, sem `#`, marcador de checklist, fechamento
  ATX ou sufixo `.md` indevido.
- [x] H1, H2 e H3 aceitam `[ ]` e `[x]`, exibem checkbox clicavel e persistem o estado.
- [x] Clique no texto do outline rola ao heading exato e atualiza o hash.
- [x] IDs funcionam com acentos, espacos, numeros, caracteres especiais e duplicatas.
- [x] Outline mostra checkbox somente para heading com checklist e sincroniza nos dois
  sentidos.
- [x] Retracao/expansao, Markdown salvo, exportacao, impressao e versionamento nao
  sofrem regressao.
- [x] Type-check, lint, build e roteiro Playwright focado tem resultado registrado.
- [x] Evidencias visuais desktop/mobile ficam no projeto e tem copia global tentada.

## Implementation plan

- [x] ID 124: extrair parser compartilhado e normalizar somente a apresentacao.
- [x] ID 125: criar decoracao TipTap para checkbox de heading e marcador textual oculto.
- [x] ID 126: aplicar IDs do parser aos nodes e navegar por `scrollIntoView`.
- [x] ID 127: renderizar/togglar checkbox no outline usando o mesmo indice ordinal.
- [x] Adicionar estilos acessiveis e compativeis com tela/impressao.
- [x] Criar roteiro Playwright para H1-H3, caracteres, persistencia, outline e retracao.
- [x] Rodar checks, validar desktop/mobile, salvar/copiar screenshots e parar servidor.
- [x] Atualizar spec, revisar diff e publicar `dev -> main`.

## Progress

- 2026-06-07 - Contexto, ADRs, specs anteriores e implementacao do editor revisados.
- 2026-06-07 - Causa localizada: outline sem parser compartilhado e hashes sem alvo DOM.
- 2026-06-07 - Solucao definida com marcador Markdown `[ ]`/`[x]` dentro do heading e
  decoracoes TipTap, sem mudanca de schema.
- 2026-06-07 - Parser compartilhado, decoracao de checkbox/ancora, toolbar e outline
  implementados.
- 2026-06-07 - Autolink indevido de tokens `.md` removido na serializacao de headings;
  entidades HTML de headings voltam a Markdown legivel.
- 2026-06-07 - Roteiro Playwright passou para H1-H3, acentos, numeros, caracteres
  especiais, duplicatas, toggle nos dois sentidos, persistencia, toolbar e retracao.
- 2026-06-07 - Evidencias desktop/mobile revisadas; sem overflow e com hierarquia visual.
- 2026-06-07 - Servidor temporario `3410` encerrado; porta confirmada como livre.

## Decisions

- Decision: usar `# [ ] Titulo` e `# [x] Titulo` como representacao persistida.
  Reason: e legivel, reversivel, exportavel e mantem o bloco como heading.
  ADR needed: no
- Decision: derivar texto, checkbox e ancora de um unico parser compartilhado.
  Reason: evita divergencia entre outline, DOM e estado salvo.
  ADR needed: no
- Decision: usar sufixos ordinais para headings duplicados.
  Reason: cada item do outline precisa apontar para um bloco unico.
  ADR needed: no
- Decision: normalizar somente autolinks `.md` cujo texto e destino sao o mesmo token.
  Reason: preserva links Markdown reais e impede que nomes de arquivo sejam reescritos.
  ADR needed: no
- Decision: reutilizar o parser do outline ao derivar o titulo do Item nas rotas.
  Reason: o marcador `[x]` nao pode virar parte do titulo salvo da nota.
  ADR needed: no

## Files changed

- `apps/web/src/lib/note-headings.ts` - parser, IDs, normalizacao e toggle Markdown.
- `apps/web/src/components/items/heading-checkbox-extension.ts` - decoracoes TipTap.
- `apps/web/src/components/items/markdown-editor.tsx` - extensao e toolbar H1-H3.
- `apps/web/src/app/(app)/notas/[id]/page.tsx` - outline limpo, navegacao e toggle.
- `apps/web/src/app/globals.css` - estilos dos checkboxes do heading e outline.
- `apps/web/src/app/api/items/route.ts` - titulo de nota sem marcador de checklist.
- `apps/web/src/app/api/items/[id]/route.ts` - titulo atualizado sem marcador.
- `apps/web/src/app/api/items/bulk/route.ts` - mesma regra em atualizacao em massa.
- `specs/validate-124-127.mjs` - roteiro Playwright focado.
- `specs/artifacts/2026-06-07-corrigir-124-127-outline-checklist-headings/` - evidencias.
- `specs/2026-06-07-corrigir-124-127-outline-checklist-headings.md` - living spec.

## Validation

Commands run:

- [x] `pnpm --filter @doit/web type-check`
- [x] `pnpm --filter @doit/web lint`
- [x] `pnpm --filter @doit/web build`
- [x] `node specs/validate-124-127.mjs`

Results:

- Type-check passou apos a implementacao e apos a limpeza final do diff.
- Lint passou com warnings preexistentes de `img`, hooks e deprecacao do `next lint`.
- Build compilou, validou tipos e gerou 21/21 paginas; falhou apenas na copia standalone
  por `EPERM` ao criar symlinks no Windows, limitacao ambiental ja conhecida.
- Playwright passou em todas as assercoes dos IDs 124-127.
- Banco QA confirmou Markdown final limpo e tres versoes criadas pelos toggles.
- Servidor: `pnpm --filter @doit/web exec next dev -p 3410 -H 127.0.0.1`.
- Processos iniciados: raiz PID 14172, filhos 17232/21368/2420; todos encerrados.
- Porta 3410 confirmada como livre.

Frontend evidence:

- `doitmd-outline-headings-2026-06-07.png` - editor e outline desktop.
- `doitmd-heading-checklist-mobile-2026-06-07.png` - heading com checkbox no mobile.
- `resultados.json` - resultados estruturados do roteiro.
- A copia para `G:\Meu Drive\.agentes` foi tentada, mas a unidade `G:` nao esta montada
  nesta sessao (`ENOENT`). As evidencias permanecem no projeto.
- O Browser interno estava autenticado em outro usuario; para nao tocar em dados privados,
  o fluxo funcional foi exercitado apenas na conta QA isolada e os PNGs foram revisados
  diretamente.

## Risks

- Risk: decoracoes de checkbox e retracao disputarem a mesma posicao no heading.
  Mitigation: manter widgets independentes, com classes e ordem visual explicitas.
- Risk: alteracao externa do Markdown deixar outline e editor momentaneamente diferentes.
  Mitigation: ambos derivam de `localContent`, que ja e a fonte controlada da pagina.
- Risk: titulos duplicados criarem hashes ambiguos.
  Mitigation: gerar IDs deterministas com sufixos `-2`, `-3`.

## Next step

Revisar a PR `dev -> main`.
