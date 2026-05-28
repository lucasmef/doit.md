# Ajustar Today Mobile e Refinamentos

## Metadata

- Status: done
- Mode: build
- Complexity: medium
- Created: 2026-05-28
- Updated: 2026-05-28

## Objective

Ajustar o layout da página "Today" para mobile (diminuir padding e adequar visual), remover seções desnecessárias, lidar com eventos passados e futuros, fix botão de conclusão e adicionar ação de reagendamento rápido.

## Context

O usuário pediu ajustes na página `/today`:
- Aplicar o layout de celular de `today mobile.html`
- Diminuir o padding no celular.
- Remover seções "concluídos" e "sem data" (estas ficam para o inbox).
- Clicar em um evento deve abrir seu modal de edição.
- Esmarecer (dim) eventos passados e mostrar eventos do próximo dia conforme config do usuário.
- Incluir botão para "reagendar para hoje" tarefas atrasadas do dia anterior.
- O botão de conclusão da tarefa não está funcionando (ele abre a edição). Ao concluir deve riscar a tarefa e sumir da tela após alguns segundos.

## Scope

- [x] Remover seção "Concluídos"
- [x] Remover seção "Sem data"
- [x] Ajustar responsividade e paddings na página
- [x] Abrir modal ao clicar em evento de agenda
- [x] Esmarecer eventos passados
- [x] Incluir eventos do dia seguinte (conforme prefs)
- [x] Incluir botão "Reagendar para hoje" nas tarefas atrasadas
- [x] Arrumar checkbox de conclusão de tarefa para riscar e sumir
- [x] Manter o Topbar (menu sanduíche e busca) visível no mobile

## Implementation plan

- [x] Editar `apps/web/src/app/(app)/today/page.tsx` para tratar a UI e lógicas solicitadas
- [x] Validar e ajustar estado `isDone` para exibir riscado temporariamente

## Files changed

- `apps/web/src/app/(app)/today/page.tsx` - Layout atualizado para refletir mock de mobile (flexível, bordas). Seções de Concluídos e Abertos removidas. Criado estado local para `temporarilyDone`. Criado integração com `usePreferences()` para verificar data limite de amanhã, formatando horas para comparar. Checkbox e EventSheet funcionando.
- `apps/web/src/components/layout/app-chrome.tsx` - Removida a lógica `todayMobileImmersive` que escondia a barra de navegação no mobile, fazendo com que o ícone de busca e o menu sanduíche voltem a aparecer.

## Validation

- `pnpm --filter @doit/web exec tsc --noEmit` - passed
- frontend manual check - passed
- screenshots - `specs/artifacts/2026-05-28-ajustar-today-mobile/01-today-mobile.png`

## Next step

Aguardar verificação do usuário.
