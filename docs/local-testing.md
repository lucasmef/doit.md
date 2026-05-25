# Testes locais com dados fake

Este documento define quando e como agentes podem rodar o app localmente para validar fluxos reais sem usar dados pessoais.

## Regra geral

O app nao deve ficar rodando de forma persistente durante trabalho de agente. E permitido iniciar um servidor local temporario apenas quando a tarefa exigir validacao visual ou end-to-end que nao pode ser coberta por type-check, build ou chamadas diretas de API.

Ao usar servidor local temporario, o agente deve:

- usar somente dados fake ou anonimizados;
- registrar qual porta foi usada;
- encerrar o processo ao final da validacao;
- confirmar que a porta ficou livre;
- registrar no documento de plano/PRD o que foi validado e o que ficou sem cobertura.

## Dados fake permitidos

Dados fake podem ser criados em SQLite local para validar UI, auth, listas, Kanban, Quick Capture, reordenacao, editor e APIs protegidas.

Regras:

- usar emails de teste em dominio reservado, por exemplo `example.invalid`;
- usar nomes, titulos e conteudos claramente artificiais;
- usar IDs previsiveis apenas para fixtures locais, por exemplo `usr_mobile_test`, `fld_mobile_*`, `itm_mobile_*`;
- manter seeds idempotentes, com `INSERT ... ON CONFLICT ... UPDATE` ou logica equivalente;
- nao misturar fixtures com dados pessoais reais;
- nao publicar banco SQLite, screenshots ou logs contendo dados reais.

Locais aceitaveis para banco local de teste:

- `apps/web/.data/doit-dev.sqlite`, quando o servidor Next roda com cwd em `apps/web`;
- `.data/doit-dev.sqlite`, quando a ferramenta roda com cwd na raiz do repo.

Se houver fixtures antigas com o mesmo ID e outro `userId`, o seed deve corrigir a fixture ou recria-la de forma controlada. Nao alterar dados fora do prefixo de teste.

## Servidor temporario

Comandos persistentes como `pnpm dev`, `next dev` e `next start` continuam proibidos como processo deixado aberto.

Para validacao bounded, o agente pode iniciar o servidor em background, testar e encerrar no mesmo turno.

Exemplo:

```powershell
$p = Start-Process -FilePath 'pnpm.cmd' `
  -ArgumentList @('--filter','@doit/web','exec','next','dev','-p','3000') `
  -WorkingDirectory (Get-Location) `
  -WindowStyle Hidden `
  -RedirectStandardOutput '.data\web-dev.out.log' `
  -RedirectStandardError '.data\web-dev.err.log' `
  -PassThru

# executar validacoes...

Stop-Process -Id $p.Id -Force
```

Antes de finalizar, confirmar:

```powershell
try {
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop
  'port 3000 still listening'
} catch {
  'port 3000 stopped'
}
```

## Validacoes recomendadas

Preferir a menor validacao que cubra o risco:

- TypeScript: `pnpm --filter @doit/web exec tsc --noEmit`;
- build quando o risco envolver Next/build output: `pnpm --filter @doit/web build`;
- HTTP com sessao real NextAuth para APIs protegidas;
- browser headless ou in-app browser para UI responsiva;
- viewport mobile minima `390x844` para regressao mobile principal.

Para fluxos mobile, validar pelo menos:

- login com usuario fake;
- `/notas/fld_mobile_list` sem overflow horizontal;
- `/notas/fld_mobile_board` com seletor de coluna mobile;
- Quick Capture abrindo como bottom sheet;
- reordenacao via `PATCH /api/items/reorder`;
- mover card via `PATCH /api/items/bulk`.

## Registro do resultado

O plano/PRD relacionado deve registrar:

- data da validacao;
- usuario fake usado, sem senha real;
- banco/fixtures criados;
- comandos principais executados;
- resultado dos testes;
- servidor encerrado e portas liberadas;
- lacunas de cobertura, por exemplo Safari/iPhone real nao testado.

Nao salvar credenciais reais, tokens, cookies, dumps de sessao ou dados pessoais em docs.
