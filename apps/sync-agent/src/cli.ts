#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { pullCommand } from './commands/pull.js'
import { diffCommand } from './commands/diff.js'
import { pushCommand } from './commands/push.js'
import { statusCommand } from './commands/status.js'

const program = new Command()

program
  .name('clarity-sync')
  .description('Clarity local sync agent — sincroniza itens com workspace Markdown')
  .version('0.0.1')

program
  .command('init')
  .description('Inicializa workspace local')
  .action(initCommand)

program
  .command('pull')
  .description('Baixa itens do servidor e gera arquivos .md')
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

program.parse()
