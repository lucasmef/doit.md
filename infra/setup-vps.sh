#!/usr/bin/env bash
# Setup inicial do VPS KingHost para o Clarity
# Execute como root: bash setup-vps.sh SEU_DOMINIO.com.br

set -euo pipefail

DOMAIN="${1:?Uso: bash setup-vps.sh SEU_DOMINIO.com.br}"
APP_DIR="/opt/clarity"
REPO_URL="${2:-}" # opcional: URL do repositório Git

echo "======================================================"
echo " Clarity — Setup VPS"
echo " Domínio: $DOMAIN"
echo "======================================================"

# ── 1. Atualiza sistema ────────────────────────────────────
echo ""
echo "→ Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Instala Docker ─────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "→ Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "→ Docker já instalado: $(docker --version)"
fi

# ── 3. Instala Certbot (Let's Encrypt) ────────────────────
if ! command -v certbot &>/dev/null; then
  echo "→ Instalando Certbot..."
  apt-get install -y -qq certbot
fi

# ── 4. Cria diretório do app ──────────────────────────────
echo "→ Criando $APP_DIR..."
mkdir -p "$APP_DIR"

if [ -n "$REPO_URL" ]; then
  if [ ! -d "$APP_DIR/.git" ]; then
    git clone "$REPO_URL" "$APP_DIR"
  else
    echo "→ Repositório já clonado."
  fi
fi

# ── 5. Cria .env de produção ──────────────────────────────
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "→ Criando .env (preencha os valores)..."
  cat > "$ENV_FILE" <<EOF
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/clarity?retryWrites=true&w=majority
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://${DOMAIN}/api/google/callback
EOF
  echo ""
  echo "⚠️  IMPORTANTE: edite $ENV_FILE com os valores reais antes de continuar."
  echo "   nano $ENV_FILE"
  echo ""
fi

# ── 6. Substitui domínio no Nginx ────────────────────────
NGINX_CONF="$APP_DIR/infra/nginx/conf.d/clarity.conf"
if [ -f "$NGINX_CONF" ]; then
  sed -i "s/SEU_DOMINIO.com.br/$DOMAIN/g" "$NGINX_CONF"
  echo "→ Nginx configurado para $DOMAIN"
fi

# ── 7. Obtém certificado SSL ─────────────────────────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "→ Obtendo certificado SSL para $DOMAIN..."
  # Para o nginx antes de obter o cert (porta 80 precisa estar livre)
  docker compose -f "$APP_DIR/docker-compose.yml" stop nginx 2>/dev/null || true
  certbot certonly --standalone \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos \
    --email "admin@$DOMAIN"
  echo "→ Certificado obtido."
else
  echo "→ Certificado SSL já existe."
fi

# ── 8. Configura renovação automática ────────────────────
if ! crontab -l 2>/dev/null | grep -q certbot; then
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -C $APP_DIR restart nginx") | crontab -
  echo "→ Renovação automática de SSL configurada."
fi

# ── 9. Configura chave SSH para GitHub Actions ───────────
SSH_KEY_FILE="/root/.ssh/clarity_deploy"
if [ ! -f "$SSH_KEY_FILE" ]; then
  echo "→ Gerando chave SSH para CI/CD..."
  ssh-keygen -t ed25519 -C "clarity-deploy" -f "$SSH_KEY_FILE" -N ""
  cat "$SSH_KEY_FILE.pub" >> /root/.ssh/authorized_keys
  echo ""
  echo "======================================================"
  echo " Chave privada para adicionar em GitHub Actions Secrets"
  echo " (Settings → Secrets → VPS_SSH_KEY):"
  echo "======================================================"
  cat "$SSH_KEY_FILE"
  echo "======================================================"
fi

echo ""
echo "======================================================"
echo " Setup concluído! Próximos passos:"
echo ""
echo " 1. Preencha as variáveis: nano $ENV_FILE"
echo " 2. Configure os secrets no GitHub Actions:"
echo "    VPS_HOST = IP do VPS"
echo "    VPS_USER = root"
echo "    VPS_SSH_KEY = (conteúdo exibido acima)"
echo "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_..."
echo ""
echo " 3. Primeiro deploy manual:"
echo "    cd $APP_DIR"
echo "    docker compose build --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... app"
echo "    docker compose up -d"
echo ""
echo " Após isso, todo push para master faz deploy automático."
echo "======================================================"
