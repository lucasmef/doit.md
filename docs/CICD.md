# CI/CD — Doit

## Arquitetura: Self-Hosted Runner + Systemd

Os workflows rodam **diretamente na VPS KingHost** por meio de um GitHub Actions Self-Hosted Runner.
A gestão de processos foi migrada de PM2/Docker para **Systemd** para maior robustez e integração com o sistema operacional.

```
GitHub Actions (workflow trigger)
        ↓
  Self-Hosted Runner (VPS)
        ↓
  scripts/deploy.sh (Executado localmente na VPS)
        ↓
  Systemd reinicia o serviço (doit-web ou doit-web-dev)
```

---

## Fluxo

```
local → push dev
           ↓
    Quality Gate (tsc, lint incremental, build)
    Security Gate (pnpm audit)
           ↓ OK
    Deploy DEV  → /var/www/doit-dev  → Systemd (doit-web-dev) → :3001
           ↓
    testes manuais em dev.seudominio.com.br
           ↓ OK
    GitHub Actions → Deploy PROD (workflow_dispatch)
    (digita "deploy" para confirmar)
           ↓
    Quality + Security Gate (na branch dev)
           ↓
    rsync /var/www/doit  → Systemd (doit-web) → :3000
           ↓
    tag prod-YYYY.MM.DD-rN criada automaticamente
```

---

## Workflows

| Arquivo | Trigger | Roda em | O que faz |
|---------|---------|---------|-----------|
| `quality.yml` | Push/PR + `workflow_dispatch` | self-hosted | tsc + lint incremental + build |
| `security.yml` | Push/PR + schedule + `workflow_dispatch` | self-hosted | pnpm audit |
| `deploy-dev.yml` | Push `dev` + `workflow_dispatch` | self-hosted | quality + security + deploy.sh dev |
| `deploy-prod.yml` | `workflow_dispatch` (manual) | self-hosted | confirmação + quality + security + deploy.sh prod + tag |

---

## Script de Deploy (`scripts/deploy.sh`)

O script unificado gerencia o ciclo de vida do deploy na VPS:
1. `pnpm install` e `pnpm build` no diretório alvo.
2. Limpeza de processos órfãos na porta alvo (evita conflitos de bind).
3. Reinício do serviço via `systemctl restart`.
4. Healthcheck robusto (polling de 10 tentativas) no endpoint `/api/health`.

---

## Configuração do Systemd (Manual na VPS)

Para configurar os serviços na VPS pela primeira vez:

```bash
# 1. Copie os arquivos de serviço para o sistema
sudo cp infra/systemd/*.service /etc/systemd/system/

# 2. Recarregue o daemon do systemd
sudo systemctl daemon-reload

# 3. Habilite os serviços para iniciar no boot
sudo systemctl enable doit-web
sudo systemctl enable doit-web-dev

# 4. (Opcional) Inicie manualmente se necessário
sudo systemctl start doit-web
```

---

## Logs

Para visualizar os logs dos serviços:
```bash
# Produção
sudo journalctl -u doit-web -f

# Desenvolvimento
sudo journalctl -u doit-web-dev -f
```
