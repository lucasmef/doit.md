# PRD — doit.md: Personal Productivity PWA

**Versão:** 1.0  
**Data:** Maio 2025  
**Autor:** Lucas  

---

## 1. Visão do Produto

doit.md é uma **PWA de produtividade pessoal** que unifica notas, tarefas, projetos e calendário
em uma única entidade chamada **Item**, com complexidade progressiva.

### Problema
Ferramentas atuais (Notion, Todoist, Apple Notes) são silos separados. O usuário fragmenta
seu contexto entre apps diferentes, perdendo tempo e criando inconsistências.

### Solução
Um único lugar onde uma captura rápida pode evoluir de capture → task → project organicamente,
sem migração de dados ou mudança de app.

### Público-alvo
Profissionais de tecnologia e criadores que usam agentes de IA (Claude Code, Cursor) no fluxo
de trabalho e querem um sistema de produtividade que se integra nativamente com IA.

---

## 2. Entidade Central: Item

```
capture → task → project → area
```

| Complexidade | Descrição |
|-------------|-----------|
| `capture`   | Ideia rápida, sem estrutura |
| `task`      | Ação com checkbox, pode ter data |
| `project`   | Conjunto de tarefas relacionadas |
| `area`      | Responsabilidade contínua de vida |

### Campos do Item
- `id` — imutável, gerado com base62 (`itm_xxxx`)
- `title` — obrigatório
- `body` — Markdown opcional
- `complexity` — capture | task | project | area
- `status` — inbox | todo | in_progress | done | archived
- `dueDate` — ISO date (YYYY-MM-DD)
- `tags` — array de strings
- `projectId` / `areaId` — referência
- `userId` — ID local do usuario autenticado
- `createdAt` / `updatedAt`

---

## 3. Funcionalidades do MVP

### 3.1 Captura Rápida
- Modal ⌘K acessível de qualquer tela
- Campo de título com complexidade selecionável
- Data de vencimento opcional
- Salva no Inbox

### 3.2 Views Principais
- **Inbox** — itens sem projeto/área, status inbox
- **Hoje** — itens com `dueDate = today` ou atrasados + eventos Google Calendar
- **Próximos** — agrupados: Amanhã / Esta semana / Próxima semana / Mais tarde / Sem data
- **Calendário** — grade mensal com dots, agenda do dia selecionado
- **Projetos** — lista com cards coloridos, status, filtro ativo/concluído
- **Áreas** — responsabilidades contínuas com projetos associados

### 3.3 Edição de Item
- Painel lateral (desktop) / página (mobile)
- Autosave com debounce de 800ms
- Título inline editável
- Editor Markdown para corpo
- Seletores: complexidade, status, projeto, área
- Tags
- Data de vencimento com picker

### 3.4 Google Calendar
- OAuth2 read-only via googleapis
- Sync dos próximos 30 dias do calendário primário
- Eventos aparecem na visão Hoje e no Calendário mensal
- Configurações: conectar, desconectar, sincronizar manualmente

### 3.5 Agente de Sincronização (CLI)
- `doit-sync init` — configura workspace
- `doit-sync pull` — baixa itens como arquivos .md
- `doit-sync diff` — detecta mudanças e classifica por risco
- `doit-sync push` — aplica mudanças aprovadas na UI
- `doit-sync status` — mostra estado atual

### 3.6 Auditoria e Aprovação
- Toda mudança do agente cria um `PendingChange`
- UI em `/audit` para aprovar/rejeitar por risco
- Histórico de todas as ações em `AuditLog`
- Versionamento de itens com restore

---

## 4. Arquitetura Técnica

### Stack
- **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS v3, SWR
- **Auth:** NextAuth com Credentials
- **Database:** MongoDB Atlas via Mongoose
- **Monorepo:** pnpm workspaces
- **CLI:** Node.js ESM, commander, ora, chalk, conf

### Monorepo Structure
```
apps/
  web/           # Next.js PWA
  sync-agent/    # CLI doit-sync
packages/
  types/         # Tipos TypeScript compartilhados
  core/          # Lógica pura (ids, regras)
  db/            # Mongoose schemas
  md/            # Frontmatter serialization
  sync/          # Hash e manifest
  audit/         # Risk assessment
  ui/            # Componentes compartilhados (futuro)
```

### Princípios de Design
- **API-first:** toda lógica de negócio via Route Handlers
- **Offline-ready:** SWR cache + PWA manifest
- **Type-safe:** TypeScript strict em todos os packages
- **AI-native:** AGENTS.md como contrato, Markdown como formato de sync

---

## 5. Fases de Desenvolvimento

### Fase 0 — Setup ✅
Monorepo, packages base, TypeScript, Tailwind, NextAuth, variáveis de ambiente

### Fase 1 — Core CRUD ✅
Schemas Mongoose, API REST para Items/Projects/Areas, hooks SWR, páginas base

### Fase 2 — UI Completa ✅
Layout responsivo, ItemDetail, QuickCapture, todas as views, componentes

### Fase 3 — Sync Agent + Auditoria ✅
CLI doit-sync, Markdown mirror, PendingChange, aprovação na UI, versionamento

### Fase 4 — Google Calendar + Polish ✅
OAuth2, sync de eventos, Settings page, animações, skeletons, type-check limpo

### Fase 5 — Produção (pendente)
Deploy Vercel, MongoDB Atlas produção, variáveis de ambiente, domínio

### Fase 6 — Pós-MVP (futuro)
Google Calendar write, tarefas recorrentes, busca full-text, offline SW, mobile drag

---

## 6. Não está no Escopo (MVP)

- Colaboração / times
- Múltiplos usuários por workspace
- Integrações além do Google Calendar
- Notificações push
- IA generativa embutida no app (usa agentes externos via sync)
- App nativo iOS/Android
