import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

export class StartCommand {
  async execute(options: { detach?: boolean; service?: string }): Promise<void> {
    const spinner = ora('Starting Vestara services...').start();

    try {
      if (options.service) {
        await this.startService(options.service);
      } else {
        await this.startAll(options.detach);
      }

      spinner.succeed(chalk.green('Vestara services started'));
      console.log(chalk.gray('\n  Dashboard: http://localhost:5173'));
      console.log(chalk.gray('  API:       http://localhost:3000\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to start Vestara'));
      console.error(error);
      process.exit(1);
    }
  }

  private async startService(service: string): Promise<void> {
    try {
      execSync(`systemctl --user start vestara-${service}`, { stdio: 'inherit' });
    } catch {
      // Fallback to docker-compose
      execSync(`docker compose up -d ${service}`, { stdio: 'inherit' });
    }
  }

  private async startAll(detach?: boolean): Promise<void> {
    try {
      // Try systemd first
      execSync('systemctl --user start vestara.target', { stdio: 'inherit' });
    } catch {
      // Fallback to docker-compose
      const detachFlag = detach ? '-d' : '';
      execSync(`docker compose up ${detachFlag}`, { stdio: 'inherit' });
    }
  }
}
