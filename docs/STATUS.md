# Status do Projeto — doit.md

**Última atualização:** Maio 2025  
**Estado geral:** MVP implementado, aguardando configuração de ambiente e deploy

---

## Progresso por Fase

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Setup: monorepo, packages, Tailwind, NextAuth | ✅ Completo |
| 1 | Core CRUD: Items, Projects, Areas | ✅ Completo |
| 2 | UI completa: layout, views, componentes | ✅ Completo |
| 3 | Sync Agent CLI + Auditoria | ✅ Completo |
| 4 | Google Calendar + Polish | ✅ Completo |
| 5 | Deploy em produção | ⏳ Pendente |
| 6 | Pós-MVP (features futuras) | 📋 Backlog |

---

## Checklist Completo

### Fase 0 — Setup
- [x] pnpm workspace com `apps/*` e `packages/*`
- [x] `tsconfig.base.json` com strict mode
- [x] `packages/types` — tipos Item, Project, Area, CalendarEvent, Audit
- [x] `packages/core` — `generateId()`, `isToday()`, `isOverdue()`, labels
- [x] Tailwind com cores customizadas (brand, surface) e animações (slide-up, fade-in)
- [x] NextAuth middleware protegendo todas as rotas não-públicas
- [x] Layout raiz com PWA metadata

### Fase 1 — Core CRUD
- [x] `packages/db` — connection singleton e models SQL para SQLite/Postgres
- [x] Models: Item, Project, Area, CalendarEvent, AuditLog, PendingChange, ItemVersion, GoogleAccount, User
- [x] `apps/web/src/lib/db.ts` — `ensureDB()` singleton
- [x] `apps/web/src/lib/auth.ts` — `requireUserId()`
- [x] `GET/POST /api/items` — listar e criar
- [x] `GET/PATCH/DELETE /api/items/[id]` — obter, atualizar, soft-delete
- [x] `GET/POST /api/items/[id]/versions` — versões e restore
- [x] `GET/POST /api/projects` — listar e criar
- [x] `GET/PATCH/DELETE /api/projects/[id]`
- [x] `GET/POST /api/areas` — listar e criar
- [x] `PATCH/DELETE /api/areas/[id]`
- [x] Hook `useItems()` com SWR e mutate global
- [x] Hook `useProjects()` com SWR
- [x] Hook `useAreas()` com SWR

### Fase 2 — UI Completa
- [x] Layout `(app)/layout.tsx` — Sidebar + Topbar + BottomNav + ItemDetail + QuickCapture
- [x] `components/layout/sidebar.tsx` — projetos dinâmicos via SWR, NavLink ativo
- [x] `components/layout/topbar.tsx` — busca (visual) + botão "+ Novo"
- [x] `components/layout/bottom-nav.tsx` — mobile only, 5 tabs
- [x] `store/ui.ts` + `store/ui-provider.tsx` — selectedItemId, quickCaptureOpen
- [x] `components/ui/toast.tsx` — ToastProvider, useToast(), 3 tipos, slide-up
- [x] `components/items/item-row.tsx` — checkbox, badge, data vencida
- [x] `components/items/item-list.tsx` — skeleton, empty state, fade-in
- [x] `components/items/item-detail.tsx` — autosave 800ms, todos os campos
- [x] `components/items/item-versions.tsx` — collapsible, restore com confirm
- [x] `components/items/quick-capture.tsx` — modal ⌘K, complexity, date
- [x] `components/items/complexity-badge.tsx` / `status-badge.tsx`
- [x] `components/items/complexity-select.tsx` / `status-select.tsx`
- [x] `components/projects/project-card.tsx` — 8 cores
- [x] `components/projects/create-project-form.tsx`
- [x] `components/areas/create-area-form.tsx`
- [x] `components/ui/calendar-grid.tsx` — grade mensal com navegação e dots
- [x] `components/ui/day-agenda.tsx` — itens do dia selecionado
- [x] Página `/inbox`
- [x] Página `/today` — com EventCards do Google Calendar
- [x] Página `/upcoming` — agrupado por semana
- [x] Página `/projects` — lista + criar inline
- [x] Página `/projects/[id]` — edição de nome inline, itens abertos/fechados
- [x] Página `/areas` — com chips de projetos
- [x] Página `/calendar` — CalendarGrid + DayAgenda

### Fase 3 — Sync Agent + Auditoria
- [x] `packages/md` — `parseItemFile()`, `serializeItemFile()`, `itemFilename()`
- [x] `packages/sync` — `hashContent()`, `createManifest()`
- [x] `packages/audit` — `assessRisk(changeType)`
- [x] `apps/sync-agent` — CLI com commander
- [x] Comando `doit-sync init` — cria workspace, AGENTS.md, salva config
- [x] Comando `doit-sync pull` — baixa itens como .md, gera manifest.json
- [x] Comando `doit-sync diff` — detecta mudanças, envia pending-batch, loga
- [x] Comando `doit-sync push` — valida, versiona, patcha, limpa pending
- [x] Comando `doit-sync status` — tempos de pull/diff/push, contagem pending
- [x] `GET /api/audit/logs` — histórico com filtros
- [x] `GET /api/sync/pending` — pendentes para aprovação
- [x] `POST /api/sync/approve` / `reject` / `push` / `log` / `pending-batch`
- [x] `components/audit/diff-viewer.tsx` — before/after side-by-side
- [x] `components/audit/pending-change-card.tsx` — expandable, approve/reject
- [x] `components/audit/audit-log-row.tsx` — ícone + cor por tipo
- [x] Página `/audit` — abas Pendentes / Logs, apply button

### Fase 4 — Google Calendar + Polish
- [x] `apps/web/src/lib/google.ts` — createOAuthClient, getAuthUrl, refresh, getCalendarClient
- [x] `GET /api/google` — redireciona para OAuth
- [x] `GET /api/google/callback` — troca code, salva GoogleAccount, redireciona
- [x] `POST /api/google/disconnect` — remove conta e eventos
- [x] `GET /api/google/account` — retorna conta conectada
- [x] `POST /api/calendar/sync` — sincroniza próximos 30 dias
- [x] `GET /api/calendar/events` — filtra por from/to
- [x] Hook `useCalendarEvents()` + `syncGoogleCalendar()`
- [x] EventCard na página `/today`
- [x] Página `/settings` — conectar/desconectar/sincronizar Google + instruções CLI
- [x] Settings adicionado à Sidebar
- [x] Toast ao retornar do OAuth (`?google=connected`)
- [x] Skeleton de loading mais realista no ItemList
- [x] `animate-fade-in` no ItemList
- [x] `brand-200` adicionado ao Tailwind
- [x] Type check (`tsc --noEmit`) passando sem erros
- [x] Hook `useKeyboard()` — registry genérico de atalhos
- [x] Escape fecha QuickCapture ou deseleciona item (UIProvider)

---

## O que Falta

### Bloqueadores de Ambiente (Alta Prioridade)

- [ ] Criar `apps/web/.env.local` com todas as variáveis de ambiente
  - `DATABASE_URL` (vazio para SQLite local, `postgresql://...` para Postgres)
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- [x] Login local via NextAuth Credentials
- [ ] Criar projeto no Google Cloud Console, habilitar Calendar API, obter credenciais OAuth2
- [ ] Rodar `pnpm install` e `pnpm --filter @doit/web build` para validar sem manter servidor local ativo

### MVP Incompleto (Média Prioridade)

- [x] Busca global de itens — barra no Topbar existe e funciona com SWR Debounce
  - [x] Criar `GET /api/items/search?q=` com busca SQL via `@doit/db`
  - [x] Conectar ao input do Topbar com debounce
- [x] Página de erro 404 (`app/not-found.tsx`)
- [x] Error boundary global (`app/error.tsx`)
- [x] Página inicial (`/`) — landing page e redirect automático para `/today` se logado
- [ ] Build do `apps/sync-agent` e teste do CLI end-to-end

### Polish (Baixa Prioridade)

- [x] Atalhos de teclado: `j/k` e `ArrowDown/Up` para navegar lista de itens
- [x] Atalho `e` para abrir item selecionado no painel de detalhes
- [x] Animação de entrada nos itens individuais (stagger com delay progressivo por índice)
- [x] Confirmação visual ao completar tarefa (`check-pop` animado + `ring-pulse` no checkbox)
- [x] Empty state ilustrado na Inbox (SVG artesanal com caixa e checkmark)
- [ ] Favicon e ícones PWA para iOS/Android

### Pós-MVP / Backlog

- [ ] Google Calendar write — criar evento a partir de um item com dueDate
- [ ] Múltiplos calendários Google (hoje só sincroniza o primário)
- [ ] Tarefas recorrentes (`rrule`)
- [ ] Service Worker para funcionamento offline
- [ ] Busca full-text em Postgres/SQLite, conforme ambiente
- [ ] Publicar `doit-sync` no npm
- [ ] Deploy em produção com Postgres
- [ ] Domínio personalizado
- [ ] Notificações push para tarefas com prazo
- [ ] App mobile nativo (React Native ou Capacitor)

---

## Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `AGENTS.md` | Contrato para agentes de IA |
| `docs/PRD.md` | Product Requirements Document completo |
| `docs/STATUS.md` | Este arquivo |
| `apps/web/.env.local` | Variáveis de ambiente (NÃO commitar) |
| `apps/web/src/app/(app)/layout.tsx` | Layout principal do app |
| `packages/db/src/` | Conexão e models SQL SQLite/Postgres |
| `packages/core/src/item-rules.ts` | Regras de negócio centrais |

---

## Decisões Técnicas Relevantes

| Decisão | Motivo |
|---------|--------|
| API `SqlModel` em `@doit/db` | Mantém uma interface simples de persistência para SQLite e Postgres |
| `exactOptionalPropertyTypes: false` | Reduz fricção com campos opcionais serializados e dados vindos do banco |
| SWR com mutate global | Invalida caches relacionados sem refetch manual |
| Soft-delete (status: archived) | Preserva histórico, permite restore |
| Markdown com frontmatter | Formato editável por humanos e agentes de IA |
| Risco high bloqueia push | Previne deleções acidentais por agentes automáticos |
