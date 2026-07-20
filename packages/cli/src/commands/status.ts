import chalk from 'chalk';
import ora from 'ora';

const API_URL = process.env.VESTARA_API_URL || 'http://localhost:3000';

interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
  providers: Record<string, boolean>;
}

export class StatusCommand {
  async execute(options: { json?: boolean }): Promise<void> {
    const spinner = ora('Checking Vestara status...').start();

    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json() as HealthResponse;

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log(chalk.bold.cyan('\n  Vestara AI OS Status\n'));
      console.log(chalk.white('  Status:   ') + chalk.green('● Running'));
      console.log(chalk.white('  Version:  ') + chalk.yellow(data.version));
      console.log(chalk.white('  Uptime:   ') + chalk.yellow(this.formatUptime(data.uptime)));
      console.log(chalk.white('  Timestamp:') + chalk.gray(` ${data.timestamp}`));

      console.log(chalk.bold.cyan('\n  AI Providers\n'));
      for (const [provider, available] of Object.entries(data.providers)) {
        const status = available ? chalk.green('● Available') : chalk.red('● Unavailable');
        console.log(chalk.white(`  ${provider.padEnd(12)}`) + status);
      }

      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Failed to connect to Vestara API'));
      console.log(chalk.gray('\n  Is Vestara running? Try: vestara start\n'));
      process.exit(1);
    }
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }
}
