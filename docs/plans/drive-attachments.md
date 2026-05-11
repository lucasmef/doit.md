# PRD — Anexos via Google Drive

**Status:** Proposto
**Data:** 2026-05-10
**Autor:** Lucas
**Componente afetado:** `apps/web` (upload UI, renderer de markdown, OAuth Google), `apps/sync-agent` (indexação Drive, reconciliação), `packages/db` (tabela `drive_links`), `AGENTS.md` (instruções pra IA)

---

## 1. Contexto

Hoje o doit.md guarda notas e tarefas em markdown sincronizado via `doit-sync`. Não há mecanismo pra anexar arquivos privados (PDFs, imagens grandes, planilhas, áudios) a uma nota. Subir esses arquivos pro storage próprio do app implica:

- Custo de storage e banda no servidor.
- Outro sistema pra fazer backup, versionar e dar permissão.
- IA local (Claude Code rodando no workspace do `doit-sync`) não tem acesso direto aos bytes.

O usuário já usa Google Drive pra arquivos pessoais e tem o **Google Drive for Desktop** instalado, que espelha pastas do Drive no filesystem local. Aproveitar essa stack: o app sobe arquivos pro Drive do usuário via OAuth, o espelho local fica dentro do workspace do `doit-sync`, e a IA lê arquivos como se fossem locais.

## 2. Objetivo

Permitir o fluxo:

1. Usuário conecta sua conta Google ao doit.md (OAuth, escopo `drive.file`).
2. Anexa arquivos a uma nota pela UI do app, ou joga arquivos numa pasta `_inbox/` do Drive pra IA processar depois.
3. App grava no markdown da nota um link clicável (`webViewLink`) que abre o arquivo no Drive.
4. `doit-sync` mantém um índice local mapeando `fileId ↔ caminho local`, atualizado a cada sync via Drive API.
5. IA (rodando no workspace) lê arquivos do espelho local do Drive for Desktop, reorganiza em subpastas livremente, cria notas a partir dos arquivos da `_inbox/`.
6. Renames/moves feitos pela IA não quebram os links — o `fileId` é estável.

## 3. Escopo

### In-scope

- OAuth Google no app (escopo `https://www.googleapis.com/auth/drive.file` — acesso apenas a arquivos criados/abertos pelo app).
- Configuração de **pasta raiz** do Drive (ex.: `My Drive/doit.md/`) e subpasta `_inbox/` automática.
- Upload de arquivos pela UI da nota (drag-drop + botão), via API do Drive.
- Inserção automática de link markdown na nota: `[nome.ext](https://drive.google.com/file/d/<fileId>/view)`.
- Tabela `drive_links` em `packages/db` com `{itemId, fileId, fileName, mimeType, createdAt}` — backup do mapping caso o markdown seja corrompido.
- Comando `doit-sync drive pull` (ou integrado ao `pull` normal): chama Drive API, reconstrói `.doitsync/drive-index.json`.
- Reconciliação no `diff`/`status`: detecta links quebrados (arquivo trashed/deletado) e órfãos (arquivo no Drive sem nota referenciando).
- Instruções no `AGENTS.md` ensinando a IA a: ler do índice, preservar URLs do Drive nos markdowns, processar `_inbox/`.

### Out-of-scope (V1)

- Compartilhamento de arquivos entre usuários do doit.md.
- Edição de arquivos do Drive pelo app (Google Docs/Sheets nativos).
- Preview inline no app (imagens/PDFs renderizados na nota) — V1 só link clicável.
- Storage alternativo (S3, R2). Drive é a única opção em V1.
- Antivírus / scan de conteúdo. Confiamos no Drive.

## 4. Modelo de dados

### Fonte da verdade

- **Identidade do arquivo:** `fileId` do Drive (imutável, sobrevive a rename/move).
- **Referência na nota:** URL markdown padrão `https://drive.google.com/file/d/<fileId>/view`. O `fileId` é extraído via regex `/\/d\/([^/]+)\//`.
- **Backup do mapping:** tabela `drive_links` no DB do app + `drive-links` no JSON do `item` exportado pelo `sync-agent`.

### Índice local (`.doitsync/drive-index.json`)

Reconstruído a cada `doit-sync pull` a partir da Drive API (não do filesystem):

```json
{
  "version": 1,
  "rootFolderId": "0Bxyz…",
  "updatedAt": "2026-05-10T12:00:00Z",
  "files": {
    "1aBcDxyz": {
      "path": "drive/Projetos/relatorio.pdf",
      "name": "relatorio.pdf",
      "mimeType": "application/pdf",
      "md5": "…",
      "size": 1048576,
      "modifiedTime": "2026-05-09T20:00:00Z",
      "trashed": false,
      "parents": ["folder_id_1"]
    }
  }
}
```

## 5. Fluxos

### 5.1. Upload pelo app

1. Usuário arrasta arquivo na nota → frontend chama `POST /api/drive/upload` com `itemId` + multipart.
2. Backend (com token OAuth do usuário) chama `files.create` na Drive API, parent = pasta raiz configurada.
3. Recebe `fileId`, `webViewLink`. Insere `[nome](webViewLink)` na posição do cursor.
4. Grava linha em `drive_links` (`itemId`, `fileId`, `fileName`).
5. Em background, Drive for Desktop espelha o arquivo localmente. App **não** depende disso.

### 5.2. Upload pela IA (via `_inbox/`)

1. Usuário joga arquivos em `drive/_inbox/` (Drive web, mobile, ou pasta local).
2. `doit-sync pull` indexa, marca esses fileIds como `inbox-pendentes` em `.doitsync/inbox.json`.
3. IA lê `inbox.json` + os arquivos do espelho local, cria notas com links markdown apontando pros `fileId`s.
4. IA move os arquivos pra subpastas semânticas (ex.: `drive/Projetos/X/`) usando ferramentas locais (`mv`).
5. Drive for Desktop propaga moves → próximo `pull` atualiza `path` no índice, `fileId` permanece.
6. `doit-sync diff` envia notas novas pra auditoria; usuário aprova; `push` aplica.

### 5.3. Acesso pelo usuário

- Clica no link markdown na UI da nota → abre `drive.google.com/file/d/<id>/view` no browser logado.
- Sem permissão → tela padrão do Drive ("request access"). Pra uso próprio, sempre tem permissão.

### 5.4. IA precisa ler conteúdo

- Lê o `fileId` do markdown via regex.
- Consulta `.doitsync/drive-index.json` → `files[fileId].path`.
- Lê o arquivo do disco. Fallback: `files.get?alt=media` via API se não houver espelho local.

## 6. Matriz de deleção

| Evento | Estado resultante | Detecção | Comportamento |
|---|---|---|---|
| Usuário remove link da nota | Arquivo órfão no Drive | `pull` compara `fileId`s no markdown vs índice | Lista órfãos no `status`; opção de mover pra `_orphans/` |
| Usuário deleta no Drive web | `trashed: true` no índice | API retorna trashed | Marca link como `⚠️ broken` no `status`; lixeira do Drive guarda 30 dias |
| IA deleta arquivo local | Drive for Desktop manda pra lixeira | Mesmo do anterior | Mesmo tratamento |
| IA apaga link da nota mas não o arquivo | Órfão | Mesmo de "remove link" | Reversível via git nas notas |
| Arquivo não baixado localmente (Drive for Desktop offline) | Existe na API, não no disco | `pull` confirma via API | IA usa fallback API; não marca broken |
| Token OAuth revogado | API falha | `pull` retorna 401 | Pede reauth na UI; índice mantém último estado conhecido |

## 7. Mudanças por componente

### `apps/web`

- Tela **Configurações → Integrações → Google Drive**: botão "Conectar", picker da pasta raiz, status da conexão.
- Endpoint `GET /api/auth/google` (start OAuth) + `GET /api/auth/google/callback`.
- Endpoint `POST /api/drive/upload` (multipart → Drive API → grava `drive_links` → retorna `{fileId, webViewLink, name}`).
- Endpoint `GET /api/drive/links?itemId=...` (lista pra UI mostrar anexos de uma nota).
- Componente `<AttachmentDropzone />` no editor de notas.

### `packages/db`

- Migration: tabela `drive_links` `{id, userId, itemId, fileId, fileName, mimeType, createdAt}`.
- Tabela `google_oauth_tokens` `{userId, accessToken (enc), refreshToken (enc), scope, expiresAt}`.

### `apps/sync-agent`

- Novo módulo `drive/`:
  - `indexer.ts`: lista recursiva via `files.list`, monta `drive-index.json`.
  - `reconcile.ts`: cruza `fileId`s referenciados em markdowns vs índice; produz lista de broken/órfãos/inbox-pendentes.
  - `auth.ts`: usa o token OAuth do usuário (obtido do servidor doit.md via `/api/me/google-token` autenticado por CLI token).
- Integração no `pull`: depois de baixar markdowns, roda indexação + reconciliação se Drive estiver conectado.
- Integração no `status`: mostra contadores `broken`, `orphans`, `inbox-pendentes`.

### `AGENTS.md` (gerado pelo `doit-sync init`)

Trecho novo:

```markdown
## Anexos do Drive

- Arquivos em `drive/` são espelhados do Google Drive. O ID canônico de cada arquivo está em `.doitsync/drive-index.json`.
- Links pra arquivos do Drive em notas têm o formato `https://drive.google.com/file/d/<fileId>/view`. **Nunca edite o `<fileId>`** — ele é a identidade do arquivo.
- Pra saber qual arquivo local corresponde a um link, busque o `<fileId>` em `drive-index.json` → use o campo `path`.
- Pra processar a inbox: leia `.doitsync/inbox.json`, crie notas referenciando os `fileId`s via link markdown, mova os arquivos com `mv` pra pastas semânticas dentro de `drive/`.
```

## 8. Segurança

- Escopo OAuth restrito a `drive.file` (não `drive` completo) — app só vê arquivos criados/abertos por ele.
- Tokens OAuth criptografados no DB com chave em env var (`GOOGLE_TOKEN_ENC_KEY`).
- `webViewLink` exige autenticação Google do usuário pra abrir — não é link público.
- Nunca chamar `permissions.create` com `type: anyone` em V1.

## 9. Critérios de aceitação

- [ ] Usuário conecta conta Google em Settings, escolhe pasta raiz, vê status "Conectado".
- [ ] Drag-drop de arquivo no editor sobe pro Drive e insere link na nota em <3s pra arquivos até 10MB.
- [ ] Link na nota, clicado, abre o arquivo no Drive logado.
- [ ] `doit-sync pull` cria/atualiza `.doitsync/drive-index.json` corretamente após rename/move feitos pela IA.
- [ ] `doit-sync status` lista broken/órfãos/inbox-pendentes com contagem correta.
- [ ] IA, seguindo o `AGENTS.md`, consegue: ler arquivo da `_inbox/`, criar nota referenciando, mover pra subpasta — sem quebrar o link.
- [ ] Arquivo deletado no Drive web aparece como `broken` no próximo `status`; restaurar da lixeira o "conserta" no `pull` seguinte.
- [ ] Token OAuth revogado é detectado e UI pede reauth.

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Usuário sem Drive for Desktop instalado | Fallback automático pra `files.get?alt=media` via API; documentar que sem o desktop fica mais lento |
| API quota do Drive (queries/dia) | Cache do índice; só refazer lista completa quando `modifiedTime` da pasta raiz mudou (`files.list` com `q` por data) |
| Conflito de nome de arquivo no Drive (duplicatas) | `fileId` resolve identidade; renomeia visualmente com sufixo se necessário |
| IA "alucina" um `fileId` inexistente | Reconciliação detecta no `status` como broken; nunca passa pelo `push` sem revisão |
| Arquivo enorme trava upload no browser | Limite de 100MB em V1; UI bloqueia maiores com mensagem |

## 11. Métricas de sucesso

- 80%+ dos anexos criados via app abrem sem erro pelo link na nota após 30 dias.
- Zero links quebrados causados por moves/renames da IA em uso real (medido por `status`).
- Tempo médio de upload <3s pra arquivos <10MB.

## 12. Fases sugeridas

1. **Fase 1 — OAuth + upload manual:** conectar Google, subir via UI, link na nota. Sem `sync-agent`.
2. **Fase 2 — Índice + reconciliação:** `doit-sync` mantém `drive-index.json`, reporta broken/órfãos.
3. **Fase 3 — Inbox + IA:** `_inbox/` automática, `inbox.json` pra IA, instruções no `AGENTS.md`.
4. **Fase 4 — Polimento:** preview inline (imagens/PDFs), busca por arquivos do Drive na busca global.
