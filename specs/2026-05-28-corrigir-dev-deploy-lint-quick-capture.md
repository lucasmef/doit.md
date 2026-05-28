# Corrigir Dev Deploy - Lint Quick Capture

## Contexto

- Data: 2026-05-28
- Branch: `dev`
- PR: `#25 Dev`
- Run com falha: `Quality` `26582743376`
- Run de push com falha relacionada: `Gates DEV` `26582358657`

## Problema

O deploy/check de desenvolvimento falhava por erros de lint durante `next build` e no gate incremental:

- `apps/web/src/components/items/bulk-actions.tsx`: função `nextSaturday` definida e não usada.
- `apps/web/src/components/items/quick-capture.tsx`: dois casts `as any` no campo de titulo da captura rapida.

## Correção

- Removida a função morta `nextSaturday`.
- Adicionado o tipo `TitleInputElement` para representar `input` e `textarea` usados pelo titulo da captura.
- Substituidos casts `as any` por callbacks de ref tipados para os modos compacto, expandido e input destacado.
- Mantido o comportamento de foco, cursor e paste handler.

## Validação

- `pnpm --filter @doit/web exec tsc --noEmit`: passou.
- `pnpm --filter @doit/web exec next lint --file "src/components/items/bulk-actions.tsx" --file "src/components/items/quick-capture.tsx"`: passou, restando apenas warning preexistente de hook em `quick-capture.tsx`.
- `pnpm --filter @doit/web build`: compilou e passou lint/typecheck/static generation; falhou no empacotamento standalone local do Windows por `EPERM` ao criar symlinks em `.next/standalone`, depois do ponto que falhava no CI.
- GitHub Actions `Gates DEV` `26583128587`: passou.
- GitHub Actions PR `Dev / Quality` `26583131770`: passou.
- GitHub Actions PR `Dev / Security` `26583131864`: passou.

## Validação visual

Nao executada. A alteração é restrita a tipagem/ref e remoção de código morto para desbloquear CI, sem mudança intencional de UI, layout, navegação ou fluxo visível.

## Resultado

PR `#25 Dev` voltou para `Checks passing` e `Up to date`.
