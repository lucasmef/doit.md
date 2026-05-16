#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { loginCommand } from './commands/login.js'
import { pullCommand } from './commands/pull.js'
import { diffCommand } from './commands/diff.js'
import { pushCommand } from './commands/push.js'
import { statusCommand } from './commands/status.js'
import { driveGetCommand, driveSyncCommand } from './commands/drive.js'

const program = new Command()

program
  .name('doit-sync')
  .description('doit.md sync agent — sincroniza itens com workspace Markdown')
  .version('0.0.1')

program
  .command('init')
  .description('Cria a pasta local do workspace')
  .argument('[path]', 'Caminho do workspace (default: ./workspace-doitmd)')
  .action(initCommand)

program
  .command('login')
  .description('Autentica com um CLI token gerado no app')
  .option('--api-url <url>', 'URL da API (default: http://localhost:3000)')
  .option('--token <token>', 'Token CLI (formato doit_<prefix>_<secret>)')
  .action(loginCommand)

program
  .command('pull')
  .description('Baixa pastas e itens do servidor para o workspace')
  .action(pullCommand)

program
  .command('diff')
  .description('Detecta alterações feitas localmente ou pela IA')
  .action(diffCommand)

program
  .command('push')
  .description('Envia mudanças aprovadas para o servidor')
  .action(pushCommand)

program
  .command('status')
  .description('Mostra estado atual do workspace')
  .action(statusCommand)

const drive = program.command('drive').description('Anexos do Google Drive')

drive
  .command('get <fileId> [dest]')
  .description('Baixa um anexo do Drive para leitura local')
  .action(driveGetCommand)

drive
  .command('sync')
  .description('Reconcilia a organização dos anexos no Drive com os projetos')
  .action(driveSyncCommand)

program.parse()
