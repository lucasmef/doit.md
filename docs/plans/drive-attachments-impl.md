# Plano Técnico — Anexos via Google Drive (Implementação)

> ⚠️ **Parcialmente obsoleto (2026-05-16).** As Fases 1–2 abaixo já foram
> implementadas e continuam válidas. A partir da Fase 3, este plano assumia o
> Google Drive for Desktop como motor de bytes — decisão **revertida**. O plano
> atual (API-only + espelho de pastas por projeto) está no PRD
> [drive-attachments.md](./drive-attachments.md), Fases A–E. Use o PRD como fonte da verdade.

**Status:** Fases 1–2 implementadas; Fase 3+ superada pelo PRD
**Data:** 2026-05-10
**Autor:** Lucas
**PRD:** [docs/plans/drive-attachments.md](./drive-attachments.md)
**Estratégia:** entregar por fases. Cada fase é mergeable e usável sozinha.

---

## Stack e pontos de ancoragem

- App: Next.js App Router em `apps/web`, autenticação via `@/lib/auth` → `{ userId }`.
- Persistência: **SQL dual** — `better-sqlite3` em dev, `pg` (Postgres) em prod. Schema canônico em `packages/db/src/connection.ts` (array `sqliteSchema` traduzido pra Postgres via `quotePostgresIdentifier`). Models em `packages/db/src/index.ts` são instâncias de `SqlModel` custom — não Mongoose, não Drizzle. (Os arquivos `packages/db/src/schemas/*.schema.ts` com Mongoose são dead code e devem ser ignorados.)
- OAuth Google **já existe** pra Calendar: `apps/web/src/lib/google.ts` + `apps/web/src/app/api/google/{route,callback,disconnect,account}/route.ts` + tabela `google_accounts` exposta como `GoogleAccountModel` (token único por usuário).
- SDK `googleapis` já é dependência de `apps/web`.
- CLI: `apps/sync-agent` com `init`, `login`, `pull`, `diff`, `push`, `status`. Auth via CLI token contra `/api/me`.

**Decisão chave:** reusar `GoogleAccountModel` e o fluxo OAuth existente em vez de criar conta separada — só adicionamos `drive.file` aos scopes e tratamos reconsent.

---

## Fase 1 — OAuth com escopo Drive + upload via UI

Objetivo: usuário arrasta arquivo na nota, sobe pro Drive na pasta raiz do app, recebe link markdown inserido na nota.

### 1.1. Configuração Google Cloud (manual, fora do código)

- No projeto existente do GCP, em **OAuth consent screen → Scopes**, adicionar `https://www.googleapis.com/auth/drive.file`.
- Verificar que `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` continuam válidos.
- Adicionar nova env `DRIVE_ROOT_FOLDER_NAME=doit.md` (default, criada on-demand).

### 1.2. Atualizar `apps/web/src/lib/google.ts`

- Estender `getAuthUrl` pra incluir `https://www.googleapis.com/auth/drive.file` no array de scopes.
- Adicionar helper `getDriveClient(accessToken, refreshToken)` espelhando `getCalendarClient`, retornando `google.drive({ version: 'v3', auth: client })`.
- Adicionar `ensureValidAccessToken(account)` que verifica `expiresAt`, chama `refreshAccessToken` se vencido, e **persiste o novo token** no `GoogleAccountModel`. Hoje `refreshAccessToken` retorna mas não salva — pra Drive isso vira gargalo.
- Adicionar `hasDriveScope(account)`: retorna `false` se `account.scope` não inclui `drive.file`. UI usa pra pedir reconsent.

### 1.3. Endpoint de reconsent

- Reusar `GET /api/google` — passa a pedir todos os scopes (Calendar + Drive). Próximo callback grava `scope` atualizado.
- Adicionar `GET /api/google/account` (já existe) retornando `{ connected, email, hasCalendar, hasDrive }` derivados de `scope`. Verificar implementação atual; estender se necessário.

### 1.4. Pasta raiz no Drive

- Helper novo `apps/web/src/lib/drive.ts`:
  - `getOrCreateRootFolder(drive, userId)`: armazena `driveRootFolderId` no `GoogleAccountModel` (campo novo). Se vazio, chama `drive.files.create` com `mimeType: 'application/vnd.google-apps.folder'`, `name: 'doit.md'`. Salva o ID retornado.
  - `getOrCreateInboxFolder(drive, rootFolderId)`: idem pra `_inbox/`.

### 1.5. Schema: estender tabela `google_accounts`

Em `packages/db/src/connection.ts`, dentro de `ensureKnownColumns`, adicionar:

```ts
await ensureColumn(db, 'google_accounts', 'driveRootFolderId', 'TEXT')
await ensureColumn(db, 'google_accounts', 'driveInboxFolderId', 'TEXT')
```

Adicionar `'driveRootFolderId'` e `'driveInboxFolderId'` ao array `postgresIdentifiers` (pra serem citados com aspas em Postgres).

### 1.6. Nova tabela `drive_links`

Append no array `sqliteSchema` em `packages/db/src/connection.ts`:

```sql
CREATE TABLE IF NOT EXISTS drive_links (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  fileId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT,
  size INTEGER,
  webViewLink TEXT NOT NULL,
  createdAt TEXT NOT NULL
)
CREATE INDEX IF NOT EXISTS drive_links_user_item_idx ON drive_links (userId, itemId)
CREATE INDEX IF NOT EXISTS drive_links_user_file_idx ON drive_links (userId, fileId)
```

Adicionar `'fileName'`, `'fileId'`, `'mimeType'`, `'webViewLink'` ao `postgresIdentifiers` (os outros já existem).

Em `packages/db/src/index.ts`, exportar:

```ts
export const DriveLinkModel = new SqlModel({ table: 'drive_links' })
```

IDs gerados como `dlk_<base62>` seguindo o padrão dos outros (`itm_`, `fld_`, `gac_`, etc).

### 1.7. Endpoint de upload `POST /api/drive/upload`

Arquivo: `apps/web/src/app/api/drive/upload/route.ts`.

Fluxo:

1. `auth()` → `userId` ou 401.
2. Parse multipart: `file` + `itemId`.
3. Validar: tamanho ≤ 100MB, item pertence ao user.
4. Buscar `GoogleAccountModel` pelo `userId`. Se ausente ou sem scope Drive → 412 `{ needsReauth: true }`.
5. `ensureValidAccessToken` → `getDriveClient`.
6. `getOrCreateRootFolder` → `rootFolderId`.
7. `drive.files.create({ requestBody: { name, parents: [rootFolderId] }, media: { mimeType, body: stream } })`.
8. `drive.files.get({ fileId, fields: 'id,name,mimeType,size,webViewLink' })`.
9. Persistir `DriveLinkModel`.
10. Retornar `{ fileId, name, webViewLink, mimeType, size }`.

Stream do upload: `req.body` (Web Streams) → `Readable.fromWeb` pra passar pro googleapis. Validar limite de tamanho antes via `Content-Length`.

### 1.8. UI no editor

- Componente `apps/web/src/components/editor/AttachmentDropzone.tsx`:
  - Wrap do textarea/editor markdown atual (localizar via Grep onde está o editor de item).
  - Captura `drop` e `paste` de `File`.
  - Chama `POST /api/drive/upload`, mostra progresso (XHR pra ter upload progress; `fetch` ainda não suporta direito).
  - On success: insere `[${name}](${webViewLink})` na posição do cursor.
  - On 412 `needsReauth`: toast com botão "Conectar Drive" → `/api/google`.
- Settings: na tela de integrações Google, mostrar status Drive separado de Calendar (lendo `hasDrive` de `/api/google/account`).

### 1.9. Critérios de aceite Fase 1

- [ ] Conectar Google em conta sem Drive prévio pede reconsent só uma vez.
- [ ] Arrastar PDF 5MB em nota: link aparece no markdown em <3s, abre no Drive logado.
- [ ] Arquivo aparece em `My Drive/doit.md/` (Drive web) com o nome correto.
- [ ] `DriveLinkModel` tem registro com `itemId`, `fileId`, `webViewLink`.
- [ ] Subir em conta sem Drive scope retorna 412 e UI pede reauth.
- [ ] Limite de 100MB rejeitado com 413.

---

## Fase 2 — Índice no `sync-agent` + reconciliação

Objetivo: `doit-sync pull` mantém `.doitsync/drive-index.json` da pasta raiz; `status` lista broken/órfãos.

### 2.1. Endpoint servidor `GET /api/drive/token` (auth via CLI token)

- Retorna `{ accessToken, expiresAt, rootFolderId, inboxFolderId }` pra CLI.
- Refresh transparente no servidor (`ensureValidAccessToken`).
- Sem refresh token vazado pro cliente — só access token de curta duração.

### 2.2. Módulo `apps/sync-agent/src/drive/`

- `client.ts`: cria `google.drive` autenticado com access token obtido do endpoint acima. Renova quando 401 (chama o endpoint de novo).
- `indexer.ts`: `listAllUnder(rootFolderId)` faz `files.list` recursivo com `q: "'<parentId>' in parents and trashed = false"`, pageSize 1000, paginando. Inclui também `trashed=true` em segunda passada pra detectar lixeira recente. Monta `drive-index.json` com formato definido no PRD §4.
- `paths.ts`: dado o índice, constrói `path` relativo (`drive/<parent>/.../<name>`) seguindo `parents`. Detecta ciclos (impossível em Drive, mas defensivo).
- `reconcile.ts`:
  - Varre todos os markdowns do workspace, extrai `fileId` via regex `/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/g`.
  - Cruza com `drive-index.json`:
    - `fileId` no markdown + ausente do índice → **broken**.
    - `fileId` no markdown + `trashed: true` → **broken (trashed)**.
    - `fileId` no índice + sem referência + dentro de `_inbox/` → **inbox-pendente**.
    - `fileId` no índice + sem referência + fora de `_inbox/` → **órfão**.

### 2.3. Integração no `pull`

- Em `apps/sync-agent/src/commands/pull.ts`, após o pull de markdowns, se config tem `drive: true`, rodar `indexer.run()` e gravar `.doitsync/drive-index.json`.
- Falha de Drive não aborta o pull — loga warning, segue.

### 2.4. Extensão do `status`

- `status` lê `drive-index.json` + faz `reconcile.run()` em memória (sem chamar API). Mostra:

  ```
  Drive: 142 arquivos indexados (atualizado há 3min)
    ✓ 138 linkados
    ⚠ 2 broken
    📥 3 na inbox aguardando processamento
    🗑 1 órfão
  ```

- Flag `--drive` mostra detalhes (lista de paths e fileIds).

### 2.5. Critérios de aceite Fase 2

- [ ] `pull` num workspace com Drive conectado cria `.doitsync/drive-index.json` válido.
- [ ] Renomear arquivo no Drive web → próximo `pull` atualiza `path` no índice, `fileId` mantido.
- [ ] Apagar link de uma nota e rodar `status` → arquivo aparece como órfão.
- [ ] Mover arquivo pra lixeira no Drive → próximo `status` marca link como broken.
- [ ] CLI sem scope Drive: `pull` ignora Drive silenciosamente (warning), continua.

---

## Fase 3 — Inbox + instruções pra IA

### 3.1. Inbox automática

- No primeiro `pull` com Drive, garantir `_inbox/` (já feito no servidor via `getOrCreateInboxFolder`).
- Indexer marca arquivos em `_inbox/` na saída separada `.doitsync/inbox.json`:

  ```json
  {
    "pending": [
      { "fileId": "…", "name": "foto.jpg", "path": "drive/_inbox/foto.jpg", "mimeType": "image/jpeg", "size": 12345 }
    ]
  }
  ```

### 3.2. `AGENTS.md`

- Em `apps/sync-agent/src/commands/init.ts`, adicionar seção sobre Drive no template (texto definido no PRD §7).
- Em `pull`, atualizar `AGENTS.md` se template versionado mudou.

### 3.3. Endpoint pra IA atualizar links em bulk (opcional)

- Se a IA mover arquivos via Drive API direto (em vez de `mv` local), precisamos garantir que `fileId` permanece. Como ela vai trabalhar via espelho local + `mv`, **não precisa endpoint novo**. Drive for Desktop sincroniza o move e o `fileId` é preservado nativamente.

### 3.4. Critérios de aceite Fase 3

- [ ] Jogar 3 PDFs em `drive/_inbox/` via Drive web → após `pull`, `inbox.json` lista os 3.
- [ ] IA seguindo `AGENTS.md` cria notas com links corretos e move arquivos pra subpastas → próximo `pull` zera a inbox e o índice tem os novos paths.
- [ ] Nenhum link quebrado após esse fluxo (validado em `status`).

---

## Fase 4 — Polimento (escopo separado, fora deste plano)

Preview inline, busca global em arquivos do Drive, suporte a múltiplas pastas raiz. Não detalhar aqui.

---

## Riscos técnicos específicos

| Risco | Mitigação |
|---|---|
| `req.body` como stream no Next.js App Router exige `runtime: 'nodejs'` e atenção a tamanho — Vercel impõe 4.5MB no body padrão em serverless | Confirmar runtime; se hospedagem é VPS (ver `docs/VPS_SETUP.md`), não há limite. Documentar. |
| Refresh token sumiu (Google só envia uma vez se não passar `prompt: 'consent'`) | `getAuthUrl` já usa `prompt: 'consent'`. Manter. |
| Race: dois uploads simultâneos criando duas pastas `doit.md/` | `getOrCreateRootFolder` faz `files.list` antes do create + lock otimista no `GoogleAccountModel.findOneAndUpdate` com `$setOnInsert` no `driveRootFolderId`. |
| `files.list` recursivo pode ser lento em pastas com milhares de itens | Paginação + cache: guardar `modifiedTime` da pasta raiz; se não mudou desde último pull, pular reindexação. Fase 2.5 se necessário. |
| Usuário desconecta Google → órfãos no Drive viram inalcançáveis pelo app | `disconnect` não apaga arquivos. Documentar e oferecer "reconectar" sempre. |
| CLI vaza access token nos logs | `--verbose` mascarar; default não loga token. |

---

## Ordem de execução sugerida

Cada bullet é um PR. Mergeable independente.

1. Schema `DriveLinkModel` + extensão `GoogleAccountModel` (1.5, 1.6).
2. `lib/google.ts`: scope Drive + `getDriveClient` + `ensureValidAccessToken` (1.2).
3. `lib/drive.ts`: helpers de pasta raiz/inbox (1.4).
4. `POST /api/drive/upload` (1.7).
5. `AttachmentDropzone` + integração no editor (1.8). **→ Fase 1 entregável.**
6. `GET /api/drive/token` (2.1).
7. `sync-agent/drive/` módulo + integração no `pull` (2.2, 2.3).
8. Extensão do `status` (2.4). **→ Fase 2 entregável.**
9. Inbox tracking + `AGENTS.md` (3.1, 3.2). **→ Fase 3 entregável.**

## Estimativa grosseira

- Fase 1: 2-3 dias.
- Fase 2: 2 dias.
- Fase 3: 1 dia.
