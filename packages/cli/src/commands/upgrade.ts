import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

export class UpgradeCommand {
  async execute(): Promise<void> {
    const spinner = ora('Checking for updates...').start();

    try {
      // Check for updates
      execSync('sudo apt-get update -qq', { stdio: 'pipe' });

      // Check upgradable packages
      const result = execSync('apt list --upgradable 2>/dev/null | grep vestara || true', {
        encoding: 'utf-8',
      });

      if (!result.trim()) {
        spinner.succeed(chalk.green('Vestara is up to date'));
        return;
      }

      spinner.info(chalk.yellow('Updates available:'));
      console.log(result);

      // Confirm upgrade
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(chalk.cyan('Proceed with upgrade? (y/N): '), resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.gray('Upgrade cancelled'));
        return;
      }

      // Create backup
      spinner.start('Creating backup...');
      try {
        execSync('sudo /usr/lib/vestara/scripts/backup.sh backup', { stdio: 'pipe' });
        spinner.succeed(chalk.green('Backup created'));
      } catch {
        spinner.warn(chalk.yellow('Backup failed, continuing anyway'));
      }

      // Stop services
      spinner.start('Stopping services...');
      try {
        execSync('sudo systemctl stop vestara-api.service vestara-dashboard.service', { stdio: 'pipe' });
        spinner.succeed(chalk.green('Services stopped'));
      } catch {
        spinner.warn(chalk.yellow('Could not stop services'));
      }

      // Upgrade packages
      spinner.start('Upgrading packages...');
      execSync('sudo apt-get upgrade -y vestara-core vestara-api vestara-dashboard vestara-cli vestara-systemd', {
        stdio: 'inherit',
      });
      spinner.succeed(chalk.green('Packages upgraded'));

      // Start services
      spinner.start('Starting services...');
      try {
        execSync('sudo systemctl start vestara-api.service vestara-dashboard.service', { stdio: 'pipe' });
        spinner.succeed(chalk.green('Services started'));
      } catch {
        spinner.warn(chalk.yellow('Could not start services'));
      }

      // Verify
      spinner.start('Verifying upgrade...');
      try {
        execSync('curl -sf http://localhost:3000/api/health', { stdio: 'pipe' });
        spinner.succeed(chalk.green('API is healthy'));
      } catch {
        spinner.warn(chalk.yellow('API health check failed'));
      }

      console.log(chalk.green('\n  Upgrade complete!\n'));
    } catch (error) {
      spinner.fail(chalk.red('Upgrade failed'));
      console.error(error);
      process.exit(1);
    }
  }
}
