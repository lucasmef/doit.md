# PRD — Extensões do Editor Markdown (Task Lists, Tabelas, Links)

**Status:** Proposto
**Data:** 2026-05-10
**Autor:** Lucas
**Componente afetado:** `apps/web/src/components/items/markdown-editor.tsx`

---

## 1. Contexto

O editor de Markdown do doit.md é usado em notas, descrições de itens e quick capture. Hoje ele é construído sobre Tiptap v3 com apenas três extensões: `StarterKit`, `@tiptap/markdown` e `Placeholder`. O `StarterKit` cobre o básico (headings, bold/italic, listas simples, blockquote, code, hr) mas **não** inclui:

- Listas de tarefas (`- [ ]`)
- Tabelas
- Auto-linkificação ao colar/digitar URLs

Como o doit.md é um app de produtividade (tarefas + notas), a ausência de checkboxes e tabelas dentro das notas limita o uso para captura estruturada de informação.

## 2. Objetivo

Adicionar suporte completo a **task lists**, **tabelas** e **links** no editor, mantendo:

- Round-trip Markdown limpo (o que é digitado/colado em MD volta a ser MD ao salvar).
- Compatibilidade com o renderizador atual (`react-markdown` + `remark-gfm`) usado em modo leitura.
- Comportamento offline (sem dependências externas em runtime).

## 3. Escopo

### In-scope

1. **Task lists**
   - Sintaxe GFM: `- [ ] tarefa` / `- [x] feita`.
   - Checkbox interativo: clicar marca/desmarca dentro do editor.
   - Atalho via toolbar/menu (a definir) e parsing automático ao digitar `- [ ]`.

2. **Tabelas**
   - Sintaxe GFM (pipes + header separator).
   - Comandos para inserir tabela, adicionar/remover linha/coluna, alinhar células.
   - Tabela responsiva com scroll horizontal em telas pequenas.

3. **Links**
   - Auto-linkify ao digitar/colar URLs (`https://...`).
   - Sintaxe Markdown `[texto](url)` preservada.
   - `target="_blank"` + `rel="noopener noreferrer"` em modo leitura.
   - Prevenir XSS: bloquear `javascript:` e protocolos não-http(s).

### Out-of-scope

- Imagens, footnotes, syntax highlighting em code blocks, typography automática (aspas curvas etc.).
- Edição colaborativa em tempo real.

## 4. Requisitos funcionais

| ID | Requisito |
|----|-----------|
| RF-1 | Usuário pode digitar `- [ ] ` no início de uma linha e o editor converte automaticamente em task item com checkbox. |
| RF-2 | Clicar no checkbox alterna o estado e atualiza o markdown salvo (`- [ ]` ↔ `- [x]`). |
| RF-3 | Task lists aninhadas (Tab/Shift+Tab) preservam estrutura no markdown serializado. |
| RF-4 | Usuário pode inserir tabela via comando (atalho de teclado ou comando programático exposto). |
| RF-5 | Tabela inserida pelo editor produz markdown GFM válido ao salvar. |
| RF-6 | Tabelas coladas em formato Markdown ou HTML (ex.: vindas do Google Sheets) são reconhecidas. |
| RF-7 | URLs digitadas/coladas viram links clicáveis automaticamente. |
| RF-8 | Links em modo leitura abrem em nova aba e bloqueiam protocolos perigosos. |

## 5. Requisitos não-funcionais

- **Bundle:** acréscimo aceitável até ~30KB gzipped no chunk do editor.
- **SSR:** manter `immediatelyRender: false` — nenhuma das extensões deve quebrar render server-side.
- **Acessibilidade:** checkboxes navegáveis por teclado; tabelas com `<th>` semântico.
- **Mobile:** tabelas com overflow-x; checkboxes com hit area ≥ 32px.

## 6. Implementação técnica

### Dependências a adicionar (`apps/web/package.json`)

```
@tiptap/extension-task-list
@tiptap/extension-task-item
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-header
@tiptap/extension-table-cell
@tiptap/extension-link
```

Todas em `^3.22.5` (alinhar com versão do core já instalada).

### Mudanças em `markdown-editor.tsx`

- Importar e registrar as extensões acima no array `extensions`.
- Configurar `TaskItem` com `nested: true`.
- Configurar `Link` com `openOnClick: false`, `autolink: true`, `protocols: ['http', 'https', 'mailto']`, `HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }`.
- Validar que `@tiptap/markdown` serializa as novas extensões. Caso não suporte tabelas/task lists nativamente, avaliar substituir por `tiptap-markdown` (community) ou customizar serializers.

### CSS (em `apps/web/src/app/globals.css` ou no escopo `prose`)

- Estilos para `ul[data-type="taskList"]` (remover bullet, alinhar checkbox).
- Estilos para `table` dentro do editor (border, padding, header bg, overflow-x).
- Hover/focus em links.

### Renderizador de leitura

- `react-markdown` + `remark-gfm` já cobre task lists, tabelas e auto-links — **nenhuma mudança necessária** no caminho de leitura, exceto verificar sanitização de `href`.

## 7. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| `@tiptap/markdown` não serializar tabelas/task lists corretamente | Spike de 30min antes do desenvolvimento; fallback: trocar para `tiptap-markdown` ou implementar serializer custom. |
| Aumento de bundle | Auditar com `next build` antes/depois; lazy-load do editor já está em vigor (verificar). |
| Conflitos de atalho de teclado | Revisar `use-keyboard.ts` antes de bindar novos comandos. |
| XSS via link colado | Configurar whitelist de protocolos no `Link` extension. |

## 8. Plano de entrega

1. **Spike (1h):** validar serialização Markdown das três extensões em isolamento.
2. **Implementação (2-3h):** instalar deps, registrar extensões, ajustar CSS.
3. **Teste manual:** criar/editar nota com checkbox, tabela e link; verificar round-trip ao salvar e reabrir; testar mobile.
4. **Verificar offline:** garantir que `apps/web/public/sw.js` cacheia os novos chunks corretamente.

## 9. Critérios de aceite

- [ ] Digitar `- [ ] tarefa` cria checkbox interativo.
- [ ] Clicar no checkbox persiste estado após reload.
- [ ] Comando de inserir tabela funciona e salva como GFM.
- [ ] Colar tabela do Google Sheets vira tabela no editor.
- [ ] Colar URL vira link clicável.
- [ ] Modo leitura (`react-markdown`) renderiza os três recursos identicamente.
- [ ] `pnpm type-check` e `pnpm build` passam sem regressão.
- [ ] Testado em Chrome desktop e Safari iOS.

## 10. Decisões

- **Toolbar visual:** sim. Expor botões para inserir tabela, task list, link e formatação básica. Design e posicionamento a definir junto à implementação (provavelmente toolbar superior fixa dentro do container do editor).
- **Biblioteca Markdown:** decidir no spike. Começar com `@tiptap/markdown` (oficial, já instalado); se a serialização de tabelas ou task lists falhar/for incompleta, migrar para `tiptap-markdown` (comunidade).
