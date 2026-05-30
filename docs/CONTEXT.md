# Project Context

This file stores durable project context for Codex and BuilderFlow.

## Product

doit.md is a personal productivity PWA that unifies notes, tasks, projects, calendar data, and attachments around one central entity: the Item.

The app supports quick capture, Inbox, Today, Upcoming, Calendar, folders, tags, archived items, a Markdown editor, item version history, Google Calendar sync, Google Drive attachments, and an audited local Markdown sync workflow for AI-assisted edits.

## User workflow

The user is a founder-builder with limited coding time.

Preferred workflow:

- one task at a time
- local development first
- AI agent executes asynchronously
- user reviews later
- deploy only after validation
- after validated implementation, commit on local `dev`, push `dev`, and open a PR from `dev` to `main` unless explicitly told not to publish

## Agent workflow roles

- `builderflow` is the primary process skill. It governs task classification, Grill Gate, living specs in `specs/`, ADR handling, validation reporting, and final summaries.
- `doit-workflow` is a companion domain-rules skill. Use it for doit.md-specific rules around Items, Markdown sync files, sync/audit behavior, protected fields, app/package boundaries, auth/API conventions, calendar/Drive behavior, and private user data.
- Do not treat `doit-workflow` as a competing planning workflow.
- Frontend-impacting BuilderFlow tasks require temporary local server validation, browser testing, screenshots, and server shutdown before the task can be marked done.

## Development workflow

Default branch and environment model:

```txt
dev: local development + Git
main: production branch + production server
```

There should be no assumption of a permanent dev environment on the server unless an ADR says otherwise.

Default AI delivery handoff:

- finish implementation and validation locally
- update the BuilderFlow living spec
- commit only the scoped task changes on `dev`
- push `dev` to GitHub
- open a PR from `dev` to `main` for review
- do not merge to `main` or deploy unless the user explicitly asks

## Stack

- Monorepo managed with pnpm 9.
- Node.js 20+.
- `apps/web`: Next.js 15 App Router, React 19, Tailwind CSS, SWR, NextAuth Credentials, TipTap, Google APIs, web-push.
- `apps/sync-agent`: Node.js ESM CLI published as `doit-sync`, built with tsup and run locally with tsx.
- `packages/types`: shared TypeScript types.
- `packages/core`: IDs, slug helpers, recurrence/date helpers, and Item domain rules.
- `packages/db`: SQL persistence layer with SQLite local by default and Postgres via `DATABASE_URL`.
- `packages/md`: Markdown frontmatter parsing and serialization.
- `packages/sync`: sync hashes and manifest handling.
- `packages/audit`: risk classification for local/AI changes.
- `packages/calendar`: calendar models and utilities.
- `packages/ui`: shared UI package.

## Commands

Documented commands discovered from repository `package.json` files:

- install: `pnpm install`
- dev: `pnpm dev` or `pnpm --filter @doit/web dev`
- lint: `pnpm lint`
- typecheck: `pnpm type-check`
- test: no root test script discovered
- build: `pnpm build`
- build web: `pnpm --filter @doit/web build`
- typecheck web: `pnpm --filter @doit/web type-check`
- build sync agent: `pnpm --filter doit-sync build`
- typecheck sync agent: `pnpm --filter doit-sync type-check`

## Frontend validation evidence

When a task changes user-facing frontend behavior, layout, navigation, styling, forms, interactive states, or any visible screen:

- run the local web app temporarily after implementation
- check for an existing server or occupied port before starting a new one
- record server command, port, PID/process, and shutdown result in the living spec
- manually test the affected screen or flow in the browser
- save screenshots under `specs/artifacts/<spec-slug>/`
- use ordered descriptive screenshot names, such as `01-today-list.png` or `02-editor-empty-state.png`
- reference screenshot paths in the living spec validation section
- stop every server, watcher, and child process started by the agent before final response

## Important conventions

- TypeScript strict mode is enabled, including `noUncheckedIndexedAccess`.
- `exactOptionalPropertyTypes` is disabled.
- Use `@/` aliases inside `apps/web/src/`.
- Use monorepo packages such as `@doit/types`, `@doit/core`, `@doit/db`, `@doit/sync`, and `@doit/ui`.
- Do not import `@doit/db` in client components; keep database access in Route Handlers and server-side code.
- API routes must validate identity with `auth()`, `requireUserId()`, or `authWithCli()` before protected operations.
- API routes must call `await ensureDB()` before querying `@doit/db`.
- Client data hooks use SWR rather than ad hoc `useEffect` plus `fetch`.
- Global UI state uses `UIContext`; do not introduce Redux or Zustand.
- Toasts use `useToast()` from `components/ui/toast.tsx`.
- Local UI servers may be started only when needed for usability/visual validation and must be stopped before final response.

## Sensitive areas

Modules and flows requiring extra care:

- Authentication and authorization with NextAuth Credentials and CLI bearer tokens.
- Google OAuth, Calendar sync, Drive uploads, and private Drive links.
- Item sync, Markdown frontmatter, local manifests, and audit approval flows.
- Protected Item fields: `id`, `userId`, `createdAt`.
- Medium/high-risk sync changes, including frontmatter changes, moves, renames, deletes, `projectId`, `areaId`, and archived status.
- Database schemas in `packages/db/src/schemas/`.
- Production deploy, server setup, branch workflow, and environment strategy.
- Secrets and private data in `.env`, `.env.local`, local SQLite files, calendar data, Drive metadata, and sync workspaces.
