# doit.md

PWA pessoal de produtividade para unificar notas, tarefas, projetos, calendario e arquivos em uma entidade central: o **Item**.

O projeto roda como um monorepo pnpm com uma aplicacao Next.js, um agente de sincronizacao em CLI e pacotes compartilhados para tipos, regras de dominio, banco, Markdown, calendario, auditoria e sync. O fluxo foi pensado para uso humano e tambem para agentes de IA editarem um workspace Markdown com revisao antes de aplicar mudancas no app.

## Principais recursos

- Captura rapida, Inbox, Hoje, Proximos, Calendario, Pastas, Tags e Arquivo.
- Editor Markdown com autosave, checklist, historico de versoes e restore.
- Google Calendar via OAuth, com sincronizacao de eventos para as views de hoje/calendario.
- Upload de anexos para Google Drive pelo editor, inserindo links Markdown privados na nota.
- CLI `doit-sync` para espelhar itens como arquivos `.md` em pastas locais.
- Auditoria de mudancas feitas por IA ou edicao local antes do push.
- Tokens CLI revogaveis, armazenados como hash no servidor.
- Push notifications e fallback de email para lembretes, quando configurados.
- SQLite local por padrao e Postgres via `DATABASE_URL` para ambientes persistentes.

## Stack

- `apps/web`: Next.js 15 App Router, React 19, Tailwind CSS, SWR e NextAuth Credentials.
- `apps/sync-agent`: CLI Node.js ESM publicada como `doit-sync`.
- `packages/types`: tipos TypeScript compartilhados.
- `packages/core`: ids, slugify e regras puras de dominio.
- `packages/db`: persistencia SQL com SQLite local ou Postgres.
- `packages/md`: parsing e serializacao Markdown com frontmatter.
- `packages/sync`: hashes e manifest de sincronizacao.
- `packages/audit`: classificacao de risco de mudancas.
- `packages/calendar`: modelos e utilitarios de calendario.
- `packages/ui`: componentes compartilhados.

## Requisitos

- Node.js 20+.
- pnpm 9+.
- SQLite para desenvolvimento local, usado automaticamente quando `DATABASE_URL` esta vazio.
- Postgres opcional para producao ou ambientes persistentes.
- Credenciais Google OAuth opcionais para Calendar e Drive.
- Chaves VAPID opcionais para notificacoes push.

## Setup local

Instale as dependencias:

```bash
pnpm install
```

Crie o arquivo de ambiente do app web:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Para desenvolvimento local simples, deixe `DATABASE_URL` vazio. O banco sera criado em `.data/doit-dev.sqlite` dentro do diretorio de execucao.

Variaveis principais:

```env
DATABASE_URL=
NEXTAUTH_SECRET=<replace-with-random-secret>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:you@example.com
```

Para Postgres:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/doitmd
```

## Desenvolvimento e validacao

Agentes nao devem rodar o site localmente com `pnpm dev`, `pnpm --filter @doit/web dev`, `next dev`, `next start` ou comandos equivalentes que deixem um servidor persistente em execucao.

Para validar mudancas, use comandos que encerram sozinhos:

```bash
pnpm build
pnpm type-check
pnpm lint
```

Build isolado do app web:

```bash
pnpm --filter @doit/web build
```

Build isolado do CLI:

```bash
pnpm --filter doit-sync build
```

## App web

O app web vive em `apps/web` e usa Route Handlers como API principal. Toda operacao protegida deve validar usuario com `auth()`/`requireUserId()` ou `authWithCli()` e chamar `ensureDB()` antes de consultar `@doit/db`.

Views principais:

- `/inbox`: capturas e itens sem pasta.
- `/today`: tarefas de hoje, atrasadas e eventos sincronizados.
- `/upcoming`: proximas tarefas agrupadas.
- `/calendar`: calendario mensal e agenda do dia.
- `/notas`: notas e pastas.
- `/tags`: navegacao por tags.
- `/audit`: aprovacao/rejeicao de mudancas vindas do sync.
- `/settings`: perfil, integracoes Google, preferencias, notificacoes e tokens CLI.

## Google Calendar e Drive

A integracao Google usa OAuth com os escopos necessarios para calendario e Drive:

- Calendar: sincroniza eventos do calendario primario para o app.
- Drive: permite upload de anexos privados para uma pasta `doit.md` no Google Drive.

Fluxo de anexos:

1. O usuario conecta a conta Google em Settings.
2. No editor Markdown, um arquivo pode ser enviado para `POST /api/drive/upload`.
3. O backend cria o arquivo no Drive, grava um registro em `drive_links` e retorna `webViewLink`.
4. O editor insere um link Markdown para o arquivo.
5. O link continua privado: quem abre precisa ter acesso pela propria conta Google.

O `doit-sync pull` tambem tenta indexar o Drive quando a conta esta conectada. O indice fica em `_system/drive-index.json`, e arquivos soltos na pasta `drive/_inbox/` aparecem em `_system/inbox.json` para processamento por IA.

## CLI `doit-sync`

O sync agent espelha itens do doit.md para um workspace Markdown local, permitindo edicoes manuais ou assistidas por IA com auditoria antes do push.

Instalacao, quando publicado:

```bash
npm install -g doit-sync
```

Uso local no monorepo:

```bash
pnpm --filter doit-sync build
```

Fluxo inicial:

```bash
doit-sync init ~/Notes/doit
doit-sync login --api-url http://localhost:3000
doit-sync pull
```

Para autenticar, gere um token no app em **Settings -> CLI**. O token tem formato `doit_<prefix>_<secret>`, aparece uma unica vez e pode ser revogado.

Comandos principais:

| Comando | Descricao |
|---|---|
| `doit-sync init [path]` | Cria o workspace local com `AGENTS.md`, `README.md` e pastas de sistema. |
| `doit-sync login` | Salva API URL, token CLI e userId na config local. |
| `doit-sync pull` | Baixa pastas e itens como arquivos Markdown e atualiza manifest/Drive index. |
| `doit-sync diff` | Detecta mudancas locais e envia pendencias para Auditoria no app. |
| `doit-sync push` | Aplica no servidor as mudancas aprovadas no app. |
| `doit-sync status` | Mostra estado do workspace, pendencias e resumo do Drive. |

Estrutura gerada pelo `pull`:

```text
workspace-doitmd/
  AGENTS.md
  README.md
  Inbox/
  Proximos/
  Arquivo/
  <pastas reais do app>/
  _system/
    manifest.json
    drive-index.json
    inbox.json
  _changes/
    pending.json
```

Cada item vira um `.md` com frontmatter:

```md
---
id: itm_xxx
title: Reuniao kickoff
complexity: task
status: todo
priority: 2
dueDate: 2026-05-15
tags: [trabalho, urgente]
syncHash: abc123def
updatedAt: 2026-05-10T14:00:00Z
---

Conteudo livre em Markdown.
```

Campos como `id`, `userId`, `createdAt` e `syncHash` nao devem ser editados manualmente.

## Auditoria e IA

Mudancas feitas no workspace Markdown passam por classificacao de risco antes de serem aplicadas:

| Tipo | Exemplo | Risco |
|---|---|---|
| `created` | Novo arquivo `.md` | low |
| `content_changed` | Edicao do corpo Markdown | low |
| `frontmatter_changed` | Tags, status, dueDate, title | medium |
| `moved` / `renamed` | Arquivo movido ou renomeado | medium |
| `deleted` | Arquivo removido | high |

O fluxo recomendado:

```bash
doit-sync pull
# editar arquivos manualmente ou com IA
doit-sync diff
# aprovar/rejeitar em /audit
doit-sync push
```

Deletes e outras mudancas de alto risco exigem aprovacao explicita. O servidor salva snapshots em `item_versions` antes de aplicar mudancas, permitindo restore.

## Modelo de dados

O Item e a unidade principal do sistema. Ele pode representar nota ou tarefa, com status, datas, tags, pasta, area, historico e metadados de sync.

Status suportados:

- `inbox`
- `todo`
- `doing`
- `waiting`
- `done`
- `archived`

Complexidades usadas pelo app:

- `note`
- `task`

## Seguranca operacional

- Nunca publique `.env`, tokens, dados pessoais sincronizados, detalhes privados de calendario ou manifests locais.
- Tokens CLI sao exibidos uma vez, salvos como hash no banco e podem ser revogados em Settings.
- Endpoints CLI usam Bearer token apenas nas rotas que precisam suportar sync.
- Mudancas de alto risco vindas de IA ficam bloqueadas ate aprovacao em Auditoria.
- O plano de hardening de auth/API esta em `docs/plans/security-hardening.md`.

## Estrutura do repositorio

```text
apps/
  web/          App Next.js
  sync-agent/   CLI doit-sync
packages/
  audit/        Classificacao de risco
  calendar/     Calendario e integracoes
  core/         Regras de dominio
  db/           Persistencia SQLite/Postgres
  md/           Markdown/frontmatter
  sync/         Hashes e manifest
  types/        Tipos compartilhados
  ui/           Componentes compartilhados
docs/
  plans/        PRDs e planos tecnicos
```

## Referencias internas

- [AGENTS.md](./AGENTS.md): contrato para agentes de IA neste repositorio.
- [docs/PRD.md](./docs/PRD.md): PRD geral do produto.
- [docs/STATUS.md](./docs/STATUS.md): status historico do projeto.
- [apps/sync-agent/README.md](./apps/sync-agent/README.md): documentacao detalhada do CLI.
- [docs/plans/drive-attachments.md](./docs/plans/drive-attachments.md): PRD de anexos via Drive.
- [docs/plans/security-hardening.md](./docs/plans/security-hardening.md): PRD de hardening de seguranca.
