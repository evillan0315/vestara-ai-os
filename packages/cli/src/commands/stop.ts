import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

export class StopCommand {
  async execute(options: { service?: string }): Promise<void> {
    const spinner = ora('Stopping Vestara services...').start();

    try {
      if (options.service) {
        await this.stopService(options.service);
      } else {
        await this.stopAll();
      }

      spinner.succeed(chalk.green('Vestara services stopped'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop Vestara'));
      console.error(error);
      process.exit(1);
    }
  }

  private async stopService(service: string): Promise<void> {
    try {
      execSync(`systemctl --user stop vestara-${service}`, { stdio: 'inherit' });
    } catch {
      // Fallback to docker-compose
      execSync(`docker compose stop ${service}`, { stdio: 'inherit' });
    }
  }

  private async stopAll(): Promise<void> {
    try {
      // Try systemd first
      execSync('systemctl --user stop vestara.target', { stdio: 'inherit' });
    } catch {
      // Fallback to docker-compose
      execSync('docker compose stop', { stdio: 'inherit' });
    }
  }
}
