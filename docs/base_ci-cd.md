# Resumo do CI/CD - Gestor Financeiro

Este documento resume a arquitetura de CI/CD do projeto para facilitar a replicação em outros contextos. O sistema é otimizado para aplicações Fullstack (FastAPI + React) hospedadas em VPS (Virtual Private Server) usando Linux/Systemd.

## 1. Arquitetura Geral
O fluxo é dividido em três camadas:
1.  **Qualidade (GitHub Actions):** Validação automática em cada Pull Request e Push para a branch de integração.
2.  **Sincronização (Scripts Shell + Git):** Atualização segura do código no servidor.
3.  **Deploy e Lifecycle (Systemd + Shell):** Build, migração e reinício do serviço no VPS.

---

## 2. Camada de Qualidade (`quality.yml`)
Antes de qualquer deploy, o código passa por validações rigorosas:
*   **Backend (Python + UV):**
    *   Usa o **`uv`** para gestão de pacotes ultrarrápida.
    *   **Linting Otimizado:** O script detecta apenas arquivos `.py` alterados e roda o `ruff` neles.
    *   **Testes:** Execução de `pytest`.
*   **Frontend (Node.js + Vite):**
    *   `npm run typecheck`: Garante integridade do TypeScript.
    *   `npm run build`: Valida se o build de produção está íntegro.

---

## 3. Estratégia de Deploy em VPS (`deploy-vps.sh`)
O deploy utiliza scripts robustos que gerenciam o ambiente Linux diretamente:

1.  **Build Local no Servidor:** O frontend é buildado no destino para evitar upload de artefatos grandes.
2.  **Sincronização de Dependências:** Script Python interno instala dependências do `pyproject.toml` no `.venv` do servidor.
3.  **Migrações Automáticas:** `alembic upgrade head` mantém o banco de dados sincronizado.
4.  **Gestão de Processos (Systemd):**
    *   Reinicia o serviço via `systemctl restart`.
    *   **Limpeza de Órfãos:** Função que identifica e mata processos Uvicorn pendurados na porta, evitando conflitos de bind.
5.  **Validação de Saúde (Healthcheck):** O deploy só é validado se o endpoint `/api/v1/health` responder positivamente em até 10 tentativas.

---

## 4. Governança de Dados
Workflow avançado para produtividade do desenvolvedor:
*   **Refresh Automático:** Workflow para copiar o banco de produção para dev.
*   **Sanitização (`sanitize-dev-db.sh`):** Limpeza automática de dados sensíveis (e-mails, chaves, senhas) após a cópia, garantindo conformidade com segurança/LGPD.

---

## 5. Boas Práticas para Novos Projetos
1.  **Gerenciador UV:** Use para velocidade máxima no CI.
2.  **Lint Incremental:** Não cheque o projeto inteiro se puder checar apenas o delta.
3.  **Deploy com Healthcheck:** Nunca assuma que o `restart` do serviço foi bem-sucedido sem testar o endpoint.
4.  **Sanitização de Dados:** Sempre limpe dados reais antes de disponibilizá-los em ambiente de desenvolvimento.
