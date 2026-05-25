# PRD: Mobile app shell e densidade de calendario

## Contexto

O app funciona no celular, mas algumas telas ainda parecem uma pagina web comprimida. A barra superior mobile mostra marca, titulo, busca e novo item ao mesmo tempo, enquanto o botao de novo item ja existe na navegacao inferior. No calendario, os filtros e seletores de calendarios ocupam muito espaco. Em pastas/notas, as acoes secundarias competem com o conteudo principal. No editor, o controle de expandir/retrair headings aparece como `+/-`, mais pesado que o padrao esperado de editores como VS Code.

## Objetivo

Deixar a experiencia mobile mais parecida com um aplicativo nativo: topo mais simples, comandos secundarios recolhidos, calendario mais focado e editor menos ruidoso.

## Escopo desta entrega

- Simplificar o topo mobile para menu, titulo da tela e busca.
- Remover o botao `+` do topo mobile, mantendo o fluxo pelo botao inferior existente.
- Mover filtros e calendarios do calendario mobile para uma folha de filtros.
- Reduzir a densidade do cabecalho de pastas no mobile, colocando acoes secundarias em overflow.
- Trocar o controle de collapse de headings de `+/-` para um chevron discreto estilo editor.
- Validar typecheck e fazer verificacao visual mobile/dark quando o app puder ser iniciado temporariamente.

## Fora de escopo

- Alterar schema, sync ou campos protegidos.
- Alterar a semantica de eventos e tarefas.

## Requisitos

- Mobile deve priorizar conteudo e contexto atual.
- Busca continua acessivel por icone no topo e por evento global `doit:focus-search`.
- Criacao rapida continua disponivel pelo app shell inferior.
- Calendario mobile mostra apenas um comando compacto de filtros no cabecalho.
- Filtros de itens/eventos e calendarios ficam acessiveis em bottom sheet.
- Acoes de pasta como `+ Subpasta`, `AGENTS.md` e `Apagar` ficam em overflow no mobile e continuam visiveis no desktop.
- Heading collapse deve usar controle visual pequeno, sem texto `+` ou `-` ao lado do heading.

## Criterios de aceite

- Em viewport mobile, o topo nao mostra logomarca nem botao `+`.
- A busca abre e fecha sem deslocar permanentemente o layout.
- O calendario mobile nao renderiza todos os chips de calendario no topo.
- A folha de filtros permite alternar Itens, Eventos e cada calendario.
- Em pasta mobile, apenas Lista/Kanban e overflow ficam no cabecalho principal.
- Headings colapsaveis mostram um chevron discreto e continuam expandindo/retraindo.
- `pnpm --filter @doit/web exec tsc --noEmit` passa.

## Fase 2

- Pastas podem ser fixadas/desafixadas sem alterar schema, usando preferencias locais.
- A tela Notas mostra uma area `Fixadas` antes da arvore completa.
- A pagina de uma pasta permite fixar/desafixar pelo desktop e pelo overflow mobile.
- O sidebar desktop tambem mostra `Fixadas` e permite fixar/desafixar pastas pela estrela.
- O menu inferior mobile passou a ter ordem padrao mais orientada a app: Hoje, Calendario, Inbox, Notas, Proximos, Config.
- Configuracoes > Aparencia ganhou a acao `Usar ordem app` para aplicar a ordem recomendada preservando visibilidade dos itens.
- A abertura padrao do app permanece em `/today`.
- `Proximos` continua configuravel pelo menu inferior mobile.

## Validacao em 2026-05-19

- Typecheck executado: `pnpm --filter @doit/web exec tsc --noEmit` passou.
- Servidor Next iniciado temporariamente na porta 3000 para teste visual e encerrado ao final.
- Browser headless mobile `390x844` com usuario fake `mobile-visual-*.example.invalid`.
- Telas capturadas em `apps/web/.mobile-qa/mobile-shell-2026-05-19/`.
- Fluxos verificados: topo mobile em `/today`, menu mobile, calendario em `/calendar`, folha de filtros e tema dark.
- Checagem automatica confirmou: sem botao `Novo` no topo mobile, filtros acessiveis, tema dark ativo e sem overflow horizontal.
- Portas 3000 e 9223 confirmadas livres ao final do teste.

## Validacao da fase 2 em 2026-05-19

- Typecheck executado novamente: `pnpm --filter @doit/web exec tsc --noEmit` passou.
- Nao houve alteracao de schema, API de sync ou campos protegidos.
- Teste visual mobile `390x844` executado com usuario fake `phase2-mobile-*.example.invalid`.
- Capturas geradas em `apps/web/.mobile-qa/phase2-2026-05-19/`.
- Fluxos verificados: lista de Notas com pasta fixada, detalhe de pasta, overflow mobile com `Desafixar`, Notas em dark mode e Configuracoes > Aparencia.
- O teste visual revelou que o topo mobile mostrava o ID bruto em rotas dinamicas de pasta; corrigido para mostrar `Notas`.
- Servidor temporario encerrado e portas 3000/9223 confirmadas livres.
- Teste visual desktop do sidebar executado em `1280x900`; captura em `apps/web/.mobile-qa/sidebar-2026-05-19/`.
- Checagem automatica confirmou sidebar com `Fixadas`, pasta fixada e lista completa de pastas sem overflow horizontal.
