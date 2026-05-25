# Regras de Negócio — doit.md

**Levantamento completo** · Gerado a partir do código-fonte (não da documentação)
**Data:** 2026-05-17
**Escopo:** `apps/web`, `apps/sync-agent`, `packages/*`

> Este documento descreve o comportamento **real** implementado no código. Onde o
> código diverge do `docs/PRD.md` ou do `README.md`, o código prevalece e a
> divergência é anotada.

---

## 1. Visão do produto

doit.md é uma PWA pessoal de produtividade que unifica **notas, tarefas, projetos,
calendário e arquivos** em uma única entidade: o **Item**. Um item evolui
organicamente (captura → tarefa → nota → documento) sem migração de dados.

O sistema é projetado para ser editado por **humanos** (UI web) e por **agentes de
IA** (workspace Markdown via CLI `doit-sync`), sempre com auditoria/aprovação antes
de aplicar mudanças sensíveis.

**Premissa central:** cada usuário tem seu próprio espaço isolado. **Não há
colaboração, times nem compartilhamento.** Toda query é escopada por `userId`.

---

## 2. Entidades e modelo de dados

| Entidade | Prefixo do ID | Descrição |
|---|---|---|
| `Item` | `itm_` | Unidade central: nota, tarefa, captura, documento |
| `Folder` | `fld_` | Pasta hierárquica (substituiu a entidade `Project`) |
| `Area` | `are_` | Responsabilidade contínua de vida |
| `CalendarEvent` | `evt_` | Evento de calendário (local ou Google) |
| `AuditLog` | `aud_` | Histórico imutável de ações |
| `PendingChange` | `chg_` | Mudança vinda do sync aguardando aplicação |
| `ItemVersion` | `ver_` | Snapshot de item para restore |
| `User` | `usr_` | Conta de usuário |
| `CliToken` | `cli_` | Token de autenticação do CLI |
| `DriveLink` | `dlk_` | Vínculo item ↔ arquivo no Google Drive |
| `GoogleAccount` | `gac_` | Conta Google conectada (OAuth) |
| `PushSubscription` | — | Inscrição de notificação push por dispositivo |
| `NotificationAlert` | `nalt_` | Registro de entrega de notificação |

### 2.1 Geração de IDs

- IDs são gerados com `generateId(prefix)`: `<prefix>_<base62 de 6 bytes aleatórios>`
  (`packages/core/src/ids.ts`).
- IDs são **imutáveis** após a criação.
- Exceção: `GoogleAccount` usa `gac_ + Math.random().toString(36)` em
  `api/google/callback`, e `NotificationAlert` usa `nalt_ + randomUUID()`.

> **Nota de arquitetura:** os arquivos `packages/db/src/schemas/*.schema.ts` definem
> schemas Mongoose, mas a persistência real é SQL (SQLite local / Postgres) via
> `SqlModel` de `@doit/db`. A API de modelos imita a do Mongoose
> (`find`, `findOne`, `findOneAndUpdate`, `$set`, `$unset`, `lean`...).

---

## 3. O Item — regras centrais

### 3.1 Complexidade (`complexity`)

Valores: `capture` | `task` | `note` | `project` | `document`.

| Valor | Uso |
|---|---|
| `capture` | Captura rápida sem estrutura |
| `task` | Ação com checkbox; aceita data, hora, prioridade, recorrência |
| `note` | Nota Markdown; **não** aceita prioridade, hora nem recorrência |
| `document` | Reservado para o item especial `AGENTS.md` |
| `project` | Legado; pouco usado (a entidade `Project` virou `Folder`) |

### 3.2 Status (`status`)

Valores: `inbox` | `todo` | `doing` | `waiting` | `done` | `archived`.

- `archived` é o estado de **soft-delete** (ver §3.9).
- Itens contam como "abertos" quando `status` ≠ `done` e ≠ `archived`.
- Itens contam como "fechados" (filtro `status=closed`) quando `status` é
  `done` **ou** `archived`.

> **Divergência com o PRD:** o PRD lista `in_progress`; o código usa `doing` e
> adiciona `waiting`.

### 3.3 Criação de item (`POST /api/items`)

Regras aplicadas em `apps/web/src/app/api/items/route.ts`:

1. `complexity` padrão é `task` quando ausente.
2. **Título obrigatório**, exceto para `note` — uma nota pode nascer sem título
   pois o título é derivado do conteúdo (§3.6).
3. **Prioridade não é permitida em notas** → erro 400 `priority is not allowed
   for notes`.
4. **Status inicial automático:** se o item não tem `folderId`, nem `dueDate`,
   nem `scheduledDate` (contexto "inbox"), o status padrão é `inbox`; caso
   contrário é `todo`. Um `status` explícito no body sobrepõe isso.
5. Em notas, os campos `priority`, `dueTime` e `recurrence` são forçados a
   `undefined` na criação.
6. `tags` padrão `[]`, `backlinks` sempre `[]` na criação.
7. `createdAt` e `updatedAt` recebem o timestamp ISO atual.

### 3.4 Listagem de itens (`GET /api/items`)

- Autenticação aceita sessão web **ou** Bearer token do CLI (`authWithCli`).
- Filtros via query string:
  - `status=archived` → só arquivados.
  - `status=closed` → `done` + `archived` (filtrado em memória; o adaptador SQL
    local não suporta `$in`).
  - `status=<outro>` → filtra por aquele status e exclui itens com `deletedAt`.
  - `folderId=null` ou `folderId=` → itens sem pasta; `folderId=<id>` → da pasta.
  - `q=<texto>` → busca em `title` + `contentMd` + `tags` (case-insensitive pt-BR).
  - `sync=active` → exclui `done`, `archived` e itens com `deletedAt`.
- **O item especial `AGENTS.md` é ocultado** de respostas para clientes web; só
  aparece quando a origem é `cli` (§11).
- **Ordenação:** primeiro por `order` numérico crescente (itens sem `order` vão
  para o fim); empate desfeito por `updatedAt` decrescente (mais recente primeiro).

### 3.5 Edição de item (`PATCH /api/items/[id]`)

- Só o dono (`userId`) pode editar; item inexistente → 404.
- Campos editáveis: `title`, `contentMd`, `complexity`, `status`, `priority`,
  `dueDate`, `dueTime`, `recurrence`, `startDate`, `scheduledDate`, `folderId`,
  `areaId`, `parentId`, `tags`, `backlinks`, `order`.
- **Reativação automática:** ao definir qualquer `status` diferente de
  `archived`, o campo `deletedAt` é zerado (`null`) — o item "ressuscita".
- Toda atualização grava `updatedAt`.
- Se o `folderId` mudou, dispara a reconciliação dos anexos no Drive (§10.4).

### 3.6 Título derivado de nota (autotítulo)

Para itens `complexity = 'note'`, o título **não é editado diretamente** — é
derivado do conteúdo (`apps/web/src/app/api/items`):

- O título é a **primeira linha não vazia** do `contentMd`, removendo marcação
  Markdown de cabeçalho (`#`), e os caracteres `* _ \` [ ]`.
- Em notas, `priority`, `recurrence` e `dueTime` são sempre removidos (`$unset`).

### 3.7 Conversão entre tarefa e nota

Quando o `PATCH` muda a `complexity`:

- **task → note:** se `contentMd` não foi enviado, o título atual da tarefa é
  fundido no topo do conteúdo (`título\n\ncorpo`), e passa a valer o autotítulo.
- **note → task:** se nem `title` nem `contentMd` foram enviados, a primeira
  linha do conteúdo da nota vira o `title` da tarefa e o resto vira o `contentMd`.

A mesma lógica vale na rota de operações em massa (`PATCH /api/items/bulk`).

### 3.8 Prioridade

- Tipo: `1 | 2 | 3 | 4` (1 = mais alta).
- Para ordenação (`lib/item-order.ts`), apenas `1–3` contam como "priorizado";
  `4` (e ausência) é tratado como "sem prioridade".
- Na rota bulk, definir `priority = 4` ou `null` **remove** a prioridade.
- Notas nunca têm prioridade.

### 3.9 Soft-delete

- `DELETE /api/items/[id]` **não apaga** o registro: define `status =
  'archived'` e grava `deletedAt`.
- Mudar o status para qualquer valor ≠ `archived` reativa o item (`deletedAt =
  null`).
- Filtros padrão de listagem excluem itens com `deletedAt`.
- Itens só são removidos fisicamente do banco em poucos casos (ex.: subtree de
  pasta deletada via sync — ver §9.6, que apenas desvincula, não apaga itens).

### 3.10 Ordenação manual (`PATCH /api/items/reorder`)

- Recebe `updates: [{ id, order }]`.
- Rejeita lista vazia (400), IDs duplicados (400) e qualquer ID inexistente do
  usuário (404 — operação **atômica em validação**: ou todos existem, ou nenhum
  é alterado).
- `order` ausente/nulo significa "não ordenado manualmente": cai no fallback de
  `updatedAt`.

### 3.11 Operações em massa (`PATCH /api/items/bulk`)

- Recebe `ids[]` + (`patch` e/ou `tagAction`). Exige pelo menos um dos dois.
- `tagAction` tem três modos:
  - `set` → substitui todas as tags pelo conjunto informado.
  - `add` → une as tags novas às existentes.
  - `remove` → retira as tags informadas.
- **Normalização de tag:** trim, lowercase pt-BR, remove `@` do início.
- Cada item é processado individualmente; itens não encontrados são pulados sem
  erro.
- Limpeza de campos vazios: `dueDate`/`dueTime`/`recurrence`/`folderId`/`priority`
  com valor `''` ou `null` são removidos (`$unset`).
- Mudança de pasta dispara reconciliação de anexos no Drive (best-effort).

### 3.12 Versionamento de notas

- Antes de qualquer mudança em campos versionados de uma **nota** (`title`,
  `contentMd`, `tags`, `status`, `folderId`, `areaId`), o sistema cria um
  `ItemVersion` com snapshot do estado anterior — **mas só se o conteúdo mudou**
  (compara `syncHash` com a última versão).
- `GET /api/items/[id]/versions` retorna as **20 versões mais recentes**.
- `POST /api/items/[id]/versions` restaura uma versão: primeiro salva o estado
  atual como nova versão, depois aplica o snapshot escolhido.
- O snapshot cobre: `title`, `contentMd`, `complexity`, `status`, `tags`,
  `dueDate`, `folderId`, `areaId`.
- O sync (`/api/sync/push`) versiona **qualquer** item antes de alterá-lo
  (não só notas).

### 3.13 Campos protegidos e editáveis por IA

De `packages/core/src/item-rules.ts`:

```
PROTECTED_FIELDS      = ['id', 'userId', 'syncHash', 'createdAt']
EDITABLE_BY_AI_FIELDS = ['title', 'contentMd', 'complexity', 'status',
                         'folderId', 'areaId', 'tags', 'dueDate', 'dueTime',
                         'recurrence', 'localPath']
```

> **Divergência com o `AGENTS.md`:** o `AGENTS.md` lista `PROTECTED_FIELDS` sem
> `syncHash` e cita `body`/`projectId`; o código real usa `contentMd`/`folderId`
> e protege `syncHash`.

---

## 4. Recorrência

Implementada em `packages/core/src/recurrence.ts`. Aplica-se apenas a
tarefas (notas não têm recorrência).

### 4.1 Tipos de recorrência

- **Embutidas:** `daily`, `weekdays` (dias úteis), `weekly`, `monthly`, `yearly`.
- **Personalizada:** string `custom:<unidade>:<intervalo>:<weekdays>:<monthMode>:<anchorDate>`
  - `unidade` ∈ `day | week | month | year`
  - `intervalo` é limitado ao intervalo `[1, 999]`
  - `weekdays` é lista 0–6 (domingo–sábado), única e ordenada
  - `monthMode` ∈ `dayOfMonth | weekdayOfMonth`

### 4.2 Cálculo da próxima data (`nextRecurringDate`)

- A próxima data é sempre **estritamente futura** (posterior a hoje).
- `weekdays`: pula sábados e domingos.
- `monthly`/`yearly`: o dia preferido é **clampado** ao último dia do mês quando
  o mês de destino é mais curto (ex.: dia 31 → 30/28).
- `weekdayOfMonth`: mantém a posição ordinal (ex.: "3ª terça-feira do mês").

---

## 5. Pastas (Folders)

A entidade `Folder` substituiu `Project`. `packages/types/src/project.ts` é um
shim de compatibilidade que reexpõe `Folder` como `Project` para o código de UI
legado.

### 5.1 Estrutura

- Campos: `id`, `userId`, `name`, `parentId?`, `order`, `viewMode?`,
  `viewModeManual?`, timestamps.
- Pastas são **hierárquicas** (`parentId`) — árvore de profundidade arbitrária.
- `viewMode` ∈ `list | kanban` controla a apresentação dos itens da pasta.

### 5.2 Criação (`POST /api/folders`)

- `name` é obrigatório (400 se vazio).
- `order` padrão = contagem atual de pastas do usuário (vai para o fim).
- `viewMode` padrão = o da pasta pai, ou `list` se não houver pai.
- `viewModeManual` padrão = `false`.

### 5.3 Edição (`PATCH /api/folders/[id]`)

- **Uma pasta não pode ser seu próprio pai** → 400.
- `viewMode` inválido (≠ `list`/`kanban`) → 400.
- **Propagação de `viewMode`:** ao trocar o `viewMode` de uma pasta, a mudança
  é propagada recursivamente para **todos os descendentes**, exceto os que têm
  `viewModeManual = true` (o usuário já escolheu o modo daquela subárvore).
- Definir `viewMode` explicitamente marca a pasta com `viewModeManual = true`.
- Renomear ou mover a pasta dispara a reconciliação da pasta-espelho no Drive
  (§10.3).

### 5.4 Exclusão (`DELETE /api/folders/[id]`)

- Apaga a pasta **e toda a subárvore de descendentes**.
- Os itens dentro das pastas removidas **não são apagados**: têm `folderId`
  zerado (`null`) — voltam a ser itens "soltos" (Inbox).
- Retorna `removed` = número de pastas excluídas.

---

## 6. Áreas (Areas)

- Representam responsabilidades contínuas de vida (ex.: "Saúde", "Finanças").
- Campos: `id`, `userId`, `name`, `description?`, `color?`, `order`, timestamps.
- Criação exige `name` (400 se vazio); `order` padrão = contagem atual.
- Itens e pastas podem referenciar uma área via `areaId`.

---

## 7. Views (regras de apresentação)

As rotas de UI definem como os itens são agrupados/filtrados:

### 7.1 Inbox (`/inbox`)
Itens "soltos": `status = inbox`, sem `folderId` e sem `dueDate`
(`isInbox` em `item-rules.ts`). Em `item-order.ts`, `isLooseInboxItem`
considera ainda a ausência de `scheduledDate`.

### 7.2 Hoje (`/today`)
- Inclui itens com `dueDate` **ou** `scheduledDate` igual a hoje (`isToday`), ou
  **atrasados** (`isOverdue`: `dueDate` < hoje e status ≠ `done`/`archived`).
- Exclui arquivados.
- Itens "soltos" da Inbox aparecem **abaixo** dos itens datados, a menos que a
  preferência `showInbox` esteja ativa.
- Mostra os **eventos do Google Calendar** do dia.
- Botão **"Reagendar atrasadas"**: move todas as tarefas atrasadas para hoje
  (`dueDate = hoje`).
- Ordenação (`sortForcedItemOrder`): priorizados (1–3) primeiro, depois por
  prioridade, depois por data+hora, depois mais recente primeiro.

### 7.3 Próximos (`/upcoming`)
- Itens futuros: `dueDate` ou `scheduledDate` > hoje, e status ≠ `done`/`archived`.
- Agrupados em: **Amanhã**, **Esta semana**, **Próxima semana**, **Mais tarde**.
- Tem alternância Lista ↔ Calendário (swipe para a esquerda no mobile).

### 7.4 Calendário (`/calendar`)
Grade mensal com indicadores de itens e agenda do dia selecionado.

### 7.5 Outras
- `/notas` — notas e pastas; `/tags` — navegação por tags; `/archive` — itens
  arquivados; `/audit` — aprovação de mudanças do sync; `/settings` — perfil,
  integrações, notificações, tokens CLI.

---

## 8. Autenticação e usuários

### 8.1 Registro (`POST /api/auth/register`)
- `email` obrigatório (normalizado: trim + lowercase).
- **Senha mínima de 8 caracteres** → 400 se menor.
- E-mail duplicado → 409.
- Senha armazenada como hash **bcrypt com cost 12**. Nunca em texto puro.
- `name` padrão = o próprio e-mail.

### 8.2 Login (NextAuth Credentials — `apps/web/src/auth.ts`)
- Provider de e-mail/senha; valida com `bcrypt.compare`.
- Sessão **JWT**, validade de **15 dias**, renovada a cada 24h de uso.
- O `userId` é propagado para `token.sub` e para `session.user.id`.

### 8.3 Proteção de rotas (`middleware.ts`)
- Todas as rotas são protegidas, **exceto**: `api/*`, `/sign-in`, `/sign-up`,
  `_next` e arquivos estáticos.
- Sem token → redireciona para `/sign-in?callbackUrl=<rota original>`.
- **As rotas `/api/*` não passam pelo middleware** — cada rota faz a própria
  validação via `auth()` / `authWithCli()`.

### 8.4 Contrato de toda rota protegida
1. Validar `userId` com `auth()` (web) ou `authWithCli()` (web + CLI).
2. Sem usuário → `{ error: 'Unauthorized' }` 401.
3. Chamar `await ensureDB()` antes de qualquer query.
4. Toda query é escopada por `userId` (isolamento entre usuários).
5. Erro não tratado → `{ error: 'Internal error' }` 500.

---

## 9. CLI `doit-sync`, auditoria e aprovação

### 9.1 Tokens CLI (`lib/cli-auth.ts`)
- Formato do token: `doit_<prefix>_<secret>` — `prefix` de 8 chars, `secret` de
  24 bytes base64url.
- **Só o `secret` é hasheado** (SHA-256) e guardado; o token completo é exibido
  **uma única vez** ao gerar.
- Validação: busca a linha pelo `prefix`, compara o hash do `secret` com
  `timingSafeEqual` (resistente a timing attack).
- Token revogado (`revokedAt` preenchido) é rejeitado.
- A revogação **não apaga** a linha — só marca `revokedAt`.
- Cada uso atualiza `lastUsedAt` (best-effort, não bloqueia a requisição).

### 9.2 Autenticação dupla (`authWithCli`)
- Tenta sessão web primeiro (`source: 'web'`).
- Se não houver, aceita header `Authorization: Bearer doit_..._...`
  (`source: 'cli'`).
- Só algumas rotas aceitam CLI: `GET /api/items`, `GET /api/folders`,
  `POST /api/sync/push`, `POST /api/sync/pending-batch`, `GET /api/sync/pending`,
  `POST /api/drive/reconcile`.

### 9.3 Fluxo de sincronização
```
doit-sync pull   → baixa pastas/itens como .md com frontmatter
doit-sync diff   → detecta mudanças locais → POST /api/sync/pending-batch
(aprovar/rejeitar em /audit)
doit-sync push   → POST /api/sync/push aplica os aprovados
```

### 9.4 Classificação de risco (`packages/audit/src/risk.ts`)

| Tipo de mudança | Risco |
|---|---|
| `created`, `updated`, `content_changed`, `folder_created` | `low` |
| `frontmatter_changed`, `renamed`, `moved`, `folder_moved`, `folder_renamed` | `medium` |
| `deleted`, `folder_deleted`, `conflict` | `high` |

### 9.5 Regra de bloqueio do push (`POST /api/sync/push`)
- Só são aplicadas mudanças com `approved = true` **e** `userId` do autenticado.
- Se houver **qualquer** mudança não aprovada com `riskLevel = high`, o push
  inteiro é **rejeitado** com HTTP 422 — mudanças de alto risco exigem aprovação
  explícita na UI.
- Mudanças `low`/`medium` aprovadas são aplicadas; `low` poderia teoricamente
  passar sem aprovação, mas o lote só processa o que tem `approved = true`.

### 9.6 O que o push faz ao aplicar mudanças
- **Snapshot:** antes de alterar um item existente, cria um `ItemVersion` com o
  estado completo anterior.
- **`created`:** cria (ou atualiza, se o ID já existir) um item; resolve a pasta
  a partir do caminho do arquivo, criando pastas faltantes (`mkdir -p`).
- **`moved`:** atualiza `folderId`/`localPath`; se o destino é a pasta especial
  Arquivo, arquiva o item.
- **`deleted`:** arquiva o item (`status = archived`, `deletedAt`) — **não apaga**.
- **`folder_deleted`:** apaga a subárvore de pastas e **desvincula** os itens
  (`folderId = null`) — itens nunca são apagados fisicamente pelo sync.
- **Frontmatter:** só os campos da allowlist são aceitos do frontmatter:
  `title`, `complexity`, `status`, `tags`, `dueDate`, `priority`.
- Toda mudança gera entradas em `AuditLog` (`source: 'sync-agent'`), mais um log
  resumo de `push`.
- Após aplicar, dispara reconciliação do espelho do Drive (best-effort).

### 9.7 Batch de pendências (`POST /api/sync/pending-batch`)
- Substitui **todas** as pendências do usuário pelas novas (delete + insert).
- **Preserva o estado `approved`** de pendências equivalentes: casa por `id` ou
  por uma chave de conteúdo normalizada (ignora `id`, `userId`, `approved`,
  `createdAt`, `riskLevel`). Assim, re-rodar `diff` não descarta aprovações já
  feitas.

### 9.8 Aprovar / rejeitar (rotas web)
- `POST /api/sync/approve` — aceita `id` ou `ids[]`; marca `approved = true`.
- `POST /api/sync/reject` — aceita `id` ou `ids[]`; **apaga** a(s) pendência(s).

### 9.9 Auditoria
- `AuditLog` é um histórico **imutável** (só inserção). Ações: `pull`, `diff`,
  `push`, `file_created/updated/moved/deleted/restored`,
  `folder_created/updated/moved/deleted`, `frontmatter_changed`,
  `conflict_detected`, `version_created`.
- Cada log tem `source` ∈ `sync-agent | manual | api`.

---

## 10. Google Calendar e Google Drive

### 10.1 OAuth (`lib/google.ts`)
- Um único fluxo OAuth pede **três escopos**: Calendar (`calendar.events`),
  Drive (`drive.file`) e e-mail do usuário.
- `access_type=offline` + `prompt=consent` → garante refresh token.
- O `state` do OAuth carrega o `userId`.
- Tokens guardados em `GoogleAccount`. O `accessToken` é renovado
  automaticamente quando faltam <60s para expirar; sem refresh token →
  erro `GOOGLE_REAUTH_REQUIRED`.
- `hasDriveScope` / `hasCalendarScope` verificam quais escopos foram concedidos
  (o usuário pode ter conectado antes de o escopo Drive existir).

### 10.2 Sincronização do Calendar (`lib/calendar-sync.ts`)
- Sincroniza o calendário **`primary`**.
- Janela: **30 dias para trás, 90 dias para frente** (padrão), até 2500 eventos.
- Eventos `cancelled` ou sem título são ignorados.
- Eventos de dia inteiro têm a data fim normalizada (Google usa fim exclusivo).
- **Eventos locais que sumiram do Google são removidos** (reconciliação dentro
  da janela sincronizada).
- `POST /api/calendar/sync` — sync manual do usuário logado.
- `POST /api/calendar/sync/cron` — sync de **todos** os usuários; exige header
  com `CRON_SECRET`.

### 10.3 Criar evento a partir de um item (`POST /api/calendar/events`)
- Exige item com `dueDate` e conta Google conectada.
- Cria evento de dia inteiro no calendário `primary` e salva localmente com
  `linkedItemIds = [itemId]`.
- **Filtro de visibilidade:** em `GET /api/calendar/events`, eventos vinculados a
  itens `done` ou `archived` são **ocultados** da listagem.

### 10.4 Anexos no Google Drive
Estrutura espelhada no Drive (`lib/drive.ts`), sob a pasta raiz
`doit.md/` (configurável via `DRIVE_ROOT_FOLDER_NAME`):
- `doit.md/` — raiz; subpastas espelham a árvore de `Folder` do app.
- `doit.md/_inbox/` — arquivos soltos a processar.
- `doit.md/_trash/` — destino de anexos excluídos.

**Upload (`POST /api/drive/upload`):**
- Exige conta Google **com escopo Drive** (412 + `needsReauth` se faltar).
- Limite de **100 MB** por arquivo (413 se exceder).
- O arquivo é criado na pasta-espelho da pasta do item (criada sob demanda,
  `mkdir -p`); registra um `DriveLink`.
- O link Markdown inserido na nota é **privado**: só abre quem tem acesso na
  própria conta Google.
- Erros tratados: API do Drive desativada (503 `DRIVE_API_DISABLED`), escopo
  insuficiente / token expirado (412 `needsReauth`).

**Reconciliação ("anexo segue a nota"):**
- Quando o `folderId` de um item muda, os anexos no Drive são **movidos** para a
  pasta-espelho correspondente (`reconcileItemAttachments`).
- Quando uma pasta é renomeada/movida, a pasta-espelho no Drive acompanha
  (`reconcileFolderMirror`).
- `POST /api/drive/reconcile` faz uma varredura completa ("drift sweep") de
  todos os anexos e pastas-espelho do usuário.
- Toda a reconciliação é **best-effort**: nunca lança exceção, só registra
  warning — falha no Drive jamais bloqueia a edição de item/pasta.

---

## 11. Item especial `AGENTS.md`

- É um item com `title = 'AGENTS.md'`, `tag = 'system:agents'` e
  `complexity = 'document'` (`isUserAgentsItem` em `item-rules.ts`).
- Funciona como o "contrato para IA" daquele escopo (global ou por pasta).
- **É ocultado** das listagens da UI web (`GET /api/items` filtra-o quando a
  origem não é CLI), mas é visível para o CLI/agentes.
- Gerenciado por `GET/PUT /api/agents` — há no máximo um por pasta (e um global).
- Ao ser sincronizado, mantém sempre `complexity = document`, `status = todo` e
  a tag `system:agents`.

---

## 12. Notificações (push + e-mail)

### 12.1 Inscrições push
- Web Push (VAPID). Requer `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_EMAIL` configurados — sem isso, o recurso fica desabilitado.
- Uma `PushSubscription` por dispositivo (`endpoint`). Guarda `failureCount`,
  `enabled`, datas de sucesso/falha.
- Endpoints da Apple usam um agent HTTPS forçado para IPv4.

### 12.2 Lembretes de tarefa (`POST /api/notifications/reminders`)
- Acionado por cron; exige header com `CRON_SECRET` (401 sem isso).
- 503 se nenhum canal (push nem e-mail) estiver configurado.
- Janela: tarefas com `dueDate` + `dueTime` que vencem nos próximos
  `NOTIFICATION_LOOKAHEAD_MINUTES` (padrão 5).
- Só notifica **tarefas abertas** (não nota, não `done`, não `archived`).
- **Deduplicação:** um `NotificationAlert` por (`userId`, `itemId`,
  `due-reminder`, `scheduledFor`) — nunca notifica duas vezes o mesmo vencimento.
- **Fallback:** tenta push primeiro; se nenhum push for entregue, envia e-mail.
  O resultado é registrado no `NotificationAlert` (`push_sent`,
  `push_failed_email_sent`, etc.).

### 12.3 Saúde das inscrições push (`lib/push.ts`)
- Push retorna status HTTP 404/410 → a inscrição é **desabilitada**
  (`enabled = false`).
- Outras falhas → incrementa `failureCount`.
- Sucesso → zera `failureCount` e grava `lastSuccessAt`.

---

## 13. Segurança operacional

- Isolamento por usuário: **toda** query do banco filtra por `userId`.
- Senhas: bcrypt cost 12; nunca em texto puro nem logadas.
- Tokens CLI: só o hash do segredo é persistido; comparação com
  `timingSafeEqual`; revogáveis.
- Mudanças de alto risco vindas de IA ficam **bloqueadas** até aprovação
  explícita na UI (`/audit`).
- Antes de aplicar mudanças do sync, o servidor salva snapshots em
  `ItemVersion` — toda mudança é reversível.
- Rotas de cron exigem `CRON_SECRET`.
- Links de anexos no Drive são privados (escopo `drive.file`); o acesso depende
  da conta Google de quem abre.
- O `AGENTS.md` e dados pessoais sincronizados nunca devem ser commitados/publicados.

---

## 14. Limites e fora de escopo

- **Sem colaboração / times / múltiplos usuários por workspace.**
- Calendar: sincroniza **apenas o calendário primário** (não múltiplos).
- Sem IA generativa embutida — a IA atua externamente via workspace Markdown.
- Sem app nativo iOS/Android (é uma PWA).

---

## 15. Divergências documentação × código (resumo)

| Tema | Documentação | Código real |
|---|---|---|
| Status do item | PRD cita `in_progress` | Usa `doing` + `waiting` |
| Complexidade | PRD: `capture/task/project/area` | Código: `capture/task/note/project/document` |
| Entidade Project | PRD trata como entidade | Virou `Folder`; `Project` é shim |
| `Area` como complexidade | PRD lista `area` em complexidade | `area` é entidade separada, não complexidade |
| Campos protegidos | `AGENTS.md`: sem `syncHash`, cita `body` | Código: protege `syncHash`, usa `contentMd` |
| Drive | README cita pasta `doit.md` simples | Espelha a árvore de pastas + `_inbox`/`_trash` |
| Push notifications | PRD: fora de escopo | Implementado (push + fallback e-mail) |
| Anexos Drive | PRD: fora de escopo | Implementado |
