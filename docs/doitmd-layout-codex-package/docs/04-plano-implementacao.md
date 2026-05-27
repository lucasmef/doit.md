# Plano de implementação sugerido

## Fase 1 - análise

1. Inspecionar rotas atuais do app.
2. Identificar componentes existentes de layout, sidebar, topbar, item list, editor e calendário.
3. Confirmar onde estão os tokens Tailwind e CSS globais.
4. Mapear dados reais usados em Hoje, Inbox, Notas, Pastas e Calendário.
5. Produzir plano técnico antes de alterar código.

## Fase 2 - design tokens

1. Centralizar tokens de cor, radius, shadow e glass.
2. Criar utilitários para wallpaper mesh.
3. Criar base de card translúcido.
4. Criar card escuro com glow.
5. Validar contraste no tema claro e escuro, se aplicável.

## Fase 3 - componentes

Implementar componentes pequenos e reutilizáveis:

- `GlassCard`
- `DarkGlowCard`
- `BentoGrid`
- `ItemCard`
- `FolderChip`
- `MarkdownBadge`
- `AuditBadge`
- `ProgressRing`
- `MobileTabBar`

## Fase 4 - desktop

1. Começar por `/today` ou pela rota escolhida para dashboard.
2. Recriar layout bento com dados reais.
3. Adaptar página de itens.
4. Adaptar página de notas.
5. Adaptar editor por último, porque tem maior risco.

## Fase 5 - mobile

1. Aplicar stack bento mobile.
2. Validar scroll, safe area, bottom nav e teclado virtual.
3. Garantir que captura rápida não fique escondida.
4. Testar iOS Safari/PWA.

## Fase 6 - validação

- `pnpm lint`
- `pnpm type-check`
- `pnpm build`
- Screenshot desktop 1440px.
- Screenshot mobile 390px/412px.
- Teste manual de criar Item, editar nota, concluir tarefa e abrir evento.
