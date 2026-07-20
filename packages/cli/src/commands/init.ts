import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class InitCommand {
  async execute(): Promise<void> {
    const spinner = ora('Initializing Vestara...').start();

    try {
      const projectDir = process.cwd();
      const vestaraDir = join(projectDir, '.vestara');

      if (!existsSync(vestaraDir)) {
        mkdirSync(vestaraDir, { recursive: true });
      }

      // Create default config
      const config = {
        version: '0.1.0',
        apiUrl: 'http://localhost:3000',
        defaultProvider: 'opencode',
        defaultModel: 'opencode/deepseek-v4-flash-free',
        services: {
          api: { port: 3000 },
          dashboard: { port: 5173 },
          ollama: { port: 11434 },
        },
      };

      writeFileSync(join(vestaraDir, 'config.json'), JSON.stringify(config, null, 2));

      // Create data directory
      const dataDir = join(vestaraDir, 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      spinner.succeed(chalk.green('Vestara initialized'));

      console.log(chalk.bold.cyan('\n  Project initialized with:\n'));
      console.log(chalk.white('  .vestara/config.json') + chalk.gray('  — Configuration'));
      console.log(chalk.white('  .vestara/data/') + chalk.gray('          — Data directory'));
      console.log(chalk.gray('\n  Next steps:'));
      console.log(chalk.gray('    1. Edit .vestara/config.json to customize'));
      console.log(chalk.gray('    2. Run "vestara start" to launch services\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize Vestara'));
      console.error(error);
      process.exit(1);
    }
  }
}
