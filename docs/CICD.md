# CI/CD - Doit

## Arquitetura

O Doit roda no mesmo VPS do Salomao usando o self-hosted runner do GitHub Actions, systemd e o Nginx do host.

Nao usar o `docker-compose.yml` para producao neste VPS compartilhado, porque ele tenta subir um Nginx proprio nas portas `80/443`.

## Ambientes

| Ambiente | Checkout | Service | Porta local | Exposicao |
| --- | --- | --- | --- | --- |
| prod | `/srv/doit/prod/app` | `doit.service` | `8110` | publico via dominio Doit |
| dev | `/srv/doit/dev/app` | `doit-dev.service` | `8111` | somente Tailscale |

O ambiente dev nao deve ter dominio publico. O acesso esperado e via Tailscale, por exemplo:

```text
https://TAILSCALE_HOST:8444
```

## Fluxo

```text
push dev
  -> quality gate
  -> security gate
  -> rsync para /srv/doit/dev/app
  -> scripts/deploy.sh dev
  -> systemd restart doit-dev.service
  -> healthcheck http://127.0.0.1:8111/api/health

workflow_dispatch Deploy PROD
  -> quality gate na branch dev
  -> security gate na branch dev
  -> promove dev para main
  -> rsync para /srv/doit/prod/app
  -> scripts/deploy.sh prod a partir da branch main
  -> systemd restart doit.service
  -> healthcheck http://127.0.0.1:8110/api/health
  -> tag prod-YYYY.MM.DD-rN
```

## Arquivos de runtime

Os valores reais ficam fora do repositorio:

```text
/srv/doit/prod/doit-config/web.env
/srv/doit/dev/doit-config/web.env
```

Use `infra/env/web.env.example` como referencia. Nao commitar valores reais de `DATABASE_URL`, `NEXTAUTH_SECRET` ou Google OAuth.

## Systemd

Units versionadas:

```text
infra/systemd/doit.service
infra/systemd/doit-dev.service
```

Instalacao no VPS:

```bash
sudo install -m 644 infra/systemd/doit.service /etc/systemd/system/doit.service
sudo install -m 644 infra/systemd/doit-dev.service /etc/systemd/system/doit-dev.service
sudo systemctl daemon-reload
sudo systemctl enable doit.service doit-dev.service
```

Logs:

```bash
sudo journalctl -u doit.service -f
sudo journalctl -u doit-dev.service -f
```

## Nginx

Templates versionados:

```text
infra/nginx/sites-available/doit.conf
infra/nginx/sites-available/doit-dev-tailscale.conf
```

Regras:

- `doit.conf` e publico e aponta para `127.0.0.1:8110`.
- `doit-dev-tailscale.conf` escuta somente no IP Tailscale e aponta para `127.0.0.1:8111`.
- Nao criar host publico para dev.
- Sempre rodar `nginx -t` antes de `systemctl reload nginx`.
