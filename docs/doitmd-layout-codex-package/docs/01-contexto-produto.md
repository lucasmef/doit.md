# Contexto do produto - doit.md

## Produto

doit.md é uma PWA de produtividade pessoal centrada em uma entidade principal: o `Item`.

Um `Item` deve poder evoluir de forma fluida entre:

- captura rápida
- tarefa
- nota
- evento
- referência
- arquivo markdown local
- item arquivado

A interface deve reforçar essa ideia: não tratar a aplicação como um gerenciador tradicional de tarefas separado de notas.

## Modelo mental

```txt
Inbox -> Item -> Nota / Tarefa / Evento / Referência / Arquivo .md
```

## Organização

O agrupador visual principal são `pastas`.

Não usar `projects` ou `areas` como estrutura visual principal neste layout.

## Áreas funcionais que o layout precisa preservar

- Inbox
- Hoje
- Próximos
- Calendário
- Pastas
- Tags
- Editor Markdown
- Anexos do Google Drive
- Sincronização com Google Calendar
- Sync local em Markdown
- Auditoria de alterações feitas fora do app ou por IA
- Histórico/versionamento de Item

## Tom visual

- Produto pessoal, mas tecnicamente avançado.
- Markdown-first.
- Visual leve, vivo, com cards glassmorphism.
- Forte sensação de workspace pessoal.
- Menos SaaS corporativo, mais ferramenta pessoal inteligente.

## Ajustes semânticos aplicados nos mockups

- `Tasks` pode aparecer visualmente como aba, mas a semântica interna deve ser `Itens`.
- `Live tasks` virou `Itens ativos`.
- `Projects` virou `Pastas`.
- `Team activity` virou `Auditoria / Sync`.
- `Streak` virou `Revisão diária` ou métrica de execução pessoal.
- Avatares e colaboradores fictícios não devem guiar a implementação.
