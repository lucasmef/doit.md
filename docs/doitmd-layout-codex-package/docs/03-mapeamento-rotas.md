# Mapeamento sugerido de rotas e telas

Este mapeamento deve ser conferido com o projeto real antes de implementar.

## Desktop

| Mockup | Rota provável | Observação |
|---|---|---|
| `desktop/01-dashboard.html` | `/today` ou nova visão `/dashboard` | Pode substituir/expandir Hoje com visão bento. |
| `desktop/02-itens.html` | `/today`, `/upcoming`, filtros de itens | Representa lista/board de Itens, não apenas tarefas. |
| `desktop/03-notas.html` | `/notas` ou `/notas/[folderId]` | Biblioteca de notas por pasta/tag. |
| `desktop/04-notas-alternativa.html` | `/notas` variação | Usar como alternativa caso a primeira fique densa. |
| `desktop/05-editor.html` | `/items/[id]` ou detalhe lateral/fullscreen | Editor markdown com sidebar/outline. |
| `desktop/06-editor-toolbar.html` | `/items/[id]` | Editor com toolbar e menu slash. |

## Mobile

| Mockup | Rota provável | Observação |
|---|---|---|
| `mobile/01-dashboard-mobile.html` | `/today` | Stack bento mobile. |
| `mobile/02-itens-mobile.html` | `/today` / `/upcoming` | Itens com tabs e bottom nav. |
| `mobile/03-notas-mobile.html` | `/notas` | Notas com chips de pastas e lista. |

## Navegação

Desktop pode manter navegação superior ou lateral conforme o estado atual do app.

Mobile deve priorizar bottom nav:

- Hoje
- Itens
- Novo Item
- Notas
- Agenda

## Observação técnica

Não criar rotas novas antes de mapear o que já existe. O primeiro trabalho do Codex deve ser análise + plano.
