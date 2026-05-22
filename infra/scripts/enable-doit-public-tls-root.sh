#!/usr/bin/env bash
# Enable public HTTPS for Doit production on the VPS.

set -euo pipefail

DOMAIN="${1:-doit.raquel-talita.vps-kinghost.net}"
WEBROOT="${WEBROOT:-/var/www/letsencrypt}"
EMAIL="${CERTBOT_EMAIL:-admin@$DOMAIN}"

install -d -m 755 "$WEBROOT"

cat > /etc/nginx/sites-available/doit-public-http <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/doit-public-http /etc/nginx/sites-enabled/doit-public-http
nginx -t
systemctl reload nginx

certbot certonly \
  --webroot \
  -w "$WEBROOT" \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL"

sed "s/DOIT_PUBLIC_DOMAIN/$DOMAIN/g" \
  /srv/doit/prod/app/infra/nginx/sites-available/doit.conf \
  > /etc/nginx/sites-available/doit

ln -sfn /etc/nginx/sites-available/doit /etc/nginx/sites-enabled/doit
nginx -t
systemctl reload nginx

echo "Public TLS enabled for $DOMAIN."
