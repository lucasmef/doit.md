# Diretrizes visuais

## Base visual

Usar a linguagem dos HTMLs:

- Inter como fonte principal.
- JetBrains Mono para metadados, arquivos `.md`, datas, tags e atalhos.
- Fundo com mesh gradient vivo.
- Cards translúcidos com blur.
- Bordas brancas translúcidas.
- Cantos grandes.
- Sombras suaves.
- Cards escuros com glow para itens ativos ou captura importante.

## Tokens principais

```css
--c-navy: #0F2342;
--c-blue: #2F6BFF;
--c-teal: #28C7B7;
--c-violet: #7B5BFF;
--c-cyan: #1AAED7;
--c-pink: #FF6FAE;
--c-amber: #F5A524;
--c-danger: #F04438;

--c-gray-50: #ECF0F5;
--c-gray-100: #D9E1EA;
--c-gray-200: #B6C2D2;
--c-gray-500: #46587A;

--r-card: 28px;
--r-inner: 18px;
--r-pill: 999px;
```

## Componentes candidatos

- `BentoShell`
- `BentoWallpaper`
- `GlassCard`
- `DarkGlowCard`
- `AppTopNav`
- `MobileBottomNav`
- `ItemCard`
- `ItemProgressCard`
- `FolderChip`
- `MarkdownFileBadge`
- `AuditRiskBadge`
- `CalendarMiniCard`
- `MarkdownGarden`
- `EditorSidebar`
- `EditorRail`
- `EditorToolbar`

## Cuidados

- Não transformar tudo em cards grandes no mobile.
- Preservar legibilidade.
- Evitar animações pesadas.
- Usar glassmorphism de forma controlada para não prejudicar contraste.
- Os HTMLs são referência de aparência, não arquitetura final.
