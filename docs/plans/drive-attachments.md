# PRD — Anexos via Google Drive (espelho de projetos)

**Status:** Fases A–E codadas (2026-05-16) — pendente validação E2E com conta Google real
**Data:** 2026-05-16 (revisa o PRD original de 2026-05-10)
**Autor:** Lucas
**Componentes:** `apps/web` (upload, reconciliação de move, OAuth), `apps/sync-agent` (índice, leitura de bytes), `packages/db` (`drive_links`, coluna `driveFolderId`), `AGENTS.md`

---

## 1. Contexto e decisão de arquitetura

O doit.md guarda notas/tarefas em markdown. Anexos (PDFs, imagens, planilhas) ficam no Google Drive do usuário: o app sobe via API, grava um link clicável no markdown, e o `sync-agent` mantém um índice `fileId ↔ caminho`.

### 1.1. Decisão: API-only (sem Google Drive for Desktop)

O PRD original (2026-05-10) assumia o **Drive for Desktop** como motor de bytes — o `sync-agent` só criaria um *junction* pra pasta espelhada localmente. **Revisado em 2026-05-16:** abandonamos essa dependência.

**Por quê:** o Drive for Desktop só era usado pra (a) a IA ler bytes localmente e (b) a IA mover arquivos com `mv`. Nenhum dos dois exige um motor de sync — esta feature **nunca edita os bytes** de um anexo, só *lê* e *reorganiza*. Leitura é `files.get?alt=media`; reorganização é `files.update`. Ambos são chamadas únicas no escopo `drive.file` que o indexer já usa. A Drive API **não tem custo monetário** — só rate limit gratuito, irrelevante pra uso pessoal.

**Ganho:** o `sync-agent` passa a rodar em qualquer máquina (inclusive headless), sem junction no Windows, sem placeholders de arquivo não-baixado, sem o caminho do espelho variando por OS.

### 1.2. Decisão: espelho automático da árvore de pastas

A organização das pastas no Drive é **derivada** da árvore de `folders` do doit.md, não definida à mão:

- Cada `folder` do doit.md ↔ uma pasta no Drive sob `doit.md/`.
- Um anexo pertence a um `item`; o `item` pertence a um `folder`; logo o anexo vive em `doit.md/<relativePath do folder>/`.
- A IA "ajusta a organização do Drive" **movendo notas entre folders** (ou renomeando folders). Ela nunca chama a Drive API. Quem propaga o move pro Drive é a reconciliação server-side.

```
Árvore doit.md            →   Drive (espelhado)
─────────────────             ─────────────────
Projetos/
  Cliente X/  ◄── nota    →   doit.md/Projetos/Cliente X/relatorio.pdf
  Cliente Y/              →   doit.md/Projetos/Cliente Y/

IA move a nota p/ Cliente Y → server roda files.update → PDF migra de pasta.
fileId preservado → link no markdown nunca quebra.
```

**Consequência aceita:** a estrutura de pastas no Drive é *autoritativamente* a árvore do doit.md. Se o usuário mover um anexo manualmente no Drive web, a próxima reconciliação devolve pra pasta espelhada. Isso é o trade-off do "espelho automático".

---

## 2. Estado atual do código (o que já existe)

Já implementado (Fases 1–2 do plano original):

- **OAuth:** reusa `GoogleAccountModel` + fluxo do Calendar; escopo `drive.file` adicionado. `apps/web/src/lib/google.ts`.
- **`apps/web/src/lib/drive.ts`:** `getOrCreateRootFolder`, `getOrCreateInboxFolder`, helpers `findFolderByName` / `createFolder`.
- **`POST /api/drive/upload`:** sobe arquivo, grava `drive_links`, retorna `webViewLink`. **Hoje põe tudo na raiz `doit.md/`** (`parents: [rootFolderId]`) — sem espelho de pastas.
- **`GET /api/drive/token`:** entrega access token de curta duração + `rootFolderId`/`inboxFolderId` pro CLI.
- **Tabela `drive_links`** `{id, userId, itemId, fileId, fileName, mimeType, size, webViewLink, createdAt}`.
- **`apps/sync-agent/src/drive/`:** `client.ts` (`listAllUnder` recursivo via API), `indexer.ts` (monta `drive-index.json` com paths virtuais `drive/...`), `reconcile.ts` (cruza `fileId`s dos markdowns vs índice → linked/broken/orphans/inboxPending).
- **`pull`** indexa o Drive e grava `_system/drive-index.json`; **`status`** mostra contadores.

**Gap pra esta revisão:** nada cria pastas por projeto no Drive nem move arquivos quando a nota muda de folder. É isso que as fases abaixo entregam.

---

## 3. Objetivo

1. Anexos sobem direto pra pasta do Drive que espelha o folder da nota.
2. Quando a nota muda de folder (UI ou IA via `sync-agent`), o anexo migra de pasta no Drive sozinho, sem quebrar o link.
3. Renomear/mover um folder no doit.md renomeia/move a pasta correspondente no Drive.
4. A IA lê o conteúdo dos anexos sem Drive for Desktop, via comando do `sync-agent`.
5. Arquivos jogados na `_inbox/` viram notas e migram pra pasta do projeto certo.

### Out of scope (V1)

Compartilhamento entre usuários; edição de Google Docs nativos; preview inline na nota; storage alternativo (S3/R2); sync bidirecional de bytes (a IA nunca reescreve um anexo).

---

## 4. Modelo de dados

### 4.1. Mapeamento folder ↔ pasta do Drive

Coluna nova `driveFolderId TEXT` na tabela `folders` (via `ensureColumn` em `ensureKnownColumns`, conforme o padrão SQL dual do repo). É o `fileId` da pasta-espelho no Drive. Estável: sobrevive a rename e move do folder, igual ao `fileId` de um arquivo.

- `driveFolderId` é **criado sob demanda** — só quando o primeiro anexo precisa daquela pasta. Folders sem anexo nunca geram pasta no Drive.
- `item` sem `folderId` → anexo vai pra raiz `doit.md/` (sem `_unfiled`).

### 4.2. `drive_links` (sem mudança de schema)

Continua `{id, userId, itemId, fileId, ...}`. O `itemId` é o **dono** do anexo — o item em que ele foi anexado. Se outras notas referenciarem o mesmo `fileId`, são só links; o arquivo segue a pasta do item dono.

### 4.3. Índice (`_system/drive-index.json`)

Formato atual mantido. O `path` virtual (`drive/Projetos/Cliente X/relatorio.pdf`) já é derivado dos `parents` reais do Drive pelo `indexer.ts` — depois das fases abaixo ele passa a refletir a árvore de projetos automaticamente.

---

## 5. Fluxos

### 5.1. Upload pelo app
1. Usuário arrasta arquivo numa nota → `POST /api/drive/upload` com `itemId`.
2. Server resolve `item.folderId` → `ensureFolderPath` cria/recupera a cadeia de pastas-espelho no Drive (mkdir -p) → `driveFolderId` da folha.
3. `files.create` com `parents: [driveFolderId]`.
4. Grava `drive_links`, insere `[nome](webViewLink)` no markdown.

### 5.2. IA reorganiza (move nota entre projetos)
1. IA move o `.md` entre pastas no workspace → `doit-sync diff` → `push`.
2. `push` aplica a mudança via API de update do item → `item.folderId` muda no server.
3. O handler de update detecta a mudança de `folderId` e, pra cada `drive_link` do item, roda `files.update` (`addParents`/`removeParents`) movendo o arquivo pra nova pasta-espelho.
4. `fileId` intacto → o link no markdown continua válido. Próximo `pull` reindexa o novo `path`.

### 5.3. Rename/move de folder
- `folder.name` muda → `files.update` renomeia a pasta-espelho (mesmo `driveFolderId`).
- `folder.parentId` muda → `files.update` move a pasta-espelho. Os arquivos dentro acompanham nativamente.

### 5.4. IA lê o conteúdo de um anexo
- `doit-sync drive get <fileId> [destino]` baixa via `files.get?alt=media` pra um cache (`.doitsync/cache/<fileId>`), retorna o caminho local. Read-through, sem mirror completo.

### 5.5. Inbox
1. Usuário joga arquivos em `doit.md/_inbox/` (Drive web/mobile).
2. `pull` lista em `_system/inbox.json` (já existe via `reconcile.ts`).
3. IA cria nota referenciando o `fileId`; `push` registra um `drive_link` e a reconciliação 5.2 move o arquivo da `_inbox/` pra pasta do projeto.

---

## 6. Casos de borda

| Caso | Tratamento |
|---|---|
| Item sem `folderId` | Anexo na raiz `doit.md/`. |
| Anexo referenciado por várias notas | Segue a pasta do item **dono** (`drive_links.itemId`); demais são só links. |
| Folder deletado no doit.md | Itens são reassinados (parent/null); reconciliação move os anexos. Pasta-espelho vazia é enviada pra lixeira. |
| Nome de pasta duplicado no Drive | `fileId` resolve identidade; `findFolderByName` casa pela primeira; aceitável pra uso pessoal. |
| Usuário move arquivo manualmente no Drive | Reconciliação devolve pra pasta-espelho (árvore doit.md é autoritativa). |
| `files.update` de move falha (rate limit/offline) | Logado; varredura de drift (`drive sync`) corrige depois. Idempotente. |
| Token OAuth revogado | Upload/move retornam 412 `needsReauth`; índice mantém último estado. |
| Anexo na lixeira do Drive | `reconcile.ts` marca o link como `broken (trashed)` no `status`. |

---

## 7. Etapas de implementação

Cada fase é mergeable e usável sozinha. Ordem = ordem de PRs.
**Status (2026-05-16): A–E implementadas e com typecheck/lint limpos.** Falta só
a validação ponta-a-ponta com uma conta Google conectada. E2/E3 abaixo ficaram
de fora (ver nota no fim da Fase E).

### Fase A — Espelho de pastas no upload
*Anexo novo cai na pasta do projeto certo.*

- **A1.** Schema: `ensureColumn(db, 'folders', 'driveFolderId', 'TEXT')` em `ensureKnownColumns`; adicionar `'driveFolderId'` aos `postgresIdentifiers`.
- **A2.** `lib/drive.ts`: `ensureFolderPath(drive, account, folderId)` — busca a cadeia de ancestrais do folder, faz mkdir -p das pastas-espelho, memoiza `driveFolderId` em cada `folder` (lock otimista contra corrida, como em `getOrCreateRootFolder`). Retorna o `driveFolderId` da folha. Sem `folderId` → retorna `rootFolderId`.
- **A3.** `POST /api/drive/upload`: trocar `parents: [rootFolderId]` por `parents: [await ensureFolderPath(...)]`.
- **Aceite:** anexar arquivo a uma nota dentro de `Projetos/Cliente X` cria `doit.md/Projetos/Cliente X/` no Drive e põe o arquivo lá; nota sem folder → raiz.

### Fase B — Reconciliação de move (o "ajuste da IA")
*Mudar a nota de projeto move o anexo no Drive.*

- **B1.** `lib/drive.ts`: `moveFileToFolder(drive, fileId, newParentId)` via `files.update` (`addParents`/`removeParents`); `renameFolder` e `moveFolder` pra pastas-espelho.
- **B2.** Hook no endpoint de update de **item**: ao detectar mudança de `folderId`, pra cada `drive_link` do item → `ensureFolderPath` do novo folder → `moveFileToFolder`. Falha não bloqueia o update (logar + marcar pra drift sweep).
- **B3.** Hook no endpoint de update de **folder**: `name` mudou → `renameFolder`; `parentId` mudou → `moveFolder`.
- **B4.** Como `doit-sync push` aplica as mudanças da IA por esses mesmos endpoints, a reorganização da IA já flui sem código extra no CLI. Validar o caminho `push` → API → reconcile.
- **Aceite:** mover nota entre folders (UI **e** via `sync-agent`) migra o anexo de pasta no Drive; `fileId` e link intactos; renomear folder renomeia a pasta-espelho.

### Fase C — Leitura de bytes pela IA
*A IA lê anexos sem Drive for Desktop.*

- **C1.** `sync-agent/src/drive/client.ts`: `downloadFile(accessToken, fileId, dest)` via `files.get?alt=media`.
- **C2.** Comando `doit-sync drive get <fileId> [destino]` → baixa pra `.doitsync/cache/<fileId>` (ou destino), imprime o caminho. Cache invalida por `md5Checksum` do índice.
- **Aceite:** `doit-sync drive get <id>` baixa o arquivo e a IA consegue lê-lo localmente.

### Fase D — Inbox + `AGENTS.md`
*Arquivos da `_inbox/` viram notas no projeto certo.*

- **D1.** Endpoint pra `push` registrar `drive_link` quando um markdown novo referencia um `fileId` ainda sem link (origem `_inbox/`).
- **D2.** Após registrar, dispara a reconciliação da Fase B → arquivo sai da `_inbox/` pra pasta do projeto.
- **D3.** Seção Drive no template `AGENTS.md` (`init.ts`): como ler o índice, preservar `fileId` nos links, usar `drive get`, processar a `_inbox/`.
- **Aceite:** jogar arquivo na `_inbox/`, a IA criar nota num projeto → após `pull`/`push` o arquivo está na pasta do projeto e a inbox zera.

### Fase E — Drift sweep + polimento
- **E1.** `doit-sync drive sync` (ou passo no `pull`): re-deriva o `driveFolderId` esperado de cada `drive_link` e corrige divergências (moves que falharam, mexidas manuais no Drive).
- **E2.** Tratamento de órfãos: comando pra mover anexos sem nota pra `_orphans/`.
- **E3.** (Opcional) preview inline de imagem/PDF na nota.

---

## 8. Critérios de aceitação (feature completa)

- [ ] Anexo novo cai na pasta do Drive que espelha o folder da nota.
- [ ] Mover nota de projeto (UI e via IA/`sync-agent`) migra o anexo no Drive sem quebrar o link.
- [ ] Renomear/mover folder no doit.md propaga pra pasta-espelho.
- [ ] `doit-sync drive get` baixa anexo sem Drive for Desktop.
- [ ] Arquivo da `_inbox/` processado pela IA acaba na pasta do projeto certo.
- [ ] `doit-sync status` reporta broken/órfãos/inbox corretamente após esses fluxos.
- [ ] Nenhum link quebrado em uso real (medido por `status`).

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Rate limit do Drive em reconciliações em lote | Moves são poucos (1 por anexo); backoff + drift sweep (E1) reprocessa o que falhar. |
| Corrida criando a mesma pasta-espelho 2× | `ensureFolderPath` faz `findFolderByName` antes do `create` + lock otimista no `folders.driveFolderId`. |
| Escopo `drive.file` não enxerga arquivo da `_inbox/` criado fora do app | Documentar: a `_inbox/` deve receber arquivos via o próprio app ou pasta criada por ele; senão usar fallback de reauth com escopo. Avaliar em D1. |
| Mudança de `folderId` sem `drive_link` (item sem anexo) | Hook B2 sai cedo se o item não tem `drive_links` — custo zero. |
| `push` movendo muitos itens de uma vez | Reconciliação assíncrona/em fila se o volume crescer; V1 síncrono é suficiente pra uso pessoal. |

---

## 10. Estimativa

- Fase A: ~1 dia · Fase B: ~2 dias · Fase C: ~0,5 dia · Fase D: ~1 dia · Fase E: ~1 dia.
