# doit.md - pacote visual para Codex

Este pacote contém referências estáticas de layout para orientar o planejamento e a implementação incremental da nova interface do doit.md.

Os arquivos HTML foram separados por tela. Não há wrapper superior com menu de alternância entre telas. Abra cada arquivo diretamente no navegador.

## Estrutura

```txt
/doitmd-layout-codex-package
  /desktop
    01-dashboard.html
    02-itens.html
    03-notas.html
    04-notas-alternativa.html
    05-editor.html
    06-editor-toolbar.html
  /mobile
    01-dashboard-mobile.html
    02-itens-mobile.html
    03-notas-mobile.html
  /docs
    01-contexto-produto.md
    02-diretrizes-visuais.md
    03-mapeamento-rotas.md
    04-plano-implementacao.md
    05-mobile.md
    06-checklist-validacao.md
  PROMPT-CODEX.md
  manifest.json
```

## Intenção

Usar estes HTMLs como referência visual e estrutural, não como código final de produção.

O objetivo é aproximar a UI real do doit.md do estilo bento/glassmorphism dos modelos, preservando a arquitetura existente do projeto.

## Restrições importantes

- Não introduzir `projects` ou `areas` como conceito visual principal.
- Usar `pastas` como agrupador visual de organização.
- A entidade central do produto é `Item`.
- Um Item pode representar tarefa, nota, evento, captura, referência ou arquivo markdown.
- Preservar fluxo markdown-first.
- Preservar suporte a Inbox, Hoje, Próximos, Calendário, Pastas, Tags, Editor Markdown, histórico, Google Calendar, Google Drive, sync local e auditoria.
- Não copiar os HTMLs diretamente como implementação final.
- Primeiro planejar componentes, tokens, rotas e estados.

## Páginas de referência

### Desktop

1. `desktop/01-dashboard.html` - visão bento geral.
2. `desktop/02-itens.html` - lista/board de itens.
3. `desktop/03-notas.html` - biblioteca de notas.
4. `desktop/04-notas-alternativa.html` - variação mais ampla da biblioteca de notas.
5. `desktop/05-editor.html` - editor markdown com sidebar e rail.
6. `desktop/06-editor-toolbar.html` - editor com toolbar rica.

### Mobile

1. `mobile/01-dashboard-mobile.html` - dashboard mobile em stack bento.
2. `mobile/02-itens-mobile.html` - itens mobile com cards e bottom nav.
3. `mobile/03-notas-mobile.html` - notas mobile com chips de pastas e lista.

## Como usar

1. Rodar o projeto atual localmente.
2. Mapear telas reais para os HTMLs deste pacote.
3. Criar plano incremental antes de alterar código.
4. Implementar tokens visuais primeiro.
5. Implementar componentes reutilizáveis.
6. Migrar tela por tela.
7. Validar visualmente desktop e mobile.
