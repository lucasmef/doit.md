# Setup da VPS KingHost — Doit

---

## 1. Dependências do servidor

```bash
# Node.js 20 via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20

# pnpm
npm install -g pnpm@9

# PM2
npm install -g pm2
pm2 startup  # siga as instruções para iniciar no boot
```

---

## 2. Self-Hosted Runner (GitHub Actions)

O runner autentica o servidor no repositório — não há SSH externo nem secrets de credenciais.

```bash
# Criar pasta do runner
mkdir -p ~/actions-runner && cd ~/actions-runner

# Baixar (obter a versão e token em GitHub → Settings → Actions → Runners → New self-hosted runner)
curl -o actions-runner-linux-x64-2.x.x.tar.gz -L https://github.com/actions/runner/releases/...
tar xzf actions-runner-linux-x64-2.x.x.tar.gz

# Configurar (usar o token gerado na UI do GitHub)
./config.sh \
  --url https://github.com/SEU_USUARIO/SEU_REPO \
  --token TOKEN_GERADO_NO_GITHUB \
  --name "vps-kinghost" \
  --labels self-hosted \
  --unattended

# Instalar como serviço e iniciar
sudo ./svc.sh install
sudo ./svc.sh start

# Verificar status
sudo ./svc.sh status
```

> O runner fica ouvindo e executa os workflows diretamente na VPS, sem SSH externo.

---

## 3. Estrutura de diretórios

```bash
# Clonar o repositório para DEV e PROD
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /var/www/doit-dev
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /var/www/doit

# Checar branch dev em ambos
cd /var/www/doit-dev && git checkout dev
cd /var/www/doit     && git checkout dev
```

---

## 4. Arquivos `.env.local`

Criar manualmente em cada pasta (nunca commitar):

**`/var/www/doit-dev/apps/web/.env.local`**
```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://dev.seudominio.com.br/api/google/callback
```

**`/var/www/doit/apps/web/.env.local`**
```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://seudominio.com.br/api/google/callback
```

---

## 5. Primeiro build manual

```bash
# DEV
cd /var/www/doit-dev
pnpm install --frozen-lockfile
pnpm --filter @doit/web build

# PROD
cd /var/www/doit
pnpm install --frozen-lockfile
pnpm --filter @doit/web build
```

---

## 6. Iniciar processos com PM2

```bash
# DEV — porta 3001
pm2 start "pnpm --filter @doit/web start -- -p 3001" \
  --name doit-dev \
  --cwd /var/www/doit-dev

# PROD — porta 3000
pm2 start "pnpm --filter @doit/web start -- -p 3000" \
  --name doit-prod \
  --cwd /var/www/doit

# Salvar para reinício automático
pm2 save
```

---

## 7. Nginx (proxy reverso + SSL)

```nginx
# /etc/nginx/sites-available/doit-dev
server {
    listen 80;
    server_name dev.seudominio.com.br;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# /etc/nginx/sites-available/doit-prod
server {
    listen 80;
    server_name seudominio.com.br;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/doit-dev  /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/doit-prod /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d dev.seudominio.com.br -d seudominio.com.br
```

---

## 8. Testar healthcheck

```bash
curl http://localhost:3001/api/health   # → {"status":"ok"}
curl http://localhost:3000/api/health   # → {"status":"ok"}
```

---

## O que NÃO é necessário

- ❌ GitHub Secrets de SSH
- ❌ Chaves SSH entre GitHub e VPS
- ❌ `appleboy/ssh-action` ou similares
- ❌ Tokens em variáveis de ambiente do GitHub

O runner já roda autenticado na VPS. As variáveis de ambiente ficam nos arquivos `.env.local` locais.
