# Setup VPS - Doit

Este setup assume que o Doit vai rodar no mesmo VPS do Salomao.

## Premissas

- Nginx do host ja existe e continua sendo o unico processo nas portas publicas `80/443`.
- O Doit web roda por systemd em loopback.
- Doit prod usa porta local `8110`.
- Nao existe dev ativo na VPS no fluxo padrao; `dev` e local/Git.
- Segredos ficam fora do repositorio.

## Estrutura esperada

```text
/srv/doit/prod/app
/srv/doit/prod/doit-config/web.env
```

## Dependencias

O servidor precisa de Node.js, pnpm, rsync, Nginx, Certbot, PostgreSQL client/libs e systemd.

```bash
command -v node
command -v pnpm
command -v rsync
command -v nginx
command -v certbot
command -v psql
```

## Arquivos de ambiente

Use `infra/env/web.env.example` como base:

```bash
sudo install -d -m 700 -o salomao -g salomao /srv/doit/prod/doit-config
sudo install -m 600 -o salomao -g salomao infra/env/web.env.example /srv/doit/prod/doit-config/web.env
```

Depois preencher os valores reais no VPS:

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
RESEND_API_KEY
EMAIL_FROM
```

`NOTIFICATION_LOOKAHEAD_MINUTES` controla a janela de busca de lembretes com horario; o padrao recomendado e `5`.

Os lembretes sao disparados por `doit-reminders.timer`, que executa a cada minuto e chama `/api/notifications/reminders` localmente usando o `CRON_SECRET` do `web.env`. A agenda do Google e sincronizada por `doit-calendar-sync.timer` a cada 10 minutos, chamando `/api/calendar/sync/cron` com o mesmo segredo. Veja a secao Systemd abaixo. Caso prefira disparar de outro lugar:

```bash
curl -X POST https://<doit-public-domain>/api/notifications/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"

curl -X POST https://<doit-public-domain>/api/calendar/sync/cron \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Systemd

O script `infra/scripts/install-doit-systemd-units-root.sh` instala todos os units (web e timers de lembrete) e habilita os timers. Para fazer manualmente:

```bash
sudo install -m 644 infra/systemd/doit.service /etc/systemd/system/doit.service
sudo install -m 644 infra/systemd/doit-reminders.service /etc/systemd/system/doit-reminders.service
sudo install -m 644 infra/systemd/doit-reminders.timer /etc/systemd/system/doit-reminders.timer
sudo install -m 644 infra/systemd/doit-calendar-sync.service /etc/systemd/system/doit-calendar-sync.service
sudo install -m 644 infra/systemd/doit-calendar-sync.timer /etc/systemd/system/doit-calendar-sync.timer
sudo systemctl daemon-reload
sudo systemctl enable doit.service
sudo systemctl enable --now doit-reminders.timer doit-calendar-sync.timer
```

Para inspecionar:

```bash
systemctl list-timers 'doit*'
journalctl -u doit-reminders.service -n 50
journalctl -u doit-calendar-sync.service -n 50
```

## Nginx

Producao publica:

```bash
sudo install -m 644 infra/nginx/sites-available/doit.conf /etc/nginx/sites-available/doit
# substituir DOIT_PUBLIC_DOMAIN antes de habilitar
sudo nginx -t
```

## Healthchecks

```bash
curl --fail http://127.0.0.1:8110/api/health
```

## Rollback

Para remover somente o Doit sem tocar no Salomao:

```bash
sudo systemctl stop doit.service
sudo systemctl disable doit.service
sudo rm -f /etc/nginx/sites-enabled/doit
sudo nginx -t
sudo systemctl reload nginx
```
