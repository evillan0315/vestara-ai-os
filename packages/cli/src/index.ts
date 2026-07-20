#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import chalk from 'chalk';
import { StatusCommand } from './commands/status.js';
import { StartCommand } from './commands/start.js';
import { StopCommand } from './commands/stop.js';
import { LogsCommand } from './commands/logs.js';
import { ChatCommand } from './commands/chat.js';
import { ModelsCommand } from './commands/models.js';
import { ConfigCommand } from './commands/config.js';
import { InitCommand } from './commands/init.js';
import { UpgradeCommand } from './commands/upgrade.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('vestara')
  .description(chalk.bold.cyan('Vestara AI OS — Command Line Interface'))
  .version(pkg.version);

program
  .command('init')
  .description('Initialize Vestara in the current directory')
  .action(async () => {
    await new InitCommand().execute();
  });

program
  .command('status')
  .description('Show status of Vestara services')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await new StatusCommand().execute(options);
  });

program
  .command('start')
  .description('Start Vestara services')
  .option('-d, --detach', 'Run in background')
  .option('-s, --service <service>', 'Start specific service')
  .action(async (options) => {
    await new StartCommand().execute(options);
  });

program
  .command('stop')
  .description('Stop Vestara services')
  .option('-s, --service <service>', 'Stop specific service')
  .action(async (options) => {
    await new StopCommand().execute(options);
  });

program
  .command('upgrade')
  .description('Upgrade Vestara to latest version')
  .action(async () => {
    await new UpgradeCommand().execute();
  });

program
  .command('logs')
  .description('View service logs')
  .option('-s, --service <service>', 'Service to view logs for')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '100')
  .action(async (options) => {
    await new LogsCommand().execute(options);
  });

program
  .command('chat')
  .description('Start an AI chat session')
  .option('-m, --model <model>', 'Model to use')
  .option('-p, --provider <provider>', 'Provider to use')
  .action(async (options) => {
    await new ChatCommand().execute(options);
  });

program
  .command('models')
  .description('List available AI models')
  .option('-p, --provider <provider>', 'Filter by provider')
  .action(async (options) => {
    await new ModelsCommand().execute(options);
  });

program
  .command('config')
  .description('Manage Vestara configuration')
  .option('-g, --get <key>', 'Get a config value')
  .option('-s, --set <key> <value>', 'Set a config value')
  .option('-l, --list', 'List all config values')
  .action(async (options) => {
    await new ConfigCommand().execute(options);
  });

program.parse();
