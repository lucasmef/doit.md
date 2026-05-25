# Checklist E2E — Anexos via Google Drive

**Status:** Fases A–E codadas (typecheck/lint limpos) — falta validação ponta-a-ponta
**Pré-requisito:** conta Google conectada com escopo `drive.file` ativo
**Referência:** `docs/plans/drive-attachments.md` (PRD)

> Marque cada item ao validar. Anote o resultado observado quando houver desvio.

---

## Pré-checks

- [ ] Conta Google conectada no doit.md (`google_accounts` populado)
- [ ] Escopo `drive.file` concedido (`hasDriveScope` retorna `true`)
- [ ] Commits `ce0db53` e `5131b1e` deployados (hoje só em `dev`, não pushados)
- [ ] `sync-agent` configurado e autenticado (`doit-sync` funcional)

---

## Fase A — Upload com espelho de pastas

- [ ] **A1.** Anexar arquivo a uma nota dentro de `Projetos/Cliente X`
  - Esperado: cria `doit.md/Projetos/Cliente X/` no Drive e põe o arquivo lá
- [ ] **A2.** Anexar arquivo a uma nota **sem folder**
  - Esperado: arquivo cai na raiz `doit.md/`
- [ ] **A3.** Anexar dois arquivos ao mesmo projeto em sequência
  - Esperado: **não** cria pasta duplicada (`findFolderByName` + lock otimista de `ensureFolderPath`)
- [ ] **A4.** Anexar a uma nota em folder aninhado (`Projetos/Cliente X/Sub`)
  - Esperado: cadeia de pastas criada (mkdir -p), `driveFolderId` memoizado em cada folder

---

## Fase B — Reconciliação de move

- [ ] **B1.** Mover nota entre folders **pela UI**
  - Esperado: anexo migra de pasta no Drive; `fileId` e link no markdown intactos
- [ ] **B2.** Mover nota **via `sync-agent`** (`diff` → `push`)
  - Esperado: mesmo resultado pelo caminho da IA
- [ ] **B3.** Mover notas **em lote** (`api/items/bulk`)
  - Esperado: hook do bulk dispara reconciliação para todos os itens (commit `5131b1e`)
- [ ] **B4.** Renomear um folder
  - Esperado: pasta-espelho renomeada, mesmo `driveFolderId`
- [ ] **B5.** Mover um folder de pai
  - Esperado: pasta-espelho muda de lugar, arquivos acompanham nativamente
- [ ] **B6.** Mover item sem anexo entre folders
  - Esperado: hook sai cedo, custo zero (sem chamada à Drive API)

---

## Fase C — Leitura de bytes pela IA

- [ ] **C1.** `doit-sync drive get <fileId>`
  - Esperado: baixa para `.doitsync/cache/<fileId>`, imprime o caminho local
- [ ] **C2.** `doit-sync drive get <fileId>` segunda chamada
  - Esperado: usa cache; invalidação por `md5Checksum` do índice
- [ ] **C3.** `doit-sync drive get <fileId> <destino>`
  - Esperado: baixa para o destino indicado

---

## Fase D — Inbox

- [ ] **D1.** Jogar arquivo em `doit.md/_inbox/` via app/pasta criada pelo app
  - Esperado: aparece em `_system/inbox.json` após `pull`
- [ ] **D2.** IA cria nota num projeto referenciando o `fileId` da inbox → `push`
  - Esperado: `drive_link` registrado (`registerInboxLinks`)
- [ ] **D3.** Após `push`/reconciliação
  - Esperado: arquivo migrado da `_inbox/` para a pasta do projeto; inbox zera
- [ ] **D4.** ⚠️ **RISCO** — jogar arquivo na `_inbox/` criado **fora do app** (Drive web direto)
  - Verificar: escopo `drive.file` consegue enxergar o arquivo?
  - Se não: documentar fallback (reauth com escopo amplo) — ver Risco em PRD §9

---

## Fase E — Drift sweep

- [ ] **E1a.** Forçar um move que falhou (ex.: offline durante reconciliação) → rodar `doit-sync drive sync`
  - Esperado: divergência corrigida
- [ ] **E1b.** Mover arquivo manualmente no Drive web → rodar `doit-sync drive sync`
  - Esperado: devolvido para a pasta-espelho (árvore doit.md é autoritativa)

---

## Casos de borda (PRD §6)

- [ ] **CB1.** Excluir anexo pelo app (`DELETE /api/items/[id]/drive-links`)
  - Esperado: arquivo movido para `doit.md/_trash/`; `drive_link` removido
- [ ] **CB2.** `_trash/` é ignorada pela reconciliação (não vira órfão)
- [ ] **CB3.** Delete best-effort: se o move falhar, vínculo é removido mesmo assim
- [ ] **CB4.** Anexo referenciado por várias notas → segue a pasta do item **dono** (`drive_links.itemId`)
- [ ] **CB5.** Token OAuth revogado → upload/move retornam `412 needsReauth`
- [ ] **CB6.** Anexo na lixeira do Drive → `doit-sync status` reporta `broken (trashed)`
- [ ] **CB7.** Folder deletado no doit.md → itens reassinados, anexos movidos, pasta-espelho vazia → lixeira
- [ ] **CB8.** Nome de pasta duplicado no Drive → `findFolderByName` casa pela primeira (aceitável)

---

## Critérios de aceitação finais (PRD §8)

- [ ] Anexo novo cai na pasta do Drive que espelha o folder da nota
- [ ] Mover nota de projeto (UI **e** via IA/`sync-agent`) migra o anexo sem quebrar o link
- [ ] Renomear/mover folder no doit.md propaga para a pasta-espelho
- [ ] `doit-sync drive get` baixa anexo sem Drive for Desktop
- [ ] Arquivo da `_inbox/` processado pela IA acaba na pasta do projeto certo
- [ ] `doit-sync status` reporta broken/órfãos/inbox corretamente após os fluxos
- [ ] Nenhum link quebrado em uso real (medido por `status`)

---

## Fora de escopo (V1)

- E2 — tratamento de órfãos (`_orphans/`)
- E3 — preview inline de imagem/PDF na nota
- Compartilhamento entre usuários, edição de Google Docs nativos, storage alternativo, sync bidirecional de bytes
