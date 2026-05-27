# Diretrizes mobile

Os arquivos mobile são referência específica para adaptar a experiência em telas pequenas.

## Princípios

- Mobile não deve ser apenas desktop comprimido.
- Usar stack vertical de cards.
- Priorizar Hoje, Captura e Itens ativos.
- Usar bottom nav fixa.
- Manter botão central de novo Item.
- Usar chips horizontais para pastas e filtros.
- Evitar sidebars persistentes.

## Telas mobile incluídas

- `mobile/01-dashboard-mobile.html`
- `mobile/02-itens-mobile.html`
- `mobile/03-notas-mobile.html`

## Ajustes necessários para implementação real

- Remover frame de iPhone na implementação final.
- Usar apenas a UI interna da tela como referência.
- Adaptar safe area com `env(safe-area-inset-bottom)`.
- Garantir que bottom nav não cubra conteúdo.
- Garantir alvos de toque com pelo menos 44px.

## Estrutura sugerida

```txt
MobileAppShell
  MobileHeader
  ScrollArea
  Cards / Lists
  MobileBottomNav
  QuickCaptureButton
```
