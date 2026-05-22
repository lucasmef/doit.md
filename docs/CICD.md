# CI/CD - Doit

## Arquitetura

O Doit roda no mesmo VPS do Salomao usando o self-hosted runner do GitHub Actions, systemd e o Nginx do host.

Nao usar o `docker-compose.yml` para producao neste VPS compartilhado, porque ele tenta subir um Nginx proprio nas portas `80/443`.

## Ambientes ativos

| Estado | Onde fica | Funcao | Deploy |
| --- | --- | --- | --- |
| dev local | Maquina local | Desenvolvimento e homologacao local | Nao |
| dev git | Branch `dev` no GitHub | Integracao e gates | Nao |
| main git | Branch `main` no GitHub | Fonte de producao | Sim |
| main vps | `/srv/doit/prod/app` na VPS | Runtime de producao | Sim |

Nao existe ambiente `dev` ativo na VPS no fluxo padrao. Qualquer arquivo legado de `dev` na VPS e historico ou auxiliar de rollback, nao uma etapa normal de deploy.

## Fluxo

```text
mexe em dev local
  -> homologa local
  -> commit/push para dev git
  -> quality gate
  -> security gate
  -> merge para main git
  -> deploy main na VPS
  -> systemd restart doit.service
  -> healthcheck http://127.0.0.1:8110/api/health
  -> tag prod-YYYY.MM.DD-rN
```

## Gates

Push ou PR em `dev` roda validacoes sem publicar nada na VPS:

```text
dev git
  -> typecheck
  -> lint incremental
  -> build
  -> audit de dependencias
  -> scan de secrets
```

Deploy de producao acontece a partir de `main`:

```text
push main ou workflow_dispatch Deploy PROD
  -> quality gate em main
  -> security gate em main
  -> rsync para /srv/doit/prod/app
  -> scripts/deploy.sh prod
```

## Arquivos de runtime

Os valores reais ficam fora do repositorio:

```text
/srv/doit/prod/doit-config/web.env
```

Use `infra/env/web.env.example` como referencia. Nao commitar valores reais de `DATABASE_URL`, `NEXTAUTH_SECRET` ou Google OAuth.

## Systemd

Units versionadas:

```text
infra/systemd/doit.service
```

Instalacao no VPS:

```bash
sudo install -m 644 infra/systemd/doit.service /etc/systemd/system/doit.service
sudo systemctl daemon-reload
sudo systemctl enable doit.service
```

Logs:

```bash
sudo journalctl -u doit.service -f
```

## Nginx

Templates versionados:

```text
infra/nginx/sites-available/doit.conf
```

Regras:

- `doit.conf` e publico e aponta para `127.0.0.1:8110`.
- Nao criar host publico para dev.
- Sempre rodar `nginx -t` antes de `systemctl reload nginx`.
