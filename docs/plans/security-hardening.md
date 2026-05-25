# PRD - Hardening de Seguranca: Auth, API Publica e Abuse Protection

**Status:** Proposto
**Data:** 2026-05-11
**Autor:** Lucas
**Componentes afetados:** `apps/web` (auth, middleware, route handlers), `packages/db` (possivel tabela de rate limit/audit), infraestrutura de deploy

---

## 1. Contexto

O doit.md ja possui uma base de seguranca funcional para uso pessoal:

- Autenticacao por NextAuth Credentials.
- Senhas com bcrypt.
- Sessao JWT com expiracao.
- APIs protegidas por `auth()` ou `authWithCli()` na maioria dos endpoints.
- Tokens CLI com segredo aleatorio, hash no banco e comparacao timing-safe.
- Sync com aprovacao por risco para mudancas sensiveis.
- Cron de notificacoes protegido por `CRON_SECRET`.

Ainda assim, para rodar o app exposto publicamente, existem lacunas importantes:

- Nao ha rate limit explicito para login, cadastro, tokens CLI ou endpoints de escrita.
- Cadastro publico permite abuso e enumeracao de email.
- Callback OAuth Google usa `state` como `userId`, sem nonce assinado/armazenado.
- Tokens Google ficam armazenados no banco sem criptografia em repouso.
- Nao ha configuracao explicita de security headers como CSP, frame protection e referrer policy.
- Endpoints mutaveis com sessao por cookie nao possuem uma camada propria de protecao CSRF/origin.

## 2. Objetivo

Elevar o nivel de seguranca do doit.md para um padrao adequado a deploy publico de um app pessoal com dados privados, reduzindo risco de:

- brute force e credential stuffing;
- abuso de cadastro;
- uso indevido da API publica;
- CSRF em operacoes autenticadas;
- sequestro ou vinculacao indevida de OAuth;
- exposicao de tokens sensiveis em caso de vazamento do banco;
- hardening incompleto de browser/security headers.

## 3. Nao objetivos

- Criar um sistema multi-tenant empresarial.
- Implementar SSO corporativo, passkeys ou MFA nesta fase.
- Substituir NextAuth.
- Criar WAF proprio.
- Mudar o modelo de dados principal de items, folders, audit ou sync.
- Fazer varredura completa de infraestrutura, VPS ou secrets historicos.

## 4. Usuarios e atores

| Ator | Necessidade |
|---|---|
| Usuario dono do app | Entrar e usar o app sem atrito excessivo, com protecao contra abuso externo. |
| CLI `doit-sync` | Continuar acessando endpoints permitidos com Bearer token revogavel. |
| Job agendado de notificacoes | Continuar chamando endpoint cron com segredo dedicado. |
| Atacante anonimo | Deve ser limitado em login, cadastro e APIs publicas. |
| Atacante com token CLI vazado | Deve ter impacto contido por revogacao, auditoria e limites. |

## 5. Escopo

### In-scope

- Rate limit para login, cadastro e endpoints sensiveis.
- Politica de cadastro publico controlavel por variavel de ambiente.
- Protecao contra enumeracao de emails no cadastro e login.
- OAuth Google com `state` seguro baseado em nonce.
- Criptografia em repouso para tokens OAuth Google.
- Security headers no Next.js.
- Validacao de Origin/Host para metodos mutaveis autenticados por cookie.
- Revisao da superficie publica da API.
- Logs de seguranca sem expor segredos.
- Testes unitarios/integracao para fluxos criticos.

### Out-of-scope V1

- MFA.
- Passkeys/WebAuthn.
- Captcha.
- Device management detalhado.
- Rotacao automatica de refresh tokens Google.
- SIEM externo.
- Regras de WAF no provedor.

## 6. Requisitos funcionais

### 6.1 Rate limit

Implementar uma camada reutilizavel de rate limit em `apps/web/src/lib/rate-limit.ts`.

Regras iniciais:

| Area | Chave | Limite sugerido | Janela | Resposta |
|---|---|---:|---:|---|
| Login Credentials | IP + email normalizado | 5 falhas | 15 min | 429 |
| Cadastro | IP | 3 criacoes/tentativas | 1 hora | 429 |
| Criacao de CLI token | userId | 10 criacoes | 1 hora | 429 |
| Validacao Bearer CLI invalido | prefix/IP | 30 falhas | 15 min | 429 |
| Upload Drive | userId | 20 uploads | 1 hora | 429 |
| Sync push/pending-batch | userId/token | 60 chamadas | 1 hora | 429 |

Criticos:

- Nao registrar senha, token ou corpo sensivel em logs.
- Usar IP real a partir de headers confiaveis do deploy (`x-forwarded-for` somente se proxy for confiavel).
- Funcionar em SQLite local e Postgres em producao, ou usar fallback in-memory apenas em desenvolvimento.
- Retornar `Retry-After` quando aplicavel.

### 6.2 Cadastro publico controlado

Adicionar variavel:

```env
AUTH_REGISTRATION_MODE=closed | invite | open
```

Comportamento:

- `closed`: `POST /api/auth/register` retorna 404 ou erro generico controlado.
- `invite`: exige token de convite valido.
- `open`: permite cadastro, com rate limit.

Padrao recomendado para producao: `closed`.

Evitar enumeracao:

- Mensagens de cadastro nao devem confirmar diretamente se um email ja existe.
- Login deve continuar retornando erro generico para credenciais invalidas.

### 6.3 OAuth Google seguro

Substituir `state=userId` por fluxo com nonce:

1. Usuario autenticado chama `GET /api/google`.
2. Servidor gera `state` aleatorio e associa a `userId`, expiracao curta e finalidade `google-oauth`.
3. Callback valida `state`, expiracao e uso unico.
4. Callback grava tokens somente para o `userId` associado ao nonce.

Opcoes de armazenamento:

- Cookie HTTP-only, SameSite=Lax, assinado; ou
- tabela curta `oauth_states` com hash do state e expiracao.

Requisitos:

- State expira em no maximo 10 minutos.
- State e de uso unico.
- Callback sem state valido nao grava conta Google.

### 6.4 Criptografia de tokens Google

Criptografar `accessToken` e `refreshToken` antes de salvar em `google_accounts`.

Variavel:

```env
TOKEN_ENCRYPTION_KEY=<base64-32-bytes>
```

Requisitos:

- Usar algoritmo autenticado, como AES-256-GCM.
- Armazenar IV/nonce e auth tag junto com ciphertext.
- Falhar fechado se a chave estiver ausente em producao.
- Suportar migracao gradual: ler token legado plaintext, regravar criptografado no proximo refresh ou conexao.

### 6.5 Security headers

Adicionar headers globais no `next.config.ts` ou middleware:

- `Content-Security-Policy`
- `X-Frame-Options: DENY` ou equivalente via CSP `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy`
- `Strict-Transport-Security` somente em producao HTTPS

O CSP deve permitir apenas o necessario para:

- Next.js app;
- Google OAuth/Calendar/Drive quando aplicavel;
- web push;
- assets locais.

### 6.6 CSRF e Origin checks

Para endpoints mutaveis autenticados por cookie:

- validar `Origin` ou `Referer` contra `NEXTAUTH_URL`/host publico;
- aplicar apenas em metodos `POST`, `PATCH`, `DELETE`, `PUT`;
- nao bloquear requests Bearer CLI validos;
- retornar 403 em origem invalida.

Endpoints afetados incluem items, folders, areas, profile, sync approve/reject/push via web, push subscriptions, Google disconnect e upload.

### 6.7 Superficie publica da API

Manter como publicos apenas:

- `/api/auth/[...nextauth]`
- `/api/auth/register` quando habilitado
- `/api/google/callback`
- `/api/health`
- `/api/icon/[size]`
- `/api/notifications/reminders` com `CRON_SECRET`

Todos os demais endpoints devem validar:

- sessao web; ou
- Bearer CLI, somente quando a rota realmente precisar suportar CLI.

Criar teste ou script de auditoria que liste route handlers sem chamada a auth conhecida, com allowlist explicita.

### 6.8 Logs e auditoria de seguranca

Registrar eventos sem dados sensiveis:

- login falho agregado por email hash/IP;
- rate limit acionado;
- cadastro bloqueado;
- token CLI criado/revogado;
- callback OAuth com state invalido;
- upload bloqueado por limite.

Nao registrar:

- senha;
- Bearer token;
- refresh/access token Google;
- conteudo de notas;
- corpo de requests de sync.

## 7. Requisitos nao funcionais

- Latencia adicional do rate limit: p95 menor que 30 ms em Postgres.
- Compatibilidade com SQLite local para desenvolvimento.
- Nenhum servidor persistente deve ser necessario para testes automatizados.
- Mudancas devem preservar o uso offline/PWA existente.
- O CLI `doit-sync` deve continuar funcionando sem cookies.

## 8. Criterios de aceite

- [ ] Login com credenciais erradas repetidas retorna 429 apos o limite configurado.
- [ ] Cadastro pode ser desativado por env var em producao.
- [ ] Cadastro/login nao confirmam de forma direta se um email existe.
- [ ] `/api/google/callback` nao grava tokens sem `state` valido e nao reutilizado.
- [ ] Tokens Google novos sao salvos criptografados no banco.
- [ ] Tokens Google legados sao migrados ou tratados sem quebrar usuarios existentes.
- [ ] Endpoints mutaveis rejeitam Origin externo quando autenticados por cookie.
- [ ] Requests CLI com Bearer valido continuam funcionando nas rotas suportadas.
- [ ] Headers de seguranca aparecem em resposta de pagina privada e publica.
- [ ] Existe allowlist documentada de APIs publicas.
- [ ] Teste/script detecta route handler novo sem auth e fora da allowlist.

## 9. Fases de implementacao

### Fase 1 - Rate limit e cadastro

- Criar helper de rate limit.
- Aplicar em login/cadastro.
- Adicionar `AUTH_REGISTRATION_MODE`.
- Ajustar mensagens para reduzir enumeracao.
- Testes focados em 429 e cadastro fechado.

### Fase 2 - API hardening

- Criar helper de `requireSameOriginForCookieMutation`.
- Aplicar em endpoints mutaveis.
- Criar allowlist de rotas publicas.
- Criar script/teste de auditoria de route handlers.

### Fase 3 - OAuth seguro

- Implementar nonce/state seguro.
- Validar expiracao e uso unico.
- Remover dependencia de `state=userId`.
- Testar callback sem state, state expirado e state reutilizado.

### Fase 4 - Criptografia de tokens

- Criar helper de encrypt/decrypt.
- Criptografar tokens Google novos.
- Suportar migracao de tokens legados.
- Atualizar `.env.example`.

### Fase 5 - Headers e verificacao final

- Adicionar security headers.
- Revisar CSP com fluxos Google e PWA.
- Rodar typecheck/build.
- Documentar operacao segura em `docs/VPS_SETUP.md` ou documento de deploy.

## 10. Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Rate limit in-memory falhar em deploy multi-instancia | Usar Postgres em producao ou adaptador externo no futuro. |
| CSP quebrar OAuth/PWA | Entregar CSP em modo conservador, testar Google connect e service worker. |
| CSRF check bloquear CLI | Bypassar apenas quando Bearer CLI for valido. |
| Criptografia quebrar tokens existentes | Implementar leitura legado + regravacao criptografada gradual. |
| Cadastro fechado bloquear setup inicial | Permitir `AUTH_REGISTRATION_MODE=open` no primeiro deploy, documentar voltar para `closed`. |

## 11. Metricas de sucesso

- Zero endpoints privados sem auth fora da allowlist.
- 100% dos fluxos de auth abusivos testados retornam 429/403 conforme esperado.
- Nenhum token Google novo persistido em plaintext.
- CLI continua passando smoke test de login/pull/diff/push em ambiente autenticado.
- Build e typecheck do web passam apos as mudancas.

## 12. Perguntas abertas

- O deploy de producao usara Postgres sempre, ou precisa rate limit duravel tambem em SQLite?
- Cadastro deve ser totalmente fechado ou por convite?
- A criptografia dos tokens deve exigir rotacao planejada de chave ja na V1?
- Existe proxy reverso fixo para confiar em `x-forwarded-for`?
