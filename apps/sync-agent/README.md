# doit-sync

CLI sync agent para [doit.md](https://doit.md) — sincroniza suas notas e tarefas como arquivos Markdown organizados em pastas, prontos pra serem editados manualmente ou por IAs (Claude Code, Cursor, etc).

## Instalação

```sh
npm install -g doit-sync
```

Requer Node.js >= 20.

## Setup inicial

### 1. Gerar um token CLI

No app doit.md, vá em **Configurações → CLI** e clique em **+ Novo token**. Copie o token (formato `doit_<prefix>_<secret>`) — ele só aparece uma vez.

### 2. Inicializar workspace local

```sh
doit-sync init
# ou com caminho customizado:
doit-sync init ~/Notes/doit
```

Cria a pasta com `AGENTS.md` (regras pra IA), `README.md` e diretórios de sistema.

### 3. Autenticar

```sh
doit-sync login
```

Cole o token quando pedido. Pra apontar pra outra instância (self-hosted):

```sh
doit-sync login --api-url https://meu-doit.example.com
```

### 4. Baixar workspace

```sh
doit-sync pull
```

## Comandos

| Comando | Descrição |
|---|---|
| `doit-sync init [path]` | Cria a pasta local do workspace |
| `doit-sync login` | Autentica com um CLI token do app |
| `doit-sync pull` | Baixa pastas e itens do servidor pra arquivos `.md` |
| `doit-sync diff` | Detecta alterações locais e envia pra **Auditoria** no app |
| `doit-sync push` | Aplica mudanças aprovadas no app |
| `doit-sync status` | Mostra estado atual do workspace |

## Estrutura do workspace

Após `doit-sync pull`:

```
workspace-doitmd/
├── AGENTS.md            # regras pra IA editar (não apagar)
├── README.md
├── Inbox/               # itens sem pasta (notas, tarefas sem data)
├── Proximos/            # tarefas com data sem pasta
├── Arquivo/             # itens arquivados
├── Trabalho/            # pastas reais espelhadas do app
│   └── Cliente A/
├── _system/             # estado interno (não editar)
└── _changes/            # mudanças locais pendentes
```

## Frontmatter

Cada `.md` tem frontmatter YAML:

```md
---
id: itm_xxx              # NUNCA alterar
title: Reunião kickoff
complexity: task         # task | note
status: todo             # inbox | todo | doing | waiting | done | archived
priority: 2              # 1 (alta) – 4 (baixa). Só para tasks.
dueDate: 2026-05-15
tags: [trabalho, urgente]
syncHash: abc123def      # NUNCA alterar manualmente
updatedAt: 2026-05-10T14:00:00Z
---

Conteúdo livre em markdown.

- [ ] Subtarefa pendente
- [x] Subtarefa concluída
```

## Fluxo de edição com IA

1. Edite os `.md` manualmente ou peça pra uma IA reorganizar (Claude Code, Cursor, Copilot…). O `AGENTS.md` na raiz contém as regras que a IA deve seguir.
2. `doit-sync diff` — detecta alterações e envia pra tela de **Auditoria** no app.
3. Aprove cada mudança no app (ou rejeite as que não fazem sentido).
4. `doit-sync push` — aplica as mudanças aprovadas no servidor. Snapshot da versão anterior é salvo automaticamente; é possível restaurar via Auditoria.

Mudanças de risco alto (delete) sempre exigem aprovação. Edições de conteúdo, tags e movimentos entre pastas vão direto após aprovação.

## Tipos de mudanças detectadas

| Tipo | Quando | Risco |
|---|---|---|
| `created` | Arquivo novo (sem `id` ou com `id` desconhecido) | low |
| `content_changed` | Hash do conteúdo divergente | low |
| `frontmatter_changed` | Campos do YAML mudaram | medium |
| `moved` | Caminho do arquivo divergente | medium |
| `deleted` | Arquivo do manifest sumiu | high |

## Configuração

A config fica em `~/.config/doit-sync/config.json` (Linux/Mac) ou `%APPDATA%\doit-sync\Config\config.json` (Windows). Para desconectar:

```sh
# Manualmente apague a config ou use:
doit-sync login   # autentica de novo, sobrescrevendo
```

## Troubleshooting

**"Não autenticado. Execute: doit-sync login"** — o token não foi salvo ou foi revogado. Gere um novo no app.

**"Nenhum manifest encontrado"** — execute `doit-sync pull` antes de `diff`/`push`.

**"X mudança(s) de alto risco precisam de aprovação"** — abra a tela de Auditoria no app e aprove (ou rejeite) cada uma.

## Licença

MIT
