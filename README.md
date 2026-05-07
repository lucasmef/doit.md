# doit.md

PWA pessoal de produtividade para unificar notas, tarefas, projetos e calendario em uma entidade central: o **Item**.

O projeto roda como um monorepo pnpm com uma aplicacao Next.js, um agente de sincronizacao em CLI e pacotes compartilhados para tipos, regras de dominio, banco, Markdown, calendario, auditoria e sync.

## Stack

- `apps/web`: Next.js 15 App Router, React 19, Tailwind CSS, SWR e NextAuth.
- `apps/sync-agent`: CLI Node.js ESM publicada localmente como `doit-sync`.
- `packages/types`: tipos TypeScript compartilhados.
- `packages/core`: regras puras de dominio para itens.
- `packages/db`: camada de persistencia com SQLite local por padrao e Postgres via `DATABASE_URL`.
- `packages/md`: parsing e serializacao Markdown com frontmatter.
- `packages/sync`: hashes e manifest de sincronizacao.
- `packages/audit`: classificacao de risco de mudancas.
- `packages/calendar`: integracao e modelos de calendario.
- `packages/ui`: componentes compartilhados.

## Requisitos

- Node.js compativel com Next.js 15.
- pnpm 9.
- SQLite para desenvolvimento local, usado automaticamente quando `DATABASE_URL` esta vazio.
- Postgres opcional para ambientes persistentes.
- Credenciais Google OAuth opcionais para integracao com calendario.

## Setup Local

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
```

Para Postgres:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/doitmd
```

## Desenvolvimento

Rodar o app web:

```bash
pnpm dev
```

Ou diretamente pelo workspace:

```bash
pnpm --filter @doit/web dev
```

Build do app web:

```bash
pnpm build
```

Type check de todos os pacotes:

```bash
pnpm type-check
```

Lint de todos os pacotes:

```bash
pnpm lint
```

## Sync Agent

O sync agent espelha itens do doit.md para um workspace Markdown local, permitindo edicoes assistidas por IA com auditoria antes do push.

Build do CLI:

```bash
pnpm --filter @doit/sync-agent build
```

Inicializar o workspace Markdown:

```bash
doit-sync init
```

Fluxo principal:

```bash
doit-sync pull
doit-sync diff
doit-sync push
```

O CLI le as seguintes variaveis de ambiente:

```env
DOITMD_API_URL=http://localhost:3000
DOITMD_API_KEY=<api-key>
DOITMD_USER_ID=<user-id>
```

## Modelo de Dados

O item e a unidade principal do sistema. Ele pode representar captura, tarefa, nota, projeto ou documento, com status, datas, tags, relacoes com projeto/area, historico e metadados de sync.

Status suportados:

- `inbox`
- `todo`
- `doing`
- `waiting`
- `done`
- `archived`

Complexidades suportadas:

- `capture`
- `task`
- `note`
- `project`
- `document`

## Auditoria e IA

Alteracoes feitas em arquivos Markdown passam por classificacao de risco antes de serem aplicadas no app:

- Baixo risco: criacao e edicao de conteudo comum.
- Medio risco: frontmatter, renomear ou mover itens.
- Alto risco: exclusao, que exige confirmacao explicita.

Campos protegidos nao devem ser alterados manualmente:

- `id`
- `userId`
- `syncHash`
- `createdAt`

Nunca publique arquivos `.env`, tokens, dados pessoais sincronizados, detalhes privados de calendario ou manifests locais com informacoes sensiveis.

## Estrutura do Repositorio

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
```

## Referencias Internas

- [AGENTS.md](./AGENTS.md): contrato para agentes de IA neste repositorio.
- [doit-workflow skill](./.agents/skills/doit-workflow/SKILL.md): workflow recomendado para Codex e outros agentes.
