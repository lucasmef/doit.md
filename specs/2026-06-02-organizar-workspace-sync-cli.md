# Organizar Workspace do Sync CLI

## Metadata

- Status: done
- Mode: architecture
- Complexity: architectural
- Created: 2026-06-02
- Updated: 2026-06-02

## Objective

Separar os arquivos internos do `doit-sync` das pastas e arquivos Markdown editaveis pelo usuario/IA. O workspace local deve ficar mais legivel depois do `doit-sync init` e `doit-sync pull`, reduzindo a confusao entre arquivos de sistema e conteudo sincronizado.

## Context

O CLI atual cria `Inbox`, `Proximos`, `_arquivo`, `_system`, `_changes`, `_raw_archive`, `AGENTS.md` e `README.md` todos na raiz do workspace. O `pull` tambem cria pastas reais do app na raiz e escreve `_folder.json` dentro de cada pasta sincronizada. `diff`, `push`, `status` e Drive usam caminhos fixos na raiz. A pagina de Configuracoes > Sync explica o fluxo, mas nao mostra claramente a separacao entre area editavel e estado interno. O usuario confirmou que prefere manter pastas e notas na raiz (`inbox`, `proximos`, pastas reais) e mover apenas arquivos internos para `.doit-sync/`.

## Scope

- [x] Definir layout local mais claro para novos workspaces.
- [x] Ajustar o CLI para usar helpers de caminho em vez de caminhos internos espalhados.
- [x] Nao implementar migracao/fallback para workspaces antigos, por decisao do usuario.
- [x] Atualizar README do CLI e a pagina Sync em Configuracoes.
- [x] Validar type-check/build dos pacotes afetados e evidencia visual da pagina alterada.

## Out of scope

- Alterar schema do banco.
- Bypassar auditoria ou mudar niveis de risco.
- Migrar automaticamente workspaces antigos.
- Mudar a estrutura de dados dos itens no servidor.

## Grill Gate

Decision: completed

Reason:
A estrutura local do workspace e contrato de uso do sync CLI. Ha mais de um layout valido e cada um afeta compatibilidade, migracao e UX de agentes locais.

Questions, if any:
1. Usar o layout `items/` para conteudo editavel e `.doit-sync/` para estado interno?
2. Workspaces antigos devem continuar funcionando por fallback, ou o CLI deve exigir migracao explicita?
3. Como a `inbox/` deve funcionar para arquivos soltos?

Answers:
1. Nao. Pastas e notas ficam na raiz; apenas arquivos internos do CLI ficam em `.doit-sync/`.
2. Nao precisa tratar workspaces antigos; o usuario removeu o workspace antigo e vai reinstalar depois da mudanca.
3. `inbox/` e porta de entrada para arquivos soltos, e tudo que entra ali deve ser obrigatoriamente revisado por IA. Esta regra deve aparecer no `AGENTS.md` local gerado pelo CLI.

## Acceptance criteria

- [x] Um novo `doit-sync init` cria `inbox/`, `proximos/`, `arquivo/` e `.doit-sync/` na raiz.
- [x] `pull`, `diff`, `push`, `status` e Drive leem/escrevem usando o novo layout.
- [x] Arquivos internos do CLI ficam em `.doit-sync/system`, `.doit-sync/changes` e `.doit-sync/raw-archive`.
- [x] O `AGENTS.md` gerado trata `inbox/` como porta de entrada obrigatoriamente revisada por IA.
- [x] A tela de Sync mostra a estrutura nova e deixa claro onde editar arquivos.
- [x] README do CLI documenta a nova estrutura.
- [x] Validacoes relevantes passam ou ficam registradas com motivo.

## Implementation plan

- [x] Ler comandos do sync CLI e pagina de Sync.
- [x] Propor layout e decidir se precisa confirmacao.
- [x] Implementar helpers de workspace layout.
- [x] Atualizar comandos e documentacao.
- [x] Validar CLI e UI.

## Progress

- 2026-06-02 00:00 - Started context review.
- 2026-06-02 00:00 - Lidos `docs/CONTEXT.md`, `docs/ADR.md`, README do CLI e comandos `init`, `pull`, `diff`, `push`, `status`, `drive`.
- 2026-06-02 00:00 - Identificado layout atual misturando pastas editaveis e arquivos de sistema na raiz.
- 2026-06-02 00:00 - ADR-004 proposta com layout `items/` + `.doit-sync/`.
- 2026-06-02 00:00 - Usuario confirmou layout raiz editavel + `.doit-sync/`, sem migracao/fallback, e regra de revisao obrigatoria da `inbox/`.
- 2026-06-02 00:00 - ADR-004 atualizada para `active` com o layout confirmado.
- 2026-06-02 00:00 - CLI atualizado para gravar manifest, pendencias, cache do Drive e snapshots em `.doit-sync/`.
- 2026-06-02 00:00 - Removida escrita de `_folder.json`; arquivos internos do CLI nao ficam mais dentro de pastas sincronizadas.
- 2026-06-02 00:00 - README do CLI e pagina Sync atualizados com a nova estrutura.
- 2026-06-02 00:00 - Type-check/build do CLI e type-check do web passaram.
- 2026-06-02 00:00 - Servidor local temporario iniciado em `http://127.0.0.1:3000` para validacao visual da pagina Sync; processo listener PID 19532 encerrado ao final.
- 2026-06-02 00:00 - Screenshot salvo em `specs/artifacts/2026-06-02-organizar-workspace-sync-cli/doitmd-sync-workspace-2026-06-02.png` e copiado para `G:\Meu Drive\.agentes\doitmd-sync-workspace-2026-06-02.png`.
- 2026-06-02 00:00 - Commit da tarefa criado na branch `dev`, pushado para `origin/dev`, e PR aberto: https://github.com/lucasmef/doit.md/pull/52.

## Decisions

- Decision: Tratar a mudanca como arquitetural ate o layout ser confirmado.
  Reason: O layout local do sync e contrato de importacao/sincronizacao e pode afetar workspaces existentes.
  ADR needed: yes

- Decision: Recomendar `items/` como unica superficie editavel e `.doit-sync/` como pasta interna.
  Reason: Separa claramente conteudo sincronizado dos arquivos do proprio CLI, mantendo a raiz para orientacao humana.
  ADR needed: yes

- Decision: Usar raiz do workspace como superficie editavel e `.doit-sync/` para estado interno.
  Reason: O usuario quer abrir o workspace e ver imediatamente `inbox`, `proximos` e pastas reais.
  ADR needed: yes

- Decision: Nao implementar fallback/migracao de workspaces antigos.
  Reason: O uso atual e individual e o workspace antigo ja foi excluido.
  ADR needed: no

- Decision: `inbox/` funciona como porta de entrada para arquivos soltos com revisao obrigatoria por IA.
  Reason: Arquivos jogados ali precisam ser classificados/reescritos antes de serem integrados ao sistema.
  ADR needed: yes

- Decision: Nao gravar `_folder.json` dentro das pastas sincronizadas.
  Reason: Esses marcadores eram arquivos internos do CLI dentro da superficie editavel; a nova separacao deve manter arquivos de sistema fora das pastas de conteudo.
  ADR needed: no

## Files changed

- `specs/2026-06-02-organizar-workspace-sync-cli.md` - spec viva BuilderFlow.
- `docs/ADR.md` - ADR-004 proposta para o novo layout do workspace sync CLI.
- `apps/sync-agent/src/lib/workspace.ts` - helpers iniciais para `.doit-sync/` e pastas especiais lowercase.
- `apps/sync-agent/src/commands/init.ts` - cria a nova estrutura e README local.
- `apps/sync-agent/src/commands/pull.ts` - grava estado em `.doit-sync/` e nao cria `_folder.json`.
- `apps/sync-agent/src/commands/diff.ts` - ignora `.doit-sync/` e grava pendencias/snapshots no novo layout.
- `apps/sync-agent/src/commands/push.ts` - atualiza manifest e pendencias no novo layout.
- `apps/sync-agent/src/commands/status.ts` - le status e Drive index do novo layout.
- `apps/sync-agent/src/commands/drive.ts` - salva cache de Drive em `.doit-sync/system/drive-cache`.
- `apps/sync-agent/src/drive/reconcile.ts` - ignora `.doit-sync/` na varredura de Markdown.
- `apps/sync-agent/src/lib/agents-template.ts` - regras locais com `inbox/` obrigatoriamente revisada por IA.
- `apps/sync-agent/README.md` - documenta estrutura nova.
- `apps/web/src/app/(app)/settings/page.tsx` - mostra estrutura local nova na aba Sync.
- `apps/web/src/lib/path-resolver.ts` - aceita nomes especiais lowercase e legados.
- `apps/web/src/app/api/sync/push/route.ts` - evita criar pastas reais para nomes especiais lowercase.
- `specs/artifacts/2026-06-02-organizar-workspace-sync-cli/doitmd-sync-workspace-2026-06-02.png` - evidencia visual.

## Validation

Commands run:

- [x] `pnpm --filter doit-sync type-check`
- [x] `pnpm --filter doit-sync build`
- [x] `pnpm --filter @doit/web type-check`
- [x] `doit-sync init` funcional em diretorio temporario com `APPDATA` isolado

Results:

- `pnpm --filter doit-sync type-check` - passed.
- `pnpm --filter doit-sync build` - passed.
- `pnpm --filter @doit/web type-check` - passed.
- Init temporario criou `.doit-sync/`, `arquivo/`, `inbox/`, `proximos/`, `AGENTS.md` e `README.md`; dentro de `.doit-sync/` criou `changes/`, `raw-archive/` e `system/`.
- Busca final nao encontrou `_system`, `_changes`, `_raw_archive` ou `_folder.json` nos arquivos relevantes; restaram apenas aliases legados em `path-resolver`/push.

Frontend evidence:

- Servidor: `pnpm --dir apps/web exec next dev -p 3000`, listener PID 19532.
- Tela validada: `/settings?tab=sync` com usuario QA local `example.invalid`.
- Screenshot: `specs/artifacts/2026-06-02-organizar-workspace-sync-cli/doitmd-sync-workspace-2026-06-02.png`.
- Copia global: `G:\Meu Drive\.agentes\doitmd-sync-workspace-2026-06-02.png`.
- Shutdown: `Stop-Process -Id 19532 -Force`; porta 3000 sem listener apos encerramento.

## Risks

- Risk: Workspaces antigos podem ter arquivos locais ainda nao enviados.
  Mitigation: Usuario confirmou que removeu o workspace antigo; fallback/migracao ficou fora do escopo.

- Risk: Caminhos de manifest mudarem e gerarem falsos `moved`.
  Mitigation: Manter `localPath` relativo a area editavel, nao a raiz de sistema.

- Risk: Sem `_folder.json`, renomear uma pasta vazia localmente pode ser detectado como delete/create em vez de rename.
  Mitigation: Aceito para manter arquivos internos fora das pastas sincronizadas; pastas com itens continuam tendo os itens como evidencias de organizacao, e a Auditoria ainda revisa mudancas estruturais.

## Next step

Review PR #52 and merge `dev` into `main` after approval.
