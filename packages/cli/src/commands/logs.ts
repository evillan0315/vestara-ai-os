import chalk from 'chalk';
import { execSync } from 'child_process';

export class LogsCommand {
  async execute(options: { service?: string; follow?: boolean; lines?: string }): Promise<void> {
    const service = options.service || 'api';
    const follow = options.follow ? '-f' : '';
    const lines = options.lines || '100';

    try {
      // Try docker-compose logs
      execSync(`docker compose logs ${follow} --tail=${lines} ${service}`, { stdio: 'inherit' });
    } catch {
      // Try systemd journal
      try {
        execSync(`journalctl --user -u vestara-${service} -n ${lines} ${follow ? '-f' : ''}`, { stdio: 'inherit' });
      } catch {
        console.log(chalk.red('No logs available for this service'));
        process.exit(1);
      }
    }
  }
}
