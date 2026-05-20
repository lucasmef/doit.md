# AGENTS.md — Contrato para Agentes de IA

Este arquivo define as regras e convenções que agentes de IA (Claude Code, Cursor, Copilot, etc.)
devem seguir ao trabalhar com o repositório **doit.md**.

---

## Visão Geral do Projeto

doit.md é uma PWA de produtividade pessoal construída em Next.js 15 com monorepo pnpm.
Unifica notas, tarefas, projetos e calendário em uma única entidade chamada **Item**.

**Stack principal:**
- `apps/web` — Next.js 15 App Router, React 19, Tailwind CSS, SWR, NextAuth Credentials
- `apps/sync-agent` — CLI Node.js ESM (`doit-sync`)
- `packages/types` — tipos TypeScript compartilhados
- `packages/core` — lógica pura (ids, regras de item)
- `packages/db` — camada SQL com SQLite local por padrão e Postgres via `DATABASE_URL`
- `packages/md` — serialização/parsing de Markdown com frontmatter
- `packages/sync` — hash e manifest de sincronização
- `packages/audit` — classificação de risco de mudanças

---

## Regras para Agentes

### O que PODE ser editado

- Conteúdo (`body`) de qualquer item
- Tags de itens
- Data de vencimento (`dueDate`)
- Status de itens (exceto `archived` — ver abaixo)
- Título de itens (risk: médio — exige aprovação)
- Criação de novos itens

### O que NÃO PODE ser editado diretamente

- `id` — imutável
- `userId` — imutável
- `createdAt` — imutável
- `projectId` / `areaId` — alteração requer aprovação (risk: médio)
- `status: archived` — nunca restaurar via sync; use a UI
- Arquivos de schema (`packages/db/src/schemas/`)
- Arquivo `AGENTS.md` em si, exceto quando o usuário pedir explicitamente para atualizar estas instruções

### Campos protegidos (de `packages/core/src/item-rules.ts`)

```
PROTECTED_FIELDS = ['id', 'userId', 'createdAt']
EDITABLE_BY_AI_FIELDS = ['title', 'body', 'tags', 'dueDate', 'status', 'complexity']
```

---

## Fluxo de Sincronização

```
doit-sync pull     # baixa itens → .md com frontmatter
doit-sync diff     # detecta mudanças → envia para /api/sync/pending-batch
doit-sync push     # aplica pendentes aprovados na UI → /api/sync/push
```

### Níveis de Risco

| Tipo de mudança | Risco | Aprovação necessária |
|-----------------|-------|----------------------|
| `created`       | low   | Não                  |
| `content`       | low   | Não                  |
| `updated`       | low   | Não                  |
| `frontmatter`   | medium | Sim (UI)            |
| `renamed`       | medium | Sim (UI)            |
| `moved`         | medium | Sim (UI)            |
| `deleted`       | high  | Sim (UI) + confirmação |

Mudanças de risco **high** são bloqueadas no push até aprovação explícita na UI (`/audit`).

---

## Estrutura de Arquivos Markdown

Cada item é espelhado em `.doitmd/items/<slug>.md`:

```markdown
---
id: itm_abc123
title: Título do item
complexity: task
status: todo
dueDate: 2025-12-31
tags: [tag1, tag2]
projectId: prj_xyz
areaId:
createdAt: 2025-01-01T00:00:00.000Z
updatedAt: 2025-01-15T12:00:00.000Z
---

Conteúdo em Markdown aqui...
```

**Nunca altere** os campos `id`, `userId`, `createdAt`.

---

## Convenções de Código

### TypeScript
- Strict mode ativado (`noUncheckedIndexedAccess`)
- `exactOptionalPropertyTypes` **desativado**
- Models de persistência expostos por `@doit/db` usam `SqlModel` com helpers como `find`, `findOne`, `create`, `updateOne` e `lean`
- Preferir `Record<string, unknown>` sobre `any` em results de `.lean()`

### Imports
- Usar aliases `@/` para imports dentro de `apps/web/src/`
- Packages do monorepo: `@doit/types`, `@doit/core`, `@doit/db`, etc.
- Nunca importar `@doit/db` em componentes client — apenas em Route Handlers

### API Routes (Next.js)
- Sempre validar `userId` via `auth()`/`requireUserId()` de `apps/web/src/lib/auth.ts` antes de qualquer operação protegida
- Sempre chamar `await ensureDB()` antes de queries em `@doit/db`
- Retornar `{ error: 'Unauthorized' }` com status 401 quando não autenticado
- Catch global retorna `{ error: 'Internal error' }` com status 500

### Componentes
- Componentes client começam com `'use client'`
- Hooks de dados usam SWR — nunca `useEffect` + `fetch` direto
- Estado global de UI via `UIContext` (`store/ui.ts`) — não Redux/Zustand
- Toasts via `useToast()` do `components/ui/toast.tsx`

---

## Variáveis de Ambiente Necessárias

```env
# apps/web/.env.local
DATABASE_URL=
NEXTAUTH_SECRET=<replace-with-random-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

---

## Execução Local e Testes de Usabilidade

Agentes podem rodar o site localmente para **teste de usabilidade, validação visual e fluxos no navegador**, desde que o servidor seja temporário e controlado.

Regras obrigatórias:

- Preferir validações que encerram sozinhas quando teste visual não for necessário, como type-check, build e testes pontuais.
- Se for necessário testar a UI, o agente pode iniciar `pnpm dev`, `pnpm --filter @doit/web dev`, `next dev` ou comando equivalente.
- Antes de iniciar, verificar se já existe servidor rodando na porta pretendida. Se houver, reutilizar esse servidor ou escolher outra porta.
- Registrar o PID/processo iniciado pelo agente.
- Encerrar todos os processos iniciados pelo agente ao terminar o teste, inclusive servidores, watchers e processos filhos relacionados.
- Não deixar servidor persistente rodando após a resposta final.
- Se o servidor não puder ser encerrado automaticamente, informar isso claramente e indicar o PID/comando para encerramento manual.

---

## Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Type check
pnpm --filter @doit/web exec tsc --noEmit

# Build permitido para validação
pnpm --filter @doit/web build

# CLI sync (após build do sync-agent)
pnpm --filter @doit/sync-agent build
doit-sync init
```
