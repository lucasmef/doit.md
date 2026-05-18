# Plano — AGENTS.md do usuário como adendo do padrão

**Data:** 2026-05-17
**Status:** Implementado em 2026-05-18; falta validação manual em workspace legado
**Origem:** auditoria `docs/regras-de-negocio.md` (§11) + revisão do fluxo `doit-sync`
**Escopo:** `apps/sync-agent`, `packages/core`, `apps/web` (copy), `/AGENTS.md` raiz

---

## Status de implementação

| Item | Status |
| --- | --- |
| `USER_AGENTS_FILENAME = 'AGENTS.local.md'` | Feito |
| Template padrão extraído para `apps/sync-agent/src/lib/agents-template.ts` | Feito |
| `init` escreve o template padrão gerado | Feito |
| `pull` grava o item do usuário como `AGENTS.local.md` | Feito |
| `pull` regenera `AGENTS.md` após remover arquivos obsoletos | Feito |
| `diff` ignora `AGENTS.md` gerado | Feito |
| `diff` trata `AGENTS.local.md` como item especial sincronizado | Feito |
| Copy da UI para explicar `AGENTS.local.md` | Feito |
| Validação manual em workspace legado | Pendente |

---

## 1. Contexto — existem três "AGENTS.md"

| # | O quê | Onde vive | Público |
|---|---|---|---|
| 1 | `/AGENTS.md` da raiz do repo | arquivo versionado | agente que edita o **código-fonte** |
| 2 | Template padrão do sync-cli | string `AGENTS_MD` em `apps/sync-agent/src/commands/init.ts` | agente que organiza o **conteúdo** no workspace |
| 3 | AGENTS.md do usuário | Item especial (`USER_AGENTS_TITLE` = `AGENTS.md`, tag `system:agents`, `complexity: document`); editado em Configurações via `PUT /api/agents` | mesmo agente de conteúdo |

Este plano trata **#2 + #3** (o problema do adendo) e, de quebra, corrige **#1**
(divergência apontada na auditoria, §3.13/§15).

---

## 2. Problema

### 2.1 O #3 não é adendo do #2 — é sobrescrita

Os dois disputam o mesmo caminho `<workspace>/AGENTS.md`:

- O **#2** só é escrito **uma vez**, no `doit-sync init`
  (`init.ts:88`). Nunca mais é atualizado — congela na versão do `init`.
- No `pull` (`pull.ts:308`), o item AGENTS.md global do usuário (**#3**) recebe
  `baseSlug = USER_AGENTS_TITLE` (`"AGENTS.md"`) e `folderRel = ''`, gravando
  exatamente em `<workspace>/AGENTS.md`.
- `dedupeFilename` não evita a colisão: `localUntrackedMarkdownPaths`
  **exclui** `USER_AGENTS_TITLE` do conjunto de paths usados (`pull.ts:133`).

**Resultado:** no primeiro `pull` em que o usuário tenha qualquer AGENTS.md
configurado, o `writeFile` substitui o template padrão inteiro. O agente perde a
baseline do app (não apagar arquivos, não tocar `syncHash`, instruções de Drive,
estrutura de pastas) no instante em que o usuário escreve uma regra própria.

### 2.2 Pegadinha do round-trip

O `AGENTS.md` do workspace entra no manifest, então o `diff` reenvia o conteúdo
como `contentMd` do item do usuário (`diff.ts:176-196`). Concatenar
`padrão + adendo` num arquivo só faria o `diff` devolver o combinado inteiro como
conteúdo do usuário → no `pull` seguinte o padrão duplicaria. Por isso a solução
**não pode** ser um arquivo único concatenado sem delimitador.

---

## 3. Design escolhido — arquivos separados (Opção A)

Dois arquivos com papéis distintos, sem parsing frágil:

- **`<workspace>/AGENTS.md`** — sempre o **template padrão do app**. Gerado/
  regenerado em todo `pull`. Não entra no manifest, não sincroniza, não é editável.
  Cabeçalho avisa explicitamente: "arquivo gerado — não edite; regras suas vão em
  `AGENTS.local.md`".
- **`<workspace>/AGENTS.local.md`** (e `<pasta>/AGENTS.local.md` para adendos por
  pasta) — o **adendo do usuário** (#3). É o único arquivo que sincroniza
  (`diff`/`push`). Editável pelo usuário (UI) e pelo agente.

O template padrão instrui o agente a **ler também** os `AGENTS.local.md` (raiz e
da pasta em que estiver trabalhando). Assim o adendo complementa o padrão sem
sobrescrevê-lo, e cada arquivo tem uma única fonte da verdade.

---

## 4. Mudanças por arquivo

### Parte A — Infra de constantes e template

1. **`packages/core/src/item-rules.ts`** — adicionar constante:
   ```ts
   export const USER_AGENTS_FILENAME = 'AGENTS.local.md' as const
   ```
   `USER_AGENTS_TITLE` (`'AGENTS.md'`) continua sendo o **título do Item** no
   banco — só o **nome do arquivo** no workspace muda.

2. **Novo `apps/sync-agent/src/lib/agents-template.ts`** — extrair a string
   `AGENTS_MD` de `init.ts` para cá, exportada como `DEFAULT_AGENTS_MD`, para que
   `init` e `pull` usem a mesma fonte.

3. **Texto do template** — acrescentar cabeçalho no `DEFAULT_AGENTS_MD`:
   - "Este arquivo é gerado pelo `doit-sync` a cada `pull`. **Não edite aqui.**"
   - "Regras específicas suas (e do agente) ficam em `AGENTS.local.md`, na raiz
     e/ou dentro de pastas. Elas **complementam** estas regras — leia-as também."

### Parte B — `pull` (`apps/sync-agent/src/commands/pull.ts`)

4. Item AGENTS.md do usuário: trocar `baseSlug` de `USER_AGENTS_TITLE` para
   `USER_AGENTS_FILENAME` (`pull.ts:308`) → global vira `AGENTS.local.md`,
   por pasta vira `<pasta>/AGENTS.local.md`. Acaba a colisão.

5. Regenerar o padrão: escrever `DEFAULT_AGENTS_MD` em `<workspace>/AGENTS.md`
   **como último passo da mutação do workspace — depois de `removeStaleFiles`**
   (ver §5, migração). Esse arquivo nunca entra no `manifest`.

6. `localUntrackedMarkdownPaths` (`pull.ts:133`): trocar o filtro
   `path !== USER_AGENTS_TITLE` para ignorar tanto `AGENTS.md` (padrão gerado)
   quanto `AGENTS.local.md` não rastreados.

### Parte C — `diff` (`apps/sync-agent/src/commands/diff.ts`)

7. `isAgentsPath` (`diff.ts:91`): passar a casar o último segmento com
   `USER_AGENTS_FILENAME` (`AGENTS.local.md`).

8. **Ignorar o padrão gerado:** adicionar guarda para pular `relativePath === 'AGENTS.md'`
   (raiz). Sem isso, `walkMarkdown` pega o `AGENTS.md` gerado, `parseItemFile` não
   acha `id` no frontmatter e ele seria registrado como `created` — um item novo
   espúrio.

9. Ajustar a guarda existente `if (!manifestEntry && relativePath === USER_AGENTS_TITLE) continue`
   (`diff.ts:177`) para `=== USER_AGENTS_FILENAME` — continua não auto-criando
   adendo de raiz a partir do CLI (criação do item é via UI de Configurações).

### Parte D — `init` (`apps/sync-agent/src/commands/init.ts`)

10. Importar `DEFAULT_AGENTS_MD` do módulo novo no lugar da string inline.
    Comportamento do `init` inalterado; o `pull` é quem passa a manter o arquivo
    fresco daí em diante.

### Parte E — UI (`apps/web`)

11. `apps/web/src/components/agents/agents-editor-modal.tsx:62` — corrigir o texto
    "baixado pelo CLI como AGENTS.md" para "baixado pelo CLI como `AGENTS.local.md`,
    complementando o `AGENTS.md` padrão do app".

### Parte F — Correção do `/AGENTS.md` raiz (#1, item barato da auditoria)

12. Em `/AGENTS.md`:
    - `PROTECTED_FIELDS` → `['id', 'userId', 'syncHash', 'createdAt']` (faltava
      `syncHash`).
    - `EDITABLE_BY_AI_FIELDS` → alinhar com `packages/core/src/item-rules.ts`
      (`contentMd`, `folderId`, `areaId`, `dueTime`, `recurrence`, `localPath`…).
    - Substituir `body` → `contentMd` e `projectId` → `folderId` no texto e no
      exemplo de frontmatter.
    - Conferir a tabela de risco contra `packages/audit/src/risk.ts` e ajustar os
      tipos de mudança divergentes.

---

## 5. Migração de workspaces existentes

Workspaces que já fizeram `pull` têm o conteúdo do usuário em `<workspace>/AGENTS.md`
(que clobberou o template) e uma entrada de manifest `item → AGENTS.md`.

No **próximo `pull`** após o deploy, a migração é automática:

1. O item passa a resolver para `AGENTS.local.md`; como
   `next.localPath ('AGENTS.local.md') ≠ previous.localPath ('AGENTS.md')`,
   `removeStaleFiles` arquiva o `AGENTS.md` antigo em `_raw_archive` (se houver
   edição local não sincronizada) e o remove.
2. `pendingWrites` grava o conteúdo do usuário em `AGENTS.local.md`.
3. Como **último passo**, escrevemos o template padrão em `AGENTS.md`.

Ordem importa: o template padrão precisa ser escrito **depois** de
`removeStaleFiles`; caso contrário a remoção do `AGENTS.md` antigo apagaria o
template recém-escrito. Edições locais ainda não sincronizadas ficam preservadas
em `_raw_archive` — recomenda-se rodar `doit-sync diff` antes do `pull` de migração.

---

## 6. Validação

- `pnpm --filter @doit/sync-agent build` + typecheck/lint de `apps/web`.
- Verificar que `apps/sync-agent/src/commands/push.ts` não tem suposição sobre o
  nome `AGENTS.md` (grep de `USER_AGENTS` indica que não — confirmar).
- Teste manual no workspace:
  - `pull` sem AGENTS.md do usuário → só `AGENTS.md` padrão, nada sincroniza.
  - Criar AGENTS.md na UI → `pull` → aparece `AGENTS.local.md`, `AGENTS.md` padrão
    intacto.
  - Editar `AGENTS.local.md` → `diff` gera 1 `content_changed`; `AGENTS.md` padrão
    é ignorado pelo `diff`.
  - Workspace legado (AGENTS.md com conteúdo do usuário) → `pull` migra para
    `AGENTS.local.md` + restaura o padrão.

---

## 7. Fora de escopo

- `AGENTS.md` padrão **por pasta** — adendos de pasta continuam só como
  `AGENTS.local.md`; o padrão fica só na raiz.
- Inlining do adendo dentro do `AGENTS.md` (concatenação com delimitador) —
  descartado por fragilidade de parsing no round-trip (§2.2).
- Mudança no modelo de dados do Item (#3 continua sendo um Item com tag
  `system:agents`).
