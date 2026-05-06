# AGENTS.md — Contrato para Agentes de IA

Este arquivo define as regras e convenções que agentes de IA (Claude Code, Cursor, Copilot, etc.)
devem seguir ao trabalhar com o repositório **doit.md**.

---

## Visão Geral do Projeto

doit.md é uma PWA de produtividade pessoal construída em Next.js 15 com monorepo pnpm.
Unifica notas, tarefas, projetos e calendário em uma única entidade chamada **Item**.

**Stack principal:**
- `apps/web` — Next.js 15 App Router, Tailwind CSS, SWR, Clerk
- `apps/sync-agent` — CLI Node.js ESM (`doit-sync`)
- `packages/types` — tipos TypeScript compartilhados
- `packages/core` — lógica pura (ids, regras de item)
- `packages/db` — Mongoose schemas e conexão MongoDB
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
- Arquivo `AGENTS.md` em si

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
- `exactOptionalPropertyTypes` **desativado** (causa fricção com Mongoose)
- Todos os Mongoose models exportados como `Model<any>` para evitar erros de union type
- Preferir `Record<string, unknown>` sobre `any` em results de `.lean()`

### Imports
- Usar aliases `@/` para imports dentro de `apps/web/src/`
- Packages do monorepo: `@doit/types`, `@doit/core`, `@doit/db`, etc.
- Nunca importar `@doit/db` em componentes client — apenas em Route Handlers

### API Routes (Next.js)
- Sempre validar `userId` via `auth()` do Clerk antes de qualquer operação
- Sempre chamar `await ensureDB()` antes de queries Mongoose
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
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

---

## Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Rodar em desenvolvimento
pnpm --filter @doit/web dev

# Type check
pnpm --filter @doit/web exec tsc --noEmit

# Build
pnpm --filter @doit/web build

# CLI sync (após build do sync-agent)
pnpm --filter @doit/sync-agent build
doit-sync init
```
