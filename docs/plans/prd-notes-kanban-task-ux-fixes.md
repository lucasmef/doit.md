# PRD resumido: ajustes de notas, kanban e modal de tarefas

## Objetivo

Melhorar fluxos frequentes de edicao e organizacao para que notas longas, checklists, kanban de pastas e tarefas em modal se comportem de forma previsivel no desktop e no celular.

## Escopo

- Permitir reordenar itens individuais de checklist dentro do editor Markdown, sem mover a lista inteira como um unico bloco.
- Evitar que arrastar itens no kanban de pastas abra o item ao fim do gesto.
- Impedir fechamento acidental do modal de tarefa durante selecao de texto.
- Fazer titulo e descricao de tarefa expandirem verticalmente quando tiverem varias linhas.
- Remover o titulo visual das telas Proximos/Calendario, inclusive no topo mobile.
- Exibir o logo completo no topo mobile.
- Abrir notas com foco e rolagem no inicio do conteudo.
- Permitir recolher/expandir secoes de nota a partir dos titulos Markdown.

## Fora de escopo

- Persistir estado de topicos recolhidos no Markdown ou no banco.
- Alterar schema, sincronizacao, auditoria ou frontmatter de itens.
- Rodar servidor local persistente.

## Criterios de aceite

- Checkboxes em uma task list podem ser reordenados entre si pelo handle do editor.
- Drag de card no kanban move o item sem disparar abertura do modal.
- Selecionar texto em tarefa nao fecha o modal; clicar no backdrop vazio ainda fecha.
- Campos de titulo e descricao mostram todo o texto multilinha sem corte.
- Proximos/Calendario nao exibem titulo de pagina redundante no desktop ou celular.
- Topbar mobile mostra o icone e o texto `doit.md`.
- Ao abrir uma nota, o editor posiciona no topo.
- Titulos H1/H2/H3 exibem controle local para recolher/expandir o conteudo ate o proximo titulo de mesmo nivel ou superior.
