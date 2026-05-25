# PRD — CLI doit-sync (Agente de Sincronização Markdown)

**Status:** Concluído — todas as fases entregues
**Data:** 2026-05-10
**Autor:** Lucas
**Componente afetado:** `apps/sync-agent`, `packages/db`, `apps/web/src/app/api/cli-tokens/*`, `apps/web/src/components/settings/*`

---

## 1. Contexto

Existe um pacote `apps/sync-agent` (CLI `doit-sync`) com comandos `init`, `pull`, `diff`, `push`, `status`. Hoje a CLI:

- Não roda standalone — depende dos pacotes `@doit/*` do workspace consumidos como `.ts` cru, o que falha em Node ESM (`ERR_MODULE_NOT_FOUND` ao importar `./frontmatter` sem extensão).
- Autentica com `DOITMD_API_KEY` em variável de ambiente (anti-pattern para distribuição).
- O `pull` joga **tudo** em `00-inbox` ou `90-arquivo`, ignorando a árvore real de pastas e o tipo (tarefa vs. nota).
- O `init` já cria um `AGENTS.md` no workspace para guiar a IA, mas o conteúdo aponta para uma estrutura de pastas que não corresponde ao app real.

O objetivo é entregar uma CLI **publicável no npm**, que um usuário possa instalar globalmente sem clonar o monorepo, fazer login via token gerado no app e sincronizar suas notas/tarefas em arquivos Markdown organizados — incluindo deixar a IA editar o workspace e propagar mudanças via `diff` → aprovar no app → `push`.

## 2. Objetivo

Permitir o fluxo:

1. Usuário gera um CLI token em **Configurações → CLI** no app.
2. Roda `npm i -g doit-sync` e `doit-sync login`, cola o token.
3. `doit-sync pull` baixa tudo num diretório local com estrutura espelhando o app + `AGENTS.md` orientando a IA.
4. IA (Claude Code, Cursor, etc.) edita os `.md` livremente.
5. `doit-sync diff` detecta mudanças, envia para `Auditoria` no app.
6. Usuário aprova no app (UI já existe).
7. `doit-sync push` aplica mudanças aprovadas; histórico fica no app via `item_versions` e `audit_logs` (já existentes).

## 3. Escopo

### In-scope

- Tabela `cli_tokens` no DB (SQLite + Postgres) com hash de segredo.
- Endpoints `/api/cli-tokens` (CRUD) e `/api/me` (validação).
- Auth dual no servidor: NextAuth para web + Bearer `doit_*` para CLI nas rotas de sync.
- UI de gerenciamento de tokens em Settings.
- Reescrita do `pull` para espelhar pastas reais + roteamento `Inbox/Proximos/Arquivo`.
- `AGENTS.md` revisado com a estrutura nova.
- `diff`/`push` ajustados para detectar mudanças de pasta (movimento), criação de novos arquivos, mudança de `complexity` no frontmatter.
- Bundle com `tsup` inlinando workspace deps.
- README de instalação em `apps/sync-agent/README.md`.

### Out-of-scope

- OAuth device flow (token simples basta).
- Binário standalone (.exe / Mach-O) via `pkg`/`bun build --compile` — Node global install é suficiente.
- Sync bidirecional de eventos do Google Calendar (CLI cuida só de items + folders).
- Conflict resolution sofisticado (last-write-wins por hash, mostra diff antes de aplicar).
- Watch mode (`doit-sync watch`).

## 4. Decisões de design

| Pergunta | Decisão |
|---|---|
| Autenticação | Token gerado no app, formato `doit_<prefix>_<secret>`. Hash sha256 do secret no DB. |
| Diferenciação task/note | `complexity: task \| note` no frontmatter YAML. |
| Fluxo de aprovação | Mantém `diff` → aprovar em **Auditoria** no app → `push`. Histórico via `item_versions` + `audit_logs` já existentes. |
| Estrutura de pastas | Espelha árvore real do app. Casos especiais: `Inbox/` (sem pasta), `Proximos/` (tarefa sem pasta com data), `Arquivo/` (status archived). |
| DB | `SqlModel` custom (SQLite/Postgres). Schemas Mongoose em `packages/db/src/schemas/` são legacy não usados. |
| Distribuição | npm via `npm i -g doit-sync` (bundle único com `tsup`). |

## 5. Plano de implementação

### Fase 1 — Servidor: CLI Tokens — **concluída ✓**

**Banco de dados (`packages/db/src/connection.ts` + `index.ts`)**
- [x] `CREATE TABLE cli_tokens` em `sqliteSchema` (postgresSchema é gerado a partir dele)
- [x] Índices `cli_tokens_user_idx` e `cli_tokens_prefix_idx`
- [x] `CliTokenModel = new SqlModel({ table: 'cli_tokens' })` exportado

**Tipo (`packages/types/src/`)**
- [x] `CliToken`, `PublicCliToken`, `CreateCliTokenInput` em `packages/types/src/cli-token.ts`
- [x] `newCliTokenId()` em `packages/core/src/ids.ts`

**Helper (`apps/web/src/lib/cli-auth.ts`)**
- [x] `generateCliToken(userId, name)` — formato `doit_<prefix>_<secret>`, sha256(secret) salvo
- [x] `validateCliBearer(header)` — busca por prefix, timing-safe compare, atualiza `lastUsedAt`
- [x] `listCliTokens(userId)` e `revokeCliToken(userId, id)`

**Auth dual (`apps/web/src/lib/auth.ts`)**
- [x] `authWithCli(req)` — NextAuth primeiro, fallback Bearer `doit_*`

**API endpoints**
- [x] `POST /api/cli-tokens` — cria, retorna plaintext uma vez
- [x] `GET /api/cli-tokens` — lista
- [x] `DELETE /api/cli-tokens/[id]` — revoga
- [x] `GET /api/me` — aceita web ou CLI
- [x] `/api/sync/{push,pending-batch,log}`, `/api/items` GET, `/api/folders` GET migrados para `authWithCli`

**UI (`apps/web/src/components/settings/cli-tokens-section.tsx`)**
- [x] Lista de tokens com nome, prefix mascarado, criado/último uso, botão revogar
- [x] Criação via `useDialog().prompt` → plaintext destacado em amarelo, botão copiar (só uma vez)
- [x] Aba "CLI" em `apps/web/src/app/(app)/settings/page.tsx` (entre Sync e Tags)
- [x] Card com instruções de install (`npm i -g doit-sync` + `login` + `pull`)

### Fase 2 — CLI: Login + Pull — **concluída ✓**

- [x] `doit-sync login [--api-url] [--token]` — prompt interativo (ou via flags), valida `/api/me`, salva token+userId via `conf`
- [x] `lib/config.ts` reformulado: `isInitialized()`, `isLoggedIn()`, `clearAuth()`, mensagens distintas para "não inicializado" vs "não autenticado"
- [x] `commands/pull.ts` reescrito:
  - Busca `/api/folders` + `/api/items` em paralelo via Bearer token
  - `buildFolderTree(folders)` → `FolderNode[]` com `relativePath` slug, dedup de nomes (`pasta-2`, etc.)
  - Cria todos os diretórios reais (subpastas vazias visíveis)
  - Roteamento `resolveItemFolder(item)`:
    - `archived` → `Arquivo/`
    - `folderId` → caminho real espelhado
    - `task + dueDate` sem pasta → `Proximos/`
    - resto sem pasta → `Inbox/`
  - Dedupe de filenames colidindo no mesmo dir (`titulo-2.md`)
  - Manifest com `{ itemId, localPath, syncHash, updatedAt }`
- [x] `init` agora aceita `[path]` arg, escreve `AGENTS.md` revisado e configura só o `workspacePath`
- [x] `AGENTS.md` atualizado: regras (não apagar/não tocar `id`/`syncHash`/`_system`), estrutura `Inbox/Proximos/Arquivo` + pastas reais, frontmatter padrão, fluxo `diff → aprovar → push`
- [x] `lib/workspace.ts` ganha `slugify()` e constantes `SPECIAL_DIRS`
- [x] `cli.ts` registra comando `login` com flags `--api-url` e `--token`

### Fase 3 — CLI: Diff/Push refinados — **concluída ✓**

**CLI (`apps/sync-agent/src/commands/diff.ts`)**
- [x] `walkMarkdown(root)` ignora `_system/`, `_changes/`, `node_modules`, `.git`, `AGENTS.md`, `README.md`
- [x] Detecta `created` — arquivos sem `id` no frontmatter ou com `id` ausente do manifest
- [x] Detecta `moved` — `relativePath` divergente do `manifest.localPath`
- [x] Detecta `content_changed` — hash divergente; popula `contentMdAfter` e `frontmatterChanges` (incluindo mudança de `complexity`)
- [x] Detecta `deleted` — entries do manifest sem arquivo correspondente
- [x] `riskLevel` derivado via `assessRisk()` (já em `@doit/audit`)
- [x] Pode emitir múltiplos changes por item (move + content edit no mesmo arquivo)

**Servidor (`apps/web/src/app/api/sync/push/route.ts` + `lib/path-resolver.ts`)**
- [x] `slugify` movido para `@doit/core` (compartilhado entre CLI e server)
- [x] `resolveFolderFromPath(folders, relativePath)` reconstrói árvore com slugs e mapeia path → `{ folderId, special }`
- [x] `created` cria novo item (gera `newItemId` se ausente), resolve `folderId` do `localPathAfter`, aplica frontmatter
- [x] `moved` atualiza `folderId` (e força `archived` se path = `Arquivo/...`)
- [x] `frontmatter_changed` aplica campos permitidos (`title`, `complexity`, `status`, `tags`, `dueDate`, `priority`)
- [x] Snapshot via `ItemVersionModel` antes de aplicar (mantém histórico em Auditoria)
- [x] `AuditLog` por mudança (`file_created`, `file_moved`, `file_updated`, `file_deleted`) + log resumo do push
- [x] Bloqueia mudanças `high` risk não aprovadas (já fazia, mantido)

### Fase 4 — Bundle + Publish — **concluída ✓**

- [x] `apps/sync-agent/tsup.config.ts` — ESM, target node20, `noExternal: [/^@doit\//]` (sem banner — shebang já está no source)
- [x] `package.json`:
  - Renomeado `@doit/sync-agent` → `doit-sync` (publishable)
  - `bin: { doit-sync: ./dist/cli.js }`, `files: ["dist", "README.md"]`
  - `@doit/*` movidos para `devDependencies` (são bundlados, não runtime)
  - `node-fetch` removido (Node 20 tem fetch nativo)
  - `engines.node >= 20`, `publishConfig.access: public`, `prepublishOnly: pnpm build`
- [x] `apps/sync-agent/README.md` com install, setup (login), comandos, estrutura, frontmatter, fluxo IA, troubleshooting
- [x] Imports com prefixo `node:` (esbuild não reconhece subpaths como `readline/promises` sem ele)
- [x] Smoke test:
  - `pnpm build` → `dist/cli.js` 25.8 KB
  - `pnpm pack` → tarball só com `dist/cli.js`, `package.json`, `README.md`
  - Instalado em diretório limpo (`/tmp/doit-test`) via `npm install <tarball>` — `doit-sync --help` funciona

## 6. Estrutura do workspace baixado pelo CLI

```
workspace-doitmd/
├── AGENTS.md                    # regras pra IA
├── README.md                    # explicação humana
├── Inbox/                       # itens sem pasta (notas, ou tarefas sem data)
│   └── ideia-blog.md
├── Proximos/                    # tarefas sem pasta com data
│   └── ligar-medico.md
├── Arquivo/                     # itens com status=archived
├── Trabalho/                    # pastas reais espelhadas
│   ├── Cliente A/
│   │   ├── reuniao-kickoff.md
│   │   └── proposta.md
│   └── Cliente B/
├── _system/                     # estado do sync (não editar)
│   ├── manifest.json
│   ├── sync-state.json
│   ├── last-pull.json
│   ├── last-diff.json
│   └── last-push.json
└── _changes/                    # mudanças locais detectadas
    └── pending.json
```

## 7. Frontmatter padrão

```yaml
---
id: itm_xxx                # nunca alterar
title: Reunião kickoff
complexity: task           # task | note
status: todo               # inbox | todo | doing | waiting | done | archived
priority: 2                # 1-4 (opcional, só task)
dueDate: 2026-05-15        # opcional
folderId: fld_xxx          # opcional, deduzido do path mas espelhado
tags: [trabalho, urgente]
syncHash: abc123def456     # nunca alterar manualmente
updatedAt: 2026-05-10T14:00:00Z
---

Conteúdo markdown livre.
- [ ] Subtarefa pendente
- [x] Subtarefa concluída
```

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Token vaza em logs/shell history | Mostrar plaintext só uma vez; permitir revogação imediata; armazenar hash, nunca plaintext. |
| Conflito de edição (web vs. CLI) | `syncHash` no frontmatter; servidor valida hash antes de aplicar; conflito vai pra Auditoria. |
| IA deletar arquivos importantes | `AGENTS.md` proíbe `rm`; `diff` marca delete como risco `high`; aprovação manual obrigatória. |
| Renomeio de pasta no app quebra path local | Manifest usa `itemId`, não path. `pull` reorganiza paths localmente; movimentos viram `move` no audit. |
| Bundle incluir secrets de dev | `.npmignore` explícito; CI valida que só `dist/` e docs vão para o tarball. |

## 9. Métricas de sucesso

- `npm i -g doit-sync` + `doit-sync login` + `doit-sync pull` funciona em máquina limpa sem o repo.
- Estrutura local após `pull` reflete fielmente a árvore do app, com `Inbox/Proximos/Arquivo` populados conforme regra.
- Edição manual ou via IA num `.md` é detectada por `diff`, aprovada em Auditoria e aplicada por `push`.
- Token revogado bloqueia operações da CLI imediatamente.

## 10. Status por fase

| Fase | Status | Atualizado em |
|---|---|---|
| 1 — CLI Tokens (servidor + UI) | ✅ Concluída | 2026-05-10 |
| 2 — CLI Login + Pull | ✅ Concluída | 2026-05-10 |
| 3 — CLI Diff/Push refinados | ✅ Concluída | 2026-05-10 |
| 4 — Bundle + Publish | ✅ Concluída | 2026-05-10 |

Atualizar esta tabela ao iniciar/concluir cada fase.
